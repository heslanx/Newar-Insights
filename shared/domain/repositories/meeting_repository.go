package repositories

import (
	"context"

	"github.com/newar/insights/shared/domain/entities"
	"github.com/newar/insights/shared/types"
)

// MeetingRepository defines operations for persisting Meeting entities
// This is a domain interface that infrastructure implements
type MeetingRepository interface {
	// Save persists a meeting entity
	Save(ctx context.Context, meeting *entities.Meeting) error

	// FindByID retrieves a meeting by ID
	FindByID(ctx context.Context, id int64) (*entities.Meeting, error)

	// FindBySessionID retrieves a meeting by recording session ID
	FindBySessionID(ctx context.Context, sessionID string) (*entities.Meeting, error)

	// FindByMeetingID retrieves a meeting by platform and meeting ID
	FindByMeetingID(ctx context.Context, platform, meetingID string) (*entities.Meeting, error)

	// FindByUserID retrieves all meetings for a user with pagination
	FindByUserID(ctx context.Context, userID int64, limit, offset int) ([]*entities.Meeting, int, error)

	// FindActiveByUserID retrieves active meetings for a user
	FindActiveByUserID(ctx context.Context, userID int64) ([]*entities.Meeting, error)

	// FindAllActive retrieves all active meetings across all users
	FindAllActive(ctx context.Context) ([]*entities.Meeting, error)

	// Update updates a meeting entity
	Update(ctx context.Context, meeting *entities.Meeting) error

	// Delete removes a meeting by ID
	Delete(ctx context.Context, id int64) error
}

// MeetingFilter defines filter criteria for querying meetings
type MeetingFilter struct {
	ID                 *int64
	UserID             *int64
	Platform           *string
	MeetingID          *string
	Status             *types.MeetingStatus
	RecordingSessionID *string
}
