package main

import (
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/services/api-gateway/handlers"
	"github.com/newar/insights/services/api-gateway/middleware"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/redis"
	"github.com/newar/insights/shared/server"
	"github.com/newar/insights/shared/utils"
)

func main() {
	// Create server with all production components initialized
	builder, err := server.NewServerBuilder("api-gateway")
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

	// Register standard endpoints
	builder.RegisterHealthEndpoints(db, redisClient)
	builder.RegisterMetricsEndpoint()

	// Initialize repositories
	tokenRepo := database.NewTokenRepository(db)
	meetingRepo := database.NewMeetingRepository(db)
	userRepo := database.NewUserRepository(db)

	// Initialize handlers
	botManagerURL := utils.GetEnvOrDefault("BOT_MANAGER_URL", "http://localhost:8082")
	recordingHandler := handlers.NewRecordingHandler(meetingRepo, userRepo, botManagerURL)

	// API routes (require API key + rate limiting)
	api := builder.App().Group("/recordings")
	api.Use(middleware.Auth(tokenRepo))
	api.Use(middleware.RateLimit(redisClient, cfg.RateLimit.RequestsPerMinute))

	// Recording management
	api.Post("/", recordingHandler.CreateRecording)
	api.Get("/", recordingHandler.ListRecordings)
	api.Get("/:platform/:meeting_id", recordingHandler.GetRecording)
	api.Delete("/:platform/:meeting_id", recordingHandler.StopRecording)
	api.Get("/:platform/:meeting_id/download", recordingHandler.DownloadRecording)

	// Start server (blocks until shutdown)
	builder.MustStart()
}
