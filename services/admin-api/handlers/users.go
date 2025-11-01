package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/adapters"
	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/domain/services"
	"github.com/newar/insights/shared/types"
)

type UserHandler struct {
	userService *services.UserService
	adapter     *adapters.UserAdapter
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
		adapter:     adapters.NewUserAdapter(),
	}
}

// CreateUser handles POST /admin/users
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var req types.CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		log.Warn().Err(err).Msg("Failed to parse create user request")
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Set default max concurrent bots if not provided
	if req.MaxConcurrentBots == 0 {
		req.MaxConcurrentBots = 5
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Use domain service
	userEntity, err := h.userService.CreateUser(ctx, req.Email, req.Name, req.MaxConcurrentBots)
	if err != nil {
		log.Error().Err(err).Str("email", req.Email).Msg("Failed to create user")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create user",
			"details": fiber.Map{
				"message": err.Error(),
			},
		})
	}

	// Convert entity to DTO for response
	userDTO := h.adapter.ToDTO(userEntity)

	log.Info().
		Int64("user_id", userDTO.ID).
		Str("email", userDTO.Email).
		Msg("User created successfully")

	return c.Status(201).JSON(userDTO)
}

// GetUser handles GET /admin/users/:id
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	userID, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Use domain service
	userEntity, err := h.userService.GetUser(ctx, int64(userID))
	if err != nil {
		log.Warn().Err(err).Int("user_id", userID).Msg("User not found")
		return c.Status(404).JSON(fiber.Map{
			"error": constants.ErrNotFound,
		})
	}

	// Convert entity to DTO for response
	userDTO := h.adapter.ToDTO(userEntity)

	return c.JSON(userDTO)
}

// ListUsers handles GET /admin/users
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	if limit < 1 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Use domain service
	userEntities, total, err := h.userService.ListUsers(ctx, limit, offset)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list users")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to list users",
		})
	}

	// Convert entities to DTOs
	userDTOs := h.adapter.ToDTOList(userEntities)

	return c.JSON(types.PaginatedResponse{
		Data:   userDTOs,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// DeleteUser handles DELETE /admin/users/:id
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	userID, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Use domain service
	err = h.userService.DeleteUser(ctx, int64(userID))
	if err != nil {
		log.Error().Err(err).Int("user_id", userID).Msg("Failed to delete user")
		return c.Status(404).JSON(fiber.Map{
			"error": constants.ErrNotFound,
		})
	}

	log.Info().Int("user_id", userID).Msg("User deleted successfully")

	return c.JSON(fiber.Map{
		"message": "User deleted successfully",
	})
}
