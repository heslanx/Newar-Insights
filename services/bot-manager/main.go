package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/services/bot-manager/finalizer"
	"github.com/newar/insights/services/bot-manager/handlers"
	"github.com/newar/insights/services/bot-manager/orchestrator"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/redis"
)

func main() {
	// Setup logging
	setupLogging()

	log.Info().Msg("Starting Newar Insights Bot Manager...")

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

	// Initialize Docker orchestrator
	dockerOrch, err := orchestrator.NewDockerOrchestrator(
		cfg.BotImage,
		cfg.Redis.URL,
		cfg.StorageType,
		cfg.StoragePath,
	)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize Docker orchestrator")
	}
	defer dockerOrch.Close()

	// Initialize repositories
	meetingRepo := database.NewMeetingRepository(db)

	// Initialize finalizer
	fin := finalizer.NewFinalizer(cfg.StoragePath)

	// Initialize status listener
	statusListener := orchestrator.NewStatusListener(redisClient, meetingRepo, fin)

	// Initialize handlers
	botHandler := handlers.NewBotHandler(dockerOrch, statusListener, meetingRepo)
	healthHandler := handlers.NewHealthHandler(db, redisClient)

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Newar Insights Bot Manager",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New())

	// Health endpoint
	app.Get("/health", healthHandler.Health)

	// Bot management endpoints
	app.Post("/bots/spawn", botHandler.SpawnBot)
	app.Post("/bots/:container_id/stop", botHandler.StopBot)

	// Start server
	port := getEnv("BOT_MANAGER_PORT", "8082")
	addr := fmt.Sprintf(":%s", port)

	log.Info().Str("port", port).Msg("Bot Manager server starting")

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

	log.Info().Msg("Shutting down Bot Manager server...")

	// Shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(ctx); err != nil {
		log.Error().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Bot Manager server stopped")
}

// Config holds application configuration
type Config struct {
	Database    database.Config
	Redis       redis.Config
	BotImage    string
	StorageType string
	StoragePath string
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
		Redis: redis.Config{
			URL: getEnv("REDIS_URL", "redis://localhost:6379"),
		},
		BotImage:    getEnv("BOT_IMAGE", "newar-recording-bot:latest"),
		StorageType: getEnv("STORAGE_TYPE", "local"),
		StoragePath: getEnv("STORAGE_PATH", "./storage/recordings"),
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
