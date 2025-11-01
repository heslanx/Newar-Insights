package repositories

import (
	"context"

	"github.com/newar/insights/shared/domain/entities"
)

// UserRepository defines operations for persisting User entities
// This is a domain interface that infrastructure implements
type UserRepository interface {
	// Save persists a user entity
	Save(ctx context.Context, user *entities.User) error

	// FindByID retrieves a user by ID
	FindByID(ctx context.Context, id int64) (*entities.User, error)

	// FindByEmail retrieves a user by email
	FindByEmail(ctx context.Context, email string) (*entities.User, error)

	// FindAll retrieves all users with pagination
	FindAll(ctx context.Context, limit, offset int) ([]*entities.User, int64, error)

	// Delete removes a user by ID
	Delete(ctx context.Context, id int64) error

	// CountActiveBots returns the number of active bots for a user
	CountActiveBots(ctx context.Context, userID int64) (int, error)
}
