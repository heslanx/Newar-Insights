package services

import (
	"context"
	"fmt"

	"github.com/newar/insights/shared/domain/entities"
	"github.com/newar/insights/shared/domain/repositories"
	"github.com/newar/insights/shared/types"
)

// RecordingService encapsulates recording business logic
type RecordingService struct {
	meetingRepo repositories.MeetingRepository
	userRepo    repositories.UserRepository
}

// NewRecordingService creates a new RecordingService
func NewRecordingService(
	meetingRepo repositories.MeetingRepository,
	userRepo repositories.UserRepository,
) *RecordingService {
	return &RecordingService{
		meetingRepo: meetingRepo,
		userRepo:    userRepo,
	}
}

// CreateRecording creates a new recording session
func (s *RecordingService) CreateRecording(
	ctx context.Context,
	userID int64,
	meetingURL string,
	platform string,
	meetingID string,
	botName string,
	sessionID string,
) (*entities.Meeting, error) {
	// Validate user exists
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Check if user can spawn a bot
	activeBots, err := s.userRepo.CountActiveBots(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count active bots: %w", err)
	}

	if !user.CanSpawnBot(activeBots) {
		return nil, fmt.Errorf("user has reached max concurrent bots limit (%d)", user.MaxConcurrentBots())
	}

	// Create meeting entity (performs validation)
	meeting, err := entities.NewMeeting(0, userID, meetingURL, platform, meetingID, botName, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to create meeting: %w", err)
	}

	// Persist meeting
	if err := s.meetingRepo.Save(ctx, meeting); err != nil {
		return nil, fmt.Errorf("failed to save meeting: %w", err)
	}

	return meeting, nil
}

// GetRecording retrieves a recording by platform and meeting ID
func (s *RecordingService) GetRecording(ctx context.Context, platform, meetingID string) (*entities.Meeting, error) {
	meeting, err := s.meetingRepo.FindByMeetingID(ctx, platform, meetingID)
	if err != nil {
		return nil, fmt.Errorf("recording not found: %w", err)
	}
	return meeting, nil
}

// GetRecordingBySessionID retrieves a recording by session ID
func (s *RecordingService) GetRecordingBySessionID(ctx context.Context, sessionID string) (*entities.Meeting, error) {
	meeting, err := s.meetingRepo.FindBySessionID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("recording not found: %w", err)
	}
	return meeting, nil
}

// ListUserRecordings lists all recordings for a user
func (s *RecordingService) ListUserRecordings(ctx context.Context, userID int64, limit, offset int) ([]*entities.Meeting, int, error) {
	return s.meetingRepo.FindByUserID(ctx, userID, limit, offset)
}

// UpdateRecordingStatus updates the status of a recording
func (s *RecordingService) UpdateRecordingStatus(
	ctx context.Context,
	sessionID string,
	newStatus types.MeetingStatus,
) error {
	meeting, err := s.meetingRepo.FindBySessionID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("recording not found: %w", err)
	}

	// Use domain logic to validate transition
	if err := meeting.TransitionTo(newStatus); err != nil {
		return fmt.Errorf("invalid status transition: %w", err)
	}

	return s.meetingRepo.Update(ctx, meeting)
}

// CompleteRecording marks a recording as completed
func (s *RecordingService) CompleteRecording(
	ctx context.Context,
	sessionID string,
	recordingPath string,
	duration int,
) error {
	meeting, err := s.meetingRepo.FindBySessionID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("recording not found: %w", err)
	}

	if err := meeting.Complete(recordingPath, duration); err != nil {
		return fmt.Errorf("failed to complete recording: %w", err)
	}

	return s.meetingRepo.Update(ctx, meeting)
}

// FailRecording marks a recording as failed
func (s *RecordingService) FailRecording(ctx context.Context, sessionID string, errorMsg string) error {
	meeting, err := s.meetingRepo.FindBySessionID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("recording not found: %w", err)
	}

	if err := meeting.Fail(errorMsg); err != nil {
		return fmt.Errorf("failed to mark recording as failed: %w", err)
	}

	return s.meetingRepo.Update(ctx, meeting)
}

// StopRecording stops an active recording
func (s *RecordingService) StopRecording(ctx context.Context, platform, meetingID string) error {
	meeting, err := s.meetingRepo.FindByMeetingID(ctx, platform, meetingID)
	if err != nil {
		return fmt.Errorf("recording not found: %w", err)
	}

	if !meeting.IsActive() {
		return fmt.Errorf("recording is not active (current status: %s)", meeting.Status())
	}

	// Transition to finalizing (will be completed by bot manager)
	if err := meeting.StartFinalizing(); err != nil {
		return fmt.Errorf("failed to start finalization: %w", err)
	}

	return s.meetingRepo.Update(ctx, meeting)
}

// SetBotContainerID sets the bot container ID for a recording
func (s *RecordingService) SetBotContainerID(ctx context.Context, sessionID string, containerID string) error {
	meeting, err := s.meetingRepo.FindBySessionID(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("recording not found: %w", err)
	}

	meeting.SetBotContainerID(containerID)

	return s.meetingRepo.Update(ctx, meeting)
}
