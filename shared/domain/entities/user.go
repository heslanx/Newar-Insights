package entities

import (
	"fmt"
	"time"

	"github.com/newar/insights/shared/domain/valueobjects"
)

// User represents a user entity with rich domain logic
type User struct {
	id                int64
	email             valueobjects.Email
	name              string
	maxConcurrentBots int
	data              map[string]interface{}
	createdAt         time.Time
	updatedAt         time.Time
}

// NewUser creates a new user entity with validation
func NewUser(id int64, email, name string, maxConcurrentBots int) (*User, error) {
	emailVO, err := valueobjects.NewEmail(email)
	if err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	if name == "" {
		return nil, fmt.Errorf("name cannot be empty")
	}

	if maxConcurrentBots <= 0 {
		maxConcurrentBots = 5 // Default
	}

	if maxConcurrentBots > 50 {
		return nil, fmt.Errorf("max concurrent bots cannot exceed 50")
	}

	now := time.Now()
	return &User{
		id:                id,
		email:             emailVO,
		name:              name,
		maxConcurrentBots: maxConcurrentBots,
		data:              make(map[string]interface{}),
		createdAt:         now,
		updatedAt:         now,
	}, nil
}

// ID returns the user ID
func (u *User) ID() int64 {
	return u.id
}

// Email returns the user email
func (u *User) Email() string {
	return u.email.Value()
}

// Name returns the user name
func (u *User) Name() string {
	return u.name
}

// MaxConcurrentBots returns the max concurrent bots allowed
func (u *User) MaxConcurrentBots() int {
	return u.maxConcurrentBots
}

// Data returns the user data
func (u *User) Data() map[string]interface{} {
	return u.data
}

// CreatedAt returns the creation timestamp
func (u *User) CreatedAt() time.Time {
	return u.createdAt
}

// UpdatedAt returns the last update timestamp
func (u *User) UpdatedAt() time.Time {
	return u.updatedAt
}

// CanSpawnBot checks if user can spawn a new bot
func (u *User) CanSpawnBot(currentActiveBots int) bool {
	return currentActiveBots < u.maxConcurrentBots
}

// UpdateName updates the user name
func (u *User) UpdateName(name string) error {
	if name == "" {
		return fmt.Errorf("name cannot be empty")
	}
	u.name = name
	u.updatedAt = time.Now()
	return nil
}

// UpdateMaxConcurrentBots updates the max concurrent bots
func (u *User) UpdateMaxConcurrentBots(max int) error {
	if max <= 0 {
		return fmt.Errorf("max concurrent bots must be positive")
	}
	if max > 50 {
		return fmt.Errorf("max concurrent bots cannot exceed 50")
	}
	u.maxConcurrentBots = max
	u.updatedAt = time.Now()
	return nil
}

// SetData sets custom data for the user
func (u *User) SetData(key string, value interface{}) {
	u.data[key] = value
	u.updatedAt = time.Now()
}
