package valueobjects

import (
	"fmt"
	"regexp"
	"strings"
)

// Email represents an immutable email value object
type Email struct {
	value string
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// NewEmail creates a new Email value object with validation
func NewEmail(email string) (Email, error) {
	email = strings.TrimSpace(strings.ToLower(email))

	if email == "" {
		return Email{}, fmt.Errorf("email cannot be empty")
	}

	if !emailRegex.MatchString(email) {
		return Email{}, fmt.Errorf("invalid email format: %s", email)
	}

	return Email{value: email}, nil
}

// Value returns the email value
func (e Email) Value() string {
	return e.value
}

// Domain returns the domain part of the email
func (e Email) Domain() string {
	parts := strings.Split(e.value, "@")
	if len(parts) == 2 {
		return parts[1]
	}
	return ""
}

// String implements Stringer interface
func (e Email) String() string {
	return e.value
}

// Equals checks if two emails are equal
func (e Email) Equals(other Email) bool {
	return e.value == other.value
}
