package database

import (
	"context"
	"fmt"

	"github.com/newar/insights/shared/adapters"
	"github.com/newar/insights/shared/domain/entities"
	"github.com/newar/insights/shared/domain/repositories"
	"github.com/newar/insights/shared/types"
)

// UserRepositoryImpl implements domain/repositories.UserRepository
// It handles persistence of User entities to the database
type UserRepositoryImpl struct {
	db      Database
	adapter *adapters.UserAdapter
}

// NewUserRepositoryImpl creates a new UserRepositoryImpl
func NewUserRepositoryImpl(db Database) repositories.UserRepository {
	return &UserRepositoryImpl{
		db:      db,
		adapter: adapters.NewUserAdapter(),
	}
}

// Save persists a user entity
func (r *UserRepositoryImpl) Save(ctx context.Context, user *entities.User) error {
	// Convert entity to DTO
	dto := r.adapter.ToDTO(user)

	// Check if user exists
	var existingID int64
	query := "SELECT id FROM users WHERE id = ?"
	err := r.db.QueryRow(ctx, query, dto.ID).Scan(&existingID)

	if err != nil {
		// User doesn't exist, insert
		insertQuery := `
			INSERT INTO users (email, name, max_concurrent_bots, data, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
			RETURNING id
		`
		err = r.db.QueryRow(
			ctx,
			insertQuery,
			dto.Email,
			dto.Name,
			dto.MaxConcurrentBots,
			dto.Data,
			dto.CreatedAt,
			dto.UpdatedAt,
		).Scan(&dto.ID)

		if err != nil {
			return fmt.Errorf("failed to insert user: %w", err)
		}
	} else {
		// User exists, update
		updateQuery := `
			UPDATE users
			SET email = ?, name = ?, max_concurrent_bots = ?, data = ?, updated_at = ?
			WHERE id = ?
		`
		_, err = r.db.Exec(
			ctx,
			updateQuery,
			dto.Email,
			dto.Name,
			dto.MaxConcurrentBots,
			dto.Data,
			dto.UpdatedAt,
			dto.ID,
		)

		if err != nil {
			return fmt.Errorf("failed to update user: %w", err)
		}
	}

	return nil
}

// FindByID retrieves a user by ID
func (r *UserRepositoryImpl) FindByID(ctx context.Context, id int64) (*entities.User, error) {
	query := "SELECT id, email, name, max_concurrent_bots, data, created_at, updated_at FROM users WHERE id = ?"

	var dto types.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&dto.ID,
		&dto.Email,
		&dto.Name,
		&dto.MaxConcurrentBots,
		&dto.Data,
		&dto.CreatedAt,
		&dto.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Convert DTO to entity
	return r.adapter.ToEntity(&dto)
}

// FindByEmail retrieves a user by email
func (r *UserRepositoryImpl) FindByEmail(ctx context.Context, email string) (*entities.User, error) {
	query := "SELECT id, email, name, max_concurrent_bots, data, created_at, updated_at FROM users WHERE email = ?"

	var dto types.User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&dto.ID,
		&dto.Email,
		&dto.Name,
		&dto.MaxConcurrentBots,
		&dto.Data,
		&dto.CreatedAt,
		&dto.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Convert DTO to entity
	return r.adapter.ToEntity(&dto)
}

// FindAll retrieves all users with pagination
func (r *UserRepositoryImpl) FindAll(ctx context.Context, limit, offset int) ([]*entities.User, int64, error) {
	// Get total count
	var total int64
	countQuery := "SELECT COUNT(*) FROM users"
	err := r.db.QueryRow(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Get users
	query := "SELECT id, email, name, max_concurrent_bots, data, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"

	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var dtos []*types.User
	for rows.Next() {
		var dto types.User
		err := rows.Scan(
			&dto.ID,
			&dto.Email,
			&dto.Name,
			&dto.MaxConcurrentBots,
			&dto.Data,
			&dto.CreatedAt,
			&dto.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}
		dtos = append(dtos, &dto)
	}

	// Convert DTOs to entities
	entities := make([]*entities.User, len(dtos))
	for i, dto := range dtos {
		entity, err := r.adapter.ToEntity(dto)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to convert user to entity: %w", err)
		}
		entities[i] = entity
	}

	return entities, total, nil
}

// Delete removes a user by ID
func (r *UserRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := "DELETE FROM users WHERE id = ?"
	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// CountActiveBots returns the number of active bots for a user
func (r *UserRepositoryImpl) CountActiveBots(ctx context.Context, userID int64) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM meetings
		WHERE user_id = ?
		AND status IN ('joining', 'active', 'recording')
	`

	var count int
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count active bots: %w", err)
	}

	return count, nil
}
