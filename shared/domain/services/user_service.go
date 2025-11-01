package services

import (
	"context"
	"fmt"

	"github.com/newar/insights/shared/domain/entities"
	"github.com/newar/insights/shared/domain/repositories"
)

// UserService encapsulates user business logic
type UserService struct {
	userRepo    repositories.UserRepository
	meetingRepo repositories.MeetingRepository
}

// NewUserService creates a new UserService
func NewUserService(
	userRepo repositories.UserRepository,
	meetingRepo repositories.MeetingRepository,
) *UserService {
	return &UserService{
		userRepo:    userRepo,
		meetingRepo: meetingRepo,
	}
}

// CreateUser creates a new user with validation
func (s *UserService) CreateUser(
	ctx context.Context,
	email string,
	name string,
	maxConcurrentBots int,
) (*entities.User, error) {
	// Check if email already exists
	existing, err := s.userRepo.FindByEmail(ctx, email)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("email already registered: %s", email)
	}

	// Create user entity (performs validation)
	user, err := entities.NewUser(0, email, name, maxConcurrentBots)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Persist user
	if err := s.userRepo.Save(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to save user: %w", err)
	}

	return user, nil
}

// GetUser retrieves a user by ID
func (s *UserService) GetUser(ctx context.Context, userID int64) (*entities.User, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return user, nil
}

// UpdateUserName updates a user's name
func (s *UserService) UpdateUserName(ctx context.Context, userID int64, newName string) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if err := user.UpdateName(newName); err != nil {
		return err
	}

	return s.userRepo.Save(ctx, user)
}

// UpdateMaxConcurrentBots updates a user's max concurrent bots
func (s *UserService) UpdateMaxConcurrentBots(ctx context.Context, userID int64, max int) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if err := user.UpdateMaxConcurrentBots(max); err != nil {
		return err
	}

	return s.userRepo.Save(ctx, user)
}

// CanUserSpawnBot checks if a user can spawn a new bot
func (s *UserService) CanUserSpawnBot(ctx context.Context, userID int64) (bool, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("user not found: %w", err)
	}

	// Count active bots
	activeBots, err := s.userRepo.CountActiveBots(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to count active bots: %w", err)
	}

	return user.CanSpawnBot(activeBots), nil
}

// ListUsers retrieves all users with pagination
func (s *UserService) ListUsers(ctx context.Context, limit, offset int) ([]*entities.User, int64, error) {
	return s.userRepo.FindAll(ctx, limit, offset)
}

// DeleteUser deletes a user and all their meetings
func (s *UserService) DeleteUser(ctx context.Context, userID int64) error {
	// Check if user has active recordings
	activeRecordings, err := s.meetingRepo.FindActiveByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check active recordings: %w", err)
	}

	if len(activeRecordings) > 0 {
		return fmt.Errorf("cannot delete user with %d active recordings", len(activeRecordings))
	}

	return s.userRepo.Delete(ctx, userID)
}
