package validation

import (
	"fmt"
	"net/mail"
	"regexp"
	"strings"
)

// RequestValidator provides common request validation helpers
type RequestValidator struct{}

// NewRequestValidator creates a new RequestValidator
func NewRequestValidator() *RequestValidator {
	return &RequestValidator{}
}

// ValidateEmail validates email format
func (v *RequestValidator) ValidateEmail(email string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return fmt.Errorf("email cannot be empty")
	}

	_, err := mail.ParseAddress(email)
	if err != nil {
		return fmt.Errorf("invalid email format: %w", err)
	}

	return nil
}

// ValidateName validates user/bot name
func (v *RequestValidator) ValidateName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("name cannot be empty")
	}

	if len(name) < 2 {
		return fmt.Errorf("name must be at least 2 characters")
	}

	if len(name) > 255 {
		return fmt.Errorf("name must be at most 255 characters")
	}

	return nil
}

// ValidateMeetingURL validates meeting URL format
func (v *RequestValidator) ValidateMeetingURL(urlStr string) error {
	urlStr = strings.TrimSpace(urlStr)
	if urlStr == "" {
		return fmt.Errorf("meeting URL cannot be empty")
	}

	// Check if it's a supported platform
	isGoogleMeet := strings.Contains(strings.ToLower(urlStr), "meet.google.com")
	isTeams := strings.Contains(strings.ToLower(urlStr), "teams.microsoft.com")

	if !isGoogleMeet && !isTeams {
		return fmt.Errorf("unsupported meeting platform (only Google Meet and Microsoft Teams are supported)")
	}

	return nil
}

// ValidatePlatform validates platform value
func (v *RequestValidator) ValidatePlatform(platform string) error {
	platform = strings.TrimSpace(strings.ToLower(platform))
	if platform == "" {
		return fmt.Errorf("platform cannot be empty")
	}

	if platform != "googlemeet" && platform != "teams" {
		return fmt.Errorf("invalid platform: %s (supported: googlemeet, teams)", platform)
	}

	return nil
}

// ValidateMeetingID validates meeting ID format
func (v *RequestValidator) ValidateMeetingID(meetingID string) error {
	meetingID = strings.TrimSpace(meetingID)
	if meetingID == "" {
		return fmt.Errorf("meeting ID cannot be empty")
	}

	if len(meetingID) < 3 {
		return fmt.Errorf("meeting ID too short (min 3 characters)")
	}

	if len(meetingID) > 255 {
		return fmt.Errorf("meeting ID too long (max 255 characters)")
	}

	return nil
}

// ValidateMaxConcurrentBots validates max concurrent bots value
func (v *RequestValidator) ValidateMaxConcurrentBots(max int) error {
	if max <= 0 {
		return fmt.Errorf("max concurrent bots must be positive")
	}

	if max > 50 {
		return fmt.Errorf("max concurrent bots cannot exceed 50")
	}

	return nil
}

// ValidateSessionID validates recording session ID format
func (v *RequestValidator) ValidateSessionID(sessionID string) error {
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return fmt.Errorf("session ID cannot be empty")
	}

	// Session ID should be 32 character UUID without hyphens
	if len(sessionID) != 32 {
		return fmt.Errorf("invalid session ID format (expected 32 characters)")
	}

	// Only alphanumeric characters
	matched, err := regexp.MatchString("^[a-f0-9]{32}$", sessionID)
	if err != nil || !matched {
		return fmt.Errorf("invalid session ID format (expected hexadecimal)")
	}

	return nil
}

// ValidatePagination validates pagination parameters
func (v *RequestValidator) ValidatePagination(limit, offset int) (int, int, error) {
	if limit < 1 || limit > 100 {
		limit = 50 // Default
	}

	if offset < 0 {
		offset = 0
	}

	return limit, offset, nil
}
