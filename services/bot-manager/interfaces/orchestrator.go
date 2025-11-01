package interfaces

import (
	"context"

	"github.com/newar/insights/shared/types"
)

// BotOrchestrator defines operations for managing recording bots.
// This interface abstracts Docker operations, allowing for alternative
// orchestrators (Kubernetes, Nomad, etc.) without changing handler code.
//
// Implementations: orchestrator.DockerOrchestrator
type BotOrchestrator interface {
	// SpawnBot creates and starts a new recording bot container
	SpawnBot(ctx context.Context, meeting *types.Meeting, user *types.User) error

	// StopBot stops and removes a recording bot container
	StopBot(ctx context.Context, sessionID string) error

	// GetBotStatus retrieves the current status of a bot
	GetBotStatus(ctx context.Context, sessionID string) (*types.BotStatusUpdate, error)
}

// BotListener defines operations for listening to bot status updates via Redis.
//
// Implementations: orchestrator.StatusListener
type BotListener interface {
	// ListenForContainer listens for status updates from a bot container
	// This runs in a long-lived goroutine and should handle context cancellation
	ListenForContainer(ctx context.Context, containerID string) error

	// StartListening begins listening for status updates from a bot (legacy compatibility)
	StartListening(sessionID string, meetingID int64)

	// StopListening stops listening for status updates from a bot
	// This should be called when a recording completes or fails
	StopListening(sessionID string)
}

// MeetingRepository defines operations for managing meetings/recordings.
// This interface segregates only the operations needed by bot-manager.
//
// Implementations: database.MeetingRepository
type MeetingRepository interface {
	// Get retrieves a meeting by filter
	Get(ctx context.Context, filter types.MeetingFilter) (*types.Meeting, error)

	// Update updates a meeting with flexible filter and update params
	Update(ctx context.Context, filter types.MeetingFilter, update types.MeetingUpdate) error

	// UpdateStatus updates only the status of a meeting
	UpdateStatus(ctx context.Context, meetingID int64, status types.MeetingStatus, recordingPath *string, errorMsg *string, recordingDuration *int) error

	// GetActiveRecordings retrieves all recordings in active states
	// Used by reconciliation logic to re-attach listeners on restart
	GetActiveRecordings(ctx context.Context) ([]*types.Meeting, error)
}

// UserRepository defines operations for managing users.
// This interface segregates only the operations needed by bot-manager.
//
// Implementations: database.UserRepository
type UserRepository interface {
	// GetByID retrieves a user by ID
	GetByID(ctx context.Context, id int64) (*types.User, error)
}
