package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/newar/insights/shared/constants"
)

// GenerateAPIToken generates a random API token with prefix
func GenerateAPIToken() (string, error) {
	// Generate 20 random bytes (40 hex chars)
	bytes := make([]byte, 20)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}

	randomPart := hex.EncodeToString(bytes)
	return constants.APIKeyPrefix + randomPart, nil
}

// BuildMeetingURL constructs the full meeting URL from platform and meeting ID
func BuildMeetingURL(platform, meetingID string) string {
	switch platform {
	case "google_meet":
		return constants.GoogleMeetBaseURL + meetingID
	case "teams":
		return meetingID // Teams uses full URLs
	default:
		return meetingID
	}
}
