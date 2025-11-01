package interfaces

import (
	"context"

	"github.com/newar/insights/shared/types"
)

// UserManager defines operations for managing users.
// This interface follows the Dependency Inversion Principle (DIP),
// allowing handlers to depend on abstractions rather than concrete implementations.
//
// Implementations: database.UserRepository
type UserManager interface {
	// Create creates a new user
	Create(ctx context.Context, req types.CreateUserRequest) (*types.User, error)

	// GetByID retrieves a user by ID
	GetByID(ctx context.Context, id int64) (*types.User, error)

	// GetByEmail retrieves a user by email
	GetByEmail(ctx context.Context, email string) (*types.User, error)

	// List retrieves users with pagination
	// Returns: users slice, total count, error
	List(ctx context.Context, limit, offset int) ([]*types.User, int64, error)

	// Delete deletes a user by ID
	Delete(ctx context.Context, id int64) error
}

// TokenManager defines operations for managing API tokens.
//
// Implementations: database.TokenRepository
type TokenManager interface {
	// Create creates a new API token for a user
	// The token parameter should be the plaintext token (will be hashed internally)
	Create(ctx context.Context, userID int64, token string) (*types.APIToken, error)

	// ValidateToken validates a token hash and returns the associated user
	ValidateToken(ctx context.Context, tokenHash string) (*types.User, error)

	// DeleteByUserID deletes all tokens for a user
	DeleteByUserID(ctx context.Context, userID int64) error
}

// RecordingProvider defines read-only operations for recordings.
// Admin API should not create/update recordings directly.
//
// Implementations: database.MeetingRepository
type RecordingProvider interface {
	// Get retrieves a recording by filter
	Get(ctx context.Context, filter types.MeetingFilter) (*types.Meeting, error)

	// List retrieves recordings with pagination
	// Use userID=0 to list all recordings (admin privilege)
	List(ctx context.Context, userID int64, limit, offset int) ([]*types.Meeting, error)
}
