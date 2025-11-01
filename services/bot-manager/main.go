package main

import (
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/services/bot-manager/finalizer"
	"github.com/newar/insights/services/bot-manager/handlers"
	"github.com/newar/insights/services/bot-manager/orchestrator"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/redis"
	"github.com/newar/insights/shared/server"
	"github.com/newar/insights/shared/utils"
)

func main() {
	// Create server with all production components initialized
	builder, err := server.NewServerBuilder("bot-manager")
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

	// Initialize Redis
	redisClient, err := redis.NewClient(cfg.Redis)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer redisClient.Close()
	builder.Shutdown().Register("redis", func() { redisClient.Close() })

	// Initialize Docker orchestrator
	botImage := utils.GetEnvOrDefault("BOT_IMAGE", "newar-recording-bot:latest")
	storageType := utils.GetEnvOrDefault("STORAGE_TYPE", "local")
	storagePath := utils.GetEnvOrDefault("STORAGE_PATH", "./storage/recordings")

	dockerOrch, err := orchestrator.NewDockerOrchestrator(
		botImage,
		cfg.Redis.URL,
		storageType,
		storagePath,
	)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize Docker orchestrator")
	}
	defer dockerOrch.Close()
	builder.Shutdown().Register("docker", func() { dockerOrch.Close() })

	// Register standard endpoints
	builder.RegisterHealthEndpoints(db, redisClient)
	builder.RegisterMetricsEndpoint()

	// Initialize repositories
	meetingRepo := database.NewMeetingRepository(db)
	userRepo := database.NewUserRepository(db)

	// Initialize finalizer
	fin := finalizer.NewFinalizer(storagePath)

	// Initialize status listener
	statusListener := orchestrator.NewStatusListener(redisClient, meetingRepo, fin)

	// Initialize handlers
	botHandler := handlers.NewBotHandler(dockerOrch, statusListener, meetingRepo, userRepo)

	// Bot management endpoints
	builder.App().Post("/bots/spawn", botHandler.SpawnBot)
	builder.App().Post("/bots/:container_id/stop", botHandler.StopBot)

	// Start server (blocks until shutdown)
	builder.MustStart()
}
