package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/services/api-gateway/handlers"
	"github.com/newar/insights/services/api-gateway/middleware"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/redis"
)

func main() {
	// Setup logging
	setupLogging()

	log.Info().Msg("Starting Newar Insights API Gateway...")

	// Load configuration
	cfg := loadConfig()

	// Initialize database
	db, err := database.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	// Initialize Redis
	redisClient, err := redis.NewClient(cfg.Redis)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer redisClient.Close()

	// Initialize repositories
	tokenRepo := database.NewTokenRepository(db)
	meetingRepo := database.NewMeetingRepository(db)
	userRepo := database.NewUserRepository(db)

	// Initialize handlers
	recordingHandler := handlers.NewRecordingHandler(meetingRepo, userRepo, cfg.BotManagerURL)
	healthHandler := handlers.NewHealthHandler(db, redisClient)

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Newar Insights API Gateway",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		BodyLimit:    10 * 1024 * 1024, // 10MB
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),
		AllowHeaders: "Origin, Content-Type, Accept, X-API-Key",
	}))

	// Health endpoint (no auth required)
	app.Get("/health", healthHandler.Health)

	// API routes (require API key)
	api := app.Group("/recordings")
	api.Use(middleware.Auth(tokenRepo))
	api.Use(middleware.RateLimit(redisClient, cfg.RateLimit))

	// Recording management
	api.Post("/", recordingHandler.CreateRecording)
	api.Get("/", recordingHandler.ListRecordings)
	api.Get("/:platform/:meeting_id", recordingHandler.GetRecording)
	api.Delete("/:platform/:meeting_id", recordingHandler.StopRecording)
	api.Get("/:platform/:meeting_id/download", recordingHandler.DownloadRecording)

	// Start server
	port := getEnv("API_GATEWAY_PORT", "8080")
	addr := fmt.Sprintf(":%s", port)

	log.Info().Str("port", port).Msg("API Gateway server starting")

	// Graceful shutdown
	go func() {
		if err := app.Listen(addr); err != nil {
			log.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down API Gateway server...")

	// Shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(ctx); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("API Gateway server stopped")
}

// Config holds application configuration
type Config struct {
	Database      database.Config
	Redis         redis.Config
	RateLimit     int
	BotManagerURL string
}

// loadConfig loads configuration from environment variables
func loadConfig() Config {
	rateLimit := 10
	if rl := os.Getenv("API_GATEWAY_RATE_LIMIT"); rl != "" {
		fmt.Sscanf(rl, "%d", &rateLimit)
	}

	return Config{
		Database: database.Config{
			Type:         getEnv("DATABASE_TYPE", "sqlite"),
			SQLitePath:   getEnv("SQLITE_PATH", "./storage/database/newar.db"),
			SupabaseURL:  getEnv("SUPABASE_URL", ""),
			SupabaseKey:  getEnv("SUPABASE_KEY", ""),
			MaxOpenConns: 25,
			MaxIdleConns: 5,
			ConnMaxLife:  5 * time.Minute,
			ConnMaxIdle:  10 * time.Minute,
		},
		Redis: redis.Config{
			URL: getEnv("REDIS_URL", "redis://localhost:6379"),
		},
		RateLimit:     rateLimit,
		BotManagerURL: getEnv("BOT_MANAGER_URL", "http://localhost:8082"),
	}
}

// setupLogging configures zerolog
func setupLogging() {
	// Pretty logging for development
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})

	// Set log level
	logLevel := getEnv("LOG_LEVEL", "info")
	switch logLevel {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
