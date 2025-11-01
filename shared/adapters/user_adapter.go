package adapters

import (
	"encoding/json"

	"github.com/newar/insights/shared/domain/entities"
	"github.com/newar/insights/shared/types"
)

// UserAdapter handles conversion between User entity and User DTO
type UserAdapter struct{}

// NewUserAdapter creates a new UserAdapter
func NewUserAdapter() *UserAdapter {
	return &UserAdapter{}
}

// ToEntity converts User DTO to User entity (for reads from DB)
func (a *UserAdapter) ToEntity(dto *types.User) (*entities.User, error) {
	// Reconstruct entity from DTO
	user, err := entities.NewUser(
		dto.ID,
		dto.Email,
		dto.Name,
		dto.MaxConcurrentBots,
	)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// ToDTO converts User entity to User DTO (for JSON responses and DB writes)
func (a *UserAdapter) ToDTO(entity *entities.User) *types.User {
	// Extract custom data if any
	dataBytes, _ := json.Marshal(entity.Data())

	return &types.User{
		ID:                entity.ID(),
		Email:             entity.Email(),
		Name:              entity.Name(),
		MaxConcurrentBots: entity.MaxConcurrentBots(),
		CreatedAt:         entity.CreatedAt(),
		UpdatedAt:         entity.UpdatedAt(),
		Data:              dataBytes,
	}
}

// ToDTOList converts a list of User entities to User DTOs
func (a *UserAdapter) ToDTOList(entities []*entities.User) []*types.User {
	dtos := make([]*types.User, len(entities))
	for i, entity := range entities {
		dtos[i] = a.ToDTO(entity)
	}
	return dtos
}
