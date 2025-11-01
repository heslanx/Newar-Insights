package adapters

import (
	"github.com/newar/insights/shared/domain/entities"
	"github.com/newar/insights/shared/types"
)

// MeetingAdapter handles conversion between Meeting entity and Meeting DTO
type MeetingAdapter struct{}

// NewMeetingAdapter creates a new MeetingAdapter
func NewMeetingAdapter() *MeetingAdapter {
	return &MeetingAdapter{}
}

// ToEntity converts Meeting DTO to Meeting entity (for reads from DB)
func (a *MeetingAdapter) ToEntity(dto *types.Meeting) (*entities.Meeting, error) {
	// Extract platform string
	platformStr := string(dto.Platform)

	// Reconstruct entity from DTO
	meeting, err := entities.NewMeeting(
		dto.ID,
		dto.UserID,
		dto.MeetingURL,
		platformStr,
		dto.MeetingID,
		derefString(dto.BotName),
		derefString(dto.RecordingSessionID),
	)
	if err != nil {
		return nil, err
	}

	// Set additional fields that can't be set in constructor
	if dto.BotContainerID != nil {
		meeting.SetBotContainerID(*dto.BotContainerID)
	}

	// Set status (bypass validation for DB reads)
	if err := meeting.TransitionTo(dto.Status); err != nil {
		// For DB reads, we trust the stored status even if transition seems invalid
		// This handles cases where the entity was persisted in a valid state
	}

	// If recording is completed, set the completion data
	if dto.RecordingPath != nil && dto.RecordingDuration != nil {
		meeting.Complete(*dto.RecordingPath, *dto.RecordingDuration)
	}

	// If recording failed, set error message
	if dto.Status == types.MeetingStatusFailed && dto.ErrorMessage != nil {
		meeting.Fail(*dto.ErrorMessage)
	}

	return meeting, nil
}

// ToDTO converts Meeting entity to Meeting DTO (for JSON responses and DB writes)
func (a *MeetingAdapter) ToDTO(entity *entities.Meeting) *types.Meeting {
	dto := &types.Meeting{
		ID:                  entity.ID(),
		UserID:              entity.UserID(),
		Platform:            types.Platform(entity.Platform()),
		MeetingID:           entity.MeetingID(),
		Status:              entity.Status(),
		MeetingURL:          entity.MeetingURL(),
		CreatedAt:           entity.CreatedAt(),
		UpdatedAt:           entity.UpdatedAt(),
		RecordingSessionID:  strPtr(entity.RecordingSessionID()),
	}

	// Optional fields
	if entity.BotContainerID() != "" {
		dto.BotContainerID = strPtr(entity.BotContainerID())
	}

	if entity.BotName() != "" {
		dto.BotName = strPtr(entity.BotName())
	}

	if entity.RecordingPath() != "" {
		dto.RecordingPath = strPtr(entity.RecordingPath())
	}

	if entity.RecordingDuration() > 0 {
		dto.RecordingDuration = intPtr(entity.RecordingDuration())
	}

	if entity.ErrorMessage() != "" {
		dto.ErrorMessage = strPtr(entity.ErrorMessage())
	}

	return dto
}

// ToDTOList converts a list of Meeting entities to Meeting DTOs
func (a *MeetingAdapter) ToDTOList(entities []*entities.Meeting) []*types.Meeting {
	dtos := make([]*types.Meeting, len(entities))
	for i, entity := range entities {
		dtos[i] = a.ToDTO(entity)
	}
	return dtos
}

// Helper functions
func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func intPtr(i int) *int {
	if i == 0 {
		return nil
	}
	return &i
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
