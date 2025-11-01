package server

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/timeout"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/config"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/health"
	"github.com/newar/insights/shared/logging"
	"github.com/newar/insights/shared/metrics"
	"github.com/newar/insights/shared/middleware"
	redislib "github.com/newar/insights/shared/redis"
	"github.com/newar/insights/shared/shutdown"
	"github.com/newar/insights/shared/tracing"
)

// ServerBuilder provides a fluent API for building Fiber servers
type ServerBuilder struct {
	app              *fiber.App
	cfg              *config.Config
	metricsCollector *metrics.Collector
	shutdownManager  *shutdown.Manager
	serviceName      string
}

// NewServerBuilder creates a new ServerBuilder
func NewServerBuilder(serviceName string) (*ServerBuilder, error) {
	// 1. Load configuration
	cfg, err := config.Load(context.Background(), "config")
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	// 2. Setup logging
	logging.Setup(cfg.Logging.Level, cfg.Logging.Format, cfg.Logging.Output)
	log.Info().Str("service", serviceName).Msg("Initializing service")

	// 3. Initialize tracing (disabled in dev mode)
	if err := tracing.Initialize(serviceName, cfg.Observability.JaegerEndpoint); err != nil {
		log.Warn().Err(err).Msg("Failed to initialize tracing (non-fatal)")
	}

	// 4. Initialize metrics collector (disabled in dev mode)
	metricsCollector := metrics.NewCollector(serviceName)

	// 5. Create Fiber app
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
		ReadTimeout:           time.Duration(cfg.Server.Timeout) * time.Second,
		WriteTimeout:          time.Duration(cfg.Server.Timeout) * time.Second,
		IdleTimeout:           time.Duration(cfg.Server.Timeout) * 2 * time.Second,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			log.Error().
				Err(err).
				Int("status", code).
				Str("path", c.Path()).
				Str("method", c.Method()).
				Msg("Request error")
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// 6. Register standard middlewares
	app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))

	// Request timeout middleware
	timeoutDuration := time.Duration(cfg.Server.Timeout) * time.Second
	app.Use(timeout.New(func(c *fiber.Ctx) error {
		return c.Next()
	}, timeoutDuration))

	// CORS middleware
	if cfg.Features.EnableCORS {
		app.Use(cors.New(cors.Config{
			AllowOrigins:     cfg.Server.CORSAllowedOrigins,
			AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
			AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-API-Key,X-Admin-API-Key",
			AllowCredentials: true,
			MaxAge:           86400,
		}))
		log.Info().Str("origins", cfg.Server.CORSAllowedOrigins).Msg("CORS enabled")
	}

	// HTTP metrics middleware (disabled in dev mode)
	app.Use(middleware.HTTPMetrics(metricsCollector))

	// 7. Initialize graceful shutdown manager
	shutdownManager := shutdown.NewManager()

	log.Info().
		Str("service", serviceName).
		Int("port", cfg.Server.Port).
		Msg("Server builder initialized")

	return &ServerBuilder{
		app:              app,
		cfg:              cfg,
		metricsCollector: metricsCollector,
		shutdownManager:  shutdownManager,
		serviceName:      serviceName,
	}, nil
}

// App returns the underlying Fiber app instance
func (b *ServerBuilder) App() *fiber.App {
	return b.app
}

// Config returns the loaded configuration
func (b *ServerBuilder) Config() *config.Config {
	return b.cfg
}

// Metrics returns the metrics collector
func (b *ServerBuilder) Metrics() *metrics.Collector {
	return b.metricsCollector
}

// Shutdown returns the shutdown manager
func (b *ServerBuilder) Shutdown() *shutdown.Manager {
	return b.shutdownManager
}

// RegisterHealthEndpoints registers standard health check endpoints
func (b *ServerBuilder) RegisterHealthEndpoints(db database.Database, redis *redislib.Client) {
	health.RegisterHealthEndpoints(b.app, db, redis)
	log.Info().Msg("Health endpoints registered: /health, /health/ready, /health/live")
}

// RegisterMetricsEndpoint registers Prometheus metrics endpoint (disabled in dev mode)
func (b *ServerBuilder) RegisterMetricsEndpoint() {
	// Disabled in development mode - Prometheus dependencies removed
	log.Info().Msg("Metrics endpoint disabled in development mode")
}

// Start starts the Fiber server
func (b *ServerBuilder) Start() error {
	addr := fmt.Sprintf(":%d", b.cfg.Server.Port)

	log.Info().
		Str("service", b.serviceName).
		Str("address", addr).
		Msg("Starting server")

	// Start server in goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := b.app.Listen(addr); err != nil {
			errChan <- fmt.Errorf("server error: %w", err)
		}
	}()

	// Wait for shutdown signal or server error
	select {
	case err := <-errChan:
		return err
	case <-b.shutdownManager.Wait():
		log.Info().Msg("Shutdown signal received, stopping server...")

		if err := b.app.ShutdownWithTimeout(30 * time.Second); err != nil {
			log.Error().Err(err).Msg("Error during graceful shutdown")
			return err
		}

		log.Info().Msg("Server stopped successfully")
		return nil
	}
}

// MustStart is like Start but panics on error
func (b *ServerBuilder) MustStart() {
	if err := b.Start(); err != nil {
		log.Fatal().Err(err).Msg("Server failed to start")
	}
}
