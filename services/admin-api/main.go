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

	"github.com/newar/insights/services/admin-api/handlers"
	"github.com/newar/insights/services/admin-api/middleware"
	"github.com/newar/insights/shared/database"
)

func main() {
	// Setup logging
	setupLogging()

	log.Info().Msg("Starting Newar Insights Admin API...")

	// Load configuration
	cfg := loadConfig()

	// Initialize database
	db, err := database.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()

	// Run migrations
	if err := runMigrations(db); err != nil {
		log.Fatal().Err(err).Msg("Failed to run migrations")
	}

	// Initialize repositories
	userRepo := database.NewUserRepository(db)
	tokenRepo := database.NewTokenRepository(db)

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userRepo)
	tokenHandler := handlers.NewTokenHandler(tokenRepo, userRepo)
	healthHandler := handlers.NewHealthHandler(db)

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Newar Insights Admin API",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),
		AllowHeaders: "Origin, Content-Type, Accept, X-Admin-API-Key",
	}))

	// Health endpoint (no auth required)
	app.Get("/health", healthHandler.Health)

	// Admin routes (require admin API key)
	admin := app.Group("/admin", middleware.AdminAuth)

	// User management
	admin.Post("/users", userHandler.CreateUser)
	admin.Get("/users", userHandler.ListUsers)
	admin.Get("/users/:id", userHandler.GetUser)
	admin.Delete("/users/:id", userHandler.DeleteUser)

	// Token management
	admin.Post("/users/:id/tokens", tokenHandler.GenerateToken)

	// Start server
	port := getEnv("ADMIN_API_PORT", "8081")
	addr := fmt.Sprintf(":%s", port)

	log.Info().Str("port", port).Msg("Admin API server starting")

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

	log.Info().Msg("Shutting down Admin API server...")

	// Shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(ctx); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Admin API server stopped")
}

// Config holds application configuration
type Config struct {
	Database database.Config
}

// loadConfig loads configuration from environment variables
func loadConfig() Config {
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

// runMigrations runs database migrations
func runMigrations(db database.Database) error {
	log.Info().Msg("Running database migrations...")

	migrationFile := "./migrations/001_initial_schema.sql"
	data, err := os.ReadFile(migrationFile)
	if err != nil {
		// Try alternative path (when running from services/admin-api)
		migrationFile = "../../migrations/001_initial_schema.sql"
		data, err = os.ReadFile(migrationFile)
		if err != nil {
			return fmt.Errorf("failed to read migration file: %w", err)
		}
	}

	return database.RunMigration(db, string(data))
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
