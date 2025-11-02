package main

import (
	"fmt"
	"os"

	"github.com/rs/zerolog/log"

	"github.com/newar/insights/services/admin-api/handlers"
	"github.com/newar/insights/services/admin-api/middleware"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/domain/services"
	"github.com/newar/insights/shared/server"
)

func main() {
	// Create server with all production components initialized
	builder, err := server.NewServerBuilder("admin-api")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create server")
	}

	// Initialize database
	cfg := builder.Config()
	db, err := database.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer db.Close()
	builder.Shutdown().Register("database", func() { db.Close() })

	// Run migrations
	if err := runMigrations(db); err != nil {
		log.Fatal().Err(err).Msg("Failed to run migrations")
	}

	// Register standard endpoints (Redis not used in admin-api)
	builder.RegisterHealthEndpoints(db, nil)
	builder.RegisterMetricsEndpoint()

	// Initialize domain repositories
	userRepoImpl := database.NewUserRepositoryImpl(db)
	meetingRepoImpl := database.NewMeetingRepositoryImpl(db)

	// Initialize domain services
	userService := services.NewUserService(userRepoImpl, meetingRepoImpl)

	// Initialize handlers
	userHandler := handlers.NewUserHandler(userService)

	// Token handler needs concrete implementation - create simple token repository
	tokenRepo := database.NewTokenRepository(db)
	userRepo := database.NewUserRepository(db)
	tokenHandler := handlers.NewTokenHandler(tokenRepo, userRepo)

	// Recording handler
	recordingHandler := handlers.NewRecordingHandler(db)

	// Bot handler (with Docker client)
	botHandler, err := handlers.NewBotHandler()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize bot handler")
	}
	defer botHandler.Close()
	builder.Shutdown().Register("bot_handler", func() { botHandler.Close() })

	// System handler
	systemHandler := handlers.NewSystemHandler(db)

	// Admin routes (require admin API key)
	admin := builder.App().Group("/admin", middleware.AdminAuth)

	// User management
	admin.Post("/users", userHandler.CreateUser)
	admin.Get("/users", userHandler.ListUsers)
	admin.Get("/users/:id", userHandler.GetUser)
	admin.Delete("/users/:id", userHandler.DeleteUser)

	// Token management
	admin.Post("/users/:id/tokens", tokenHandler.GenerateToken)

	// Recording management
	admin.Get("/recordings", recordingHandler.ListRecordings)
	admin.Get("/users/:id/recordings", recordingHandler.GetRecordingsByUser)
	admin.Delete("/recordings/:id", recordingHandler.DeleteRecording)
	admin.Post("/recordings/cleanup", recordingHandler.CleanupStaleRecordings)

	// Bot management
	admin.Get("/bots/active", botHandler.GetActiveBots)
	admin.Get("/bots/:containerId/logs", botHandler.GetBotLogs)
	admin.Post("/bots/:containerId/stop", botHandler.StopBot)

	// System management
	admin.Get("/system/health", systemHandler.GetSystemHealth)
	admin.Get("/system/metrics", systemHandler.GetSystemMetrics)
	admin.Get("/system/logs", systemHandler.GetSystemLogs)

	// Start server (blocks until shutdown)
	builder.MustStart()
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
