package valueobjects

import (
	"fmt"
	"net/url"
	"strings"
)

// MeetingURL represents an immutable meeting URL value object
type MeetingURL struct {
	value string
}

// NewMeetingURL creates a new MeetingURL value object with validation
func NewMeetingURL(urlStr string) (MeetingURL, error) {
	urlStr = strings.TrimSpace(urlStr)

	if urlStr == "" {
		return MeetingURL{}, fmt.Errorf("meeting URL cannot be empty")
	}

	// Parse URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return MeetingURL{}, fmt.Errorf("invalid URL format: %w", err)
	}

	// Validate scheme
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return MeetingURL{}, fmt.Errorf("URL must use http or https scheme")
	}

	// Validate host
	if parsedURL.Host == "" {
		return MeetingURL{}, fmt.Errorf("URL must have a valid host")
	}

	return MeetingURL{value: urlStr}, nil
}

// Value returns the meeting URL value
func (m MeetingURL) Value() string {
	return m.value
}

// Host returns the host part of the URL
func (m MeetingURL) Host() string {
	parsedURL, err := url.Parse(m.value)
	if err != nil {
		return ""
	}
	return parsedURL.Host
}

// IsGoogleMeet checks if the URL is a Google Meet URL
func (m MeetingURL) IsGoogleMeet() bool {
	return strings.Contains(strings.ToLower(m.value), "meet.google.com")
}

// IsTeams checks if the URL is a Microsoft Teams URL
func (m MeetingURL) IsTeams() bool {
	return strings.Contains(strings.ToLower(m.value), "teams.microsoft.com")
}

// String implements Stringer interface
func (m MeetingURL) String() string {
	return m.value
}

// Equals checks if two meeting URLs are equal
func (m MeetingURL) Equals(other MeetingURL) bool {
	return m.value == other.value
}
