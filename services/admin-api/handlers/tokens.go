package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/services/admin-api/interfaces"
	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/types"
	"github.com/newar/insights/shared/utils"
)

type TokenHandler struct {
	tokenManager interfaces.TokenManager
	userManager  interfaces.UserManager
}

func NewTokenHandler(tokenManager interfaces.TokenManager, userManager interfaces.UserManager) *TokenHandler {
	return &TokenHandler{
		tokenManager: tokenManager,
		userManager:  userManager,
	}
}

// GenerateToken handles POST /admin/users/:id/tokens
func (h *TokenHandler) GenerateToken(c *fiber.Ctx) error {
	userID, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Verify user exists
	_, err = h.userManager.GetByID(ctx, int64(userID))
	if err != nil {
		log.Warn().Err(err).Int("user_id", userID).Msg("User not found")
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Generate random token
	token, err := utils.GenerateAPIToken()
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate API token")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	// Store token hash in database
	apiToken, err := h.tokenManager.Create(ctx, int64(userID), token)
	if err != nil {
		log.Error().Err(err).Int("user_id", userID).Msg("Failed to create token")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create token",
		})
	}

	log.Info().
		Int64("user_id", apiToken.UserID).
		Str("token_preview", token[:20]+"...").
		Msg("API token generated successfully")

	// Return plaintext token (ONLY TIME IT'S EXPOSED!)
	return c.Status(201).JSON(types.GenerateTokenResponse{
		Token:     token,
		CreatedAt: apiToken.CreatedAt,
	})
}
