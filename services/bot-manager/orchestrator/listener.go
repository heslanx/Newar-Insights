package orchestrator

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/newar/insights/services/bot-manager/finalizer"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/redis"
	"github.com/newar/insights/shared/types"
)

// StatusListener listens for bot status updates from Redis
type StatusListener struct {
	redisClient *redis.Client
	meetingRepo *database.MeetingRepository
	finalizer   *finalizer.Finalizer
}

// NewStatusListener creates a new status listener
func NewStatusListener(redisClient *redis.Client, meetingRepo *database.MeetingRepository, fin *finalizer.Finalizer) *StatusListener {
	return &StatusListener{
		redisClient: redisClient,
		meetingRepo: meetingRepo,
		finalizer:   fin,
	}
}

// ListenForContainer listens for status updates from a specific container
func (l *StatusListener) ListenForContainer(ctx context.Context, containerID string) error {
	log.Info().Str("container_id", containerID).Msg("Starting status listener for container")

	return l.redisClient.SubscribeBotStatus(ctx, containerID, func(status types.BotStatusUpdate) {
		l.handleStatusUpdate(status)
	})
}

// handleStatusUpdate processes a bot status update
func (l *StatusListener) handleStatusUpdate(status types.BotStatusUpdate) {
	log.Info().
		Str("container_id", status.ContainerID).
		Int64("meeting_id", status.MeetingID).
		Str("status", string(status.Status)).
		Int("chunk_count", status.ChunkCount).
		Msg("Received bot status update")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Update meeting status in database
	var recordingPath *string
	if status.Status == types.StatusCompleted && status.ErrorMessage == nil {
		// Trigger finalization
		path, err := l.finalizer.FinalizeRecording(ctx, status.MeetingID, status.ContainerID)
		if err != nil {
			log.Error().
				Err(err).
				Int64("meeting_id", status.MeetingID).
				Msg("Failed to finalize recording")

			errMsg := "Finalization failed: " + err.Error()
			status.ErrorMessage = &errMsg
			status.Status = types.StatusFailed
		} else {
			recordingPath = &path
			log.Info().
				Int64("meeting_id", status.MeetingID).
				Str("recording_path", path).
				Msg("Recording finalized successfully")
		}
	}

	// Update database
	err := l.meetingRepo.UpdateStatus(
		ctx,
		status.MeetingID,
		status.Status,
		&status.ContainerID,
		status.ErrorMessage,
		recordingPath,
	)

	if err != nil {
		log.Error().
			Err(err).
			Int64("meeting_id", status.MeetingID).
			Str("status", string(status.Status)).
			Msg("Failed to update meeting status")
	}
}

// StartListening begins listening for status updates from a bot (legacy compatibility)
func (l *StatusListener) StartListening(sessionID string, meetingID int64) {
	// Legacy method for backward compatibility
	// Spawns a goroutine to listen for this session
	go func() {
		ctx := context.Background()
		if err := l.ListenForContainer(ctx, sessionID); err != nil {
			log.Error().
				Err(err).
				Str("session_id", sessionID).
				Int64("meeting_id", meetingID).
				Msg("Status listener stopped")
		}
	}()
}

// StopListening stops listening for status updates from a bot
func (l *StatusListener) StopListening(sessionID string) {
	// This is a stub - actual implementation would need context cancellation
	log.Info().Str("session_id", sessionID).Msg("StopListening called (no-op)")
}
