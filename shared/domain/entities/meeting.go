package entities

import (
	"fmt"
	"time"

	"github.com/newar/insights/shared/domain/valueobjects"
	"github.com/newar/insights/shared/types"
)

// Meeting represents a recording session entity with rich domain logic
type Meeting struct {
	id                 int64
	userID             int64
	meetingURL         valueobjects.MeetingURL
	platform           valueobjects.Platform
	meetingID          string
	botName            string
	status             types.MeetingStatus
	recordingPath      string
	recordingDuration  int
	errorMessage       string
	recordingSessionID string
	botContainerID     string
	createdAt          time.Time
	updatedAt          time.Time
}

// NewMeeting creates a new meeting entity with validation
func NewMeeting(
	id int64,
	userID int64,
	meetingURLStr string,
	platformStr string,
	meetingID string,
	botName string,
	recordingSessionID string,
) (*Meeting, error) {
	// Validate meeting URL
	meetingURL, err := valueobjects.NewMeetingURL(meetingURLStr)
	if err != nil {
		return nil, fmt.Errorf("invalid meeting URL: %w", err)
	}

	// Validate platform
	platform, err := valueobjects.NewPlatform(platformStr)
	if err != nil {
		return nil, fmt.Errorf("invalid platform: %w", err)
	}

	// Validate meeting ID
	if meetingID == "" {
		return nil, fmt.Errorf("meeting ID cannot be empty")
	}

	// Validate bot name
	if botName == "" {
		botName = "Newar Bot" // Default
	}

	now := time.Now()
	return &Meeting{
		id:                 id,
		userID:             userID,
		meetingURL:         meetingURL,
		platform:           platform,
		meetingID:          meetingID,
		botName:            botName,
		status:             types.MeetingStatusRequested,
		recordingSessionID: recordingSessionID,
		createdAt:          now,
		updatedAt:          now,
	}, nil
}

// ID returns the meeting ID
func (m *Meeting) ID() int64 {
	return m.id
}

// UserID returns the user ID
func (m *Meeting) UserID() int64 {
	return m.userID
}

// MeetingURL returns the meeting URL
func (m *Meeting) MeetingURL() string {
	return m.meetingURL.Value()
}

// Platform returns the platform
func (m *Meeting) Platform() string {
	return m.platform.Value()
}

// MeetingID returns the meeting ID
func (m *Meeting) MeetingID() string {
	return m.meetingID
}

// BotName returns the bot name
func (m *Meeting) BotName() string {
	return m.botName
}

// Status returns the current status
func (m *Meeting) Status() types.MeetingStatus {
	return m.status
}

// RecordingPath returns the recording path
func (m *Meeting) RecordingPath() string {
	return m.recordingPath
}

// RecordingDuration returns the recording duration in seconds
func (m *Meeting) RecordingDuration() int {
	return m.recordingDuration
}

// ErrorMessage returns the error message if any
func (m *Meeting) ErrorMessage() string {
	return m.errorMessage
}

// RecordingSessionID returns the recording session ID
func (m *Meeting) RecordingSessionID() string {
	return m.recordingSessionID
}

// BotContainerID returns the bot container ID
func (m *Meeting) BotContainerID() string {
	return m.botContainerID
}

// CreatedAt returns the creation timestamp
func (m *Meeting) CreatedAt() time.Time {
	return m.createdAt
}

// UpdatedAt returns the last update timestamp
func (m *Meeting) UpdatedAt() time.Time {
	return m.updatedAt
}

// IsActive checks if the meeting is in an active state
func (m *Meeting) IsActive() bool {
	return m.status == types.MeetingStatusJoining ||
		m.status == types.MeetingStatusActive ||
		m.status == types.MeetingStatusRecording
}

// IsFinished checks if the meeting is in a finished state
func (m *Meeting) IsFinished() bool {
	return m.status == types.MeetingStatusCompleted ||
		m.status == types.MeetingStatusFailed
}

// CanTransitionTo validates state machine transitions
func (m *Meeting) CanTransitionTo(newStatus types.MeetingStatus) bool {
	validTransitions := map[types.MeetingStatus][]types.MeetingStatus{
		types.MeetingStatusRequested: {
			types.MeetingStatusJoining,
			types.MeetingStatusFailed,
		},
		types.MeetingStatusJoining: {
			types.MeetingStatusActive,
			types.MeetingStatusFailed,
		},
		types.MeetingStatusActive: {
			types.MeetingStatusRecording,
			types.MeetingStatusFailed,
		},
		types.MeetingStatusRecording: {
			types.MeetingStatusFinalizing,
			types.MeetingStatusFailed,
		},
		types.MeetingStatusFinalizing: {
			types.MeetingStatusCompleted,
			types.MeetingStatusFailed,
		},
	}

	allowed, exists := validTransitions[m.status]
	if !exists {
		return false
	}

	for _, s := range allowed {
		if s == newStatus {
			return true
		}
	}
	return false
}

// TransitionTo transitions the meeting to a new status
func (m *Meeting) TransitionTo(newStatus types.MeetingStatus) error {
	if !m.CanTransitionTo(newStatus) {
		return fmt.Errorf("invalid transition from %s to %s", m.status, newStatus)
	}
	m.status = newStatus
	m.updatedAt = time.Now()
	return nil
}

// SetBotContainerID sets the bot container ID
func (m *Meeting) SetBotContainerID(containerID string) {
	m.botContainerID = containerID
	m.updatedAt = time.Now()
}

// Complete completes the meeting with recording details
func (m *Meeting) Complete(recordingPath string, duration int) error {
	if err := m.TransitionTo(types.MeetingStatusCompleted); err != nil {
		return err
	}
	m.recordingPath = recordingPath
	m.recordingDuration = duration
	return nil
}

// Fail marks the meeting as failed with an error message
func (m *Meeting) Fail(errorMsg string) error {
	m.status = types.MeetingStatusFailed
	m.errorMessage = errorMsg
	m.updatedAt = time.Now()
	return nil
}

// StartFinalizing transitions to finalizing state
func (m *Meeting) StartFinalizing() error {
	return m.TransitionTo(types.MeetingStatusFinalizing)
}
