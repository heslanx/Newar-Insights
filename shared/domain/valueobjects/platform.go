package valueobjects

import (
	"fmt"
	"strings"
)

// Platform represents an immutable platform value object
type Platform struct {
	value string
}

const (
	PlatformGoogleMeet = "googlemeet"
	PlatformTeams      = "teams"
)

// NewPlatform creates a new Platform value object with validation
func NewPlatform(platform string) (Platform, error) {
	platform = strings.TrimSpace(strings.ToLower(platform))

	if platform == "" {
		return Platform{}, fmt.Errorf("platform cannot be empty")
	}

	// Validate against known platforms
	if platform != PlatformGoogleMeet && platform != PlatformTeams {
		return Platform{}, fmt.Errorf("unsupported platform: %s (supported: googlemeet, teams)", platform)
	}

	return Platform{value: platform}, nil
}

// Value returns the platform value
func (p Platform) Value() string {
	return p.value
}

// IsGoogleMeet checks if the platform is Google Meet
func (p Platform) IsGoogleMeet() bool {
	return p.value == PlatformGoogleMeet
}

// IsTeams checks if the platform is Microsoft Teams
func (p Platform) IsTeams() bool {
	return p.value == PlatformTeams
}

// String implements Stringer interface
func (p Platform) String() string {
	return p.value
}

// Equals checks if two platforms are equal
func (p Platform) Equals(other Platform) bool {
	return p.value == other.value
}
