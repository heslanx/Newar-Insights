package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/database"
)

// Auth validates user API keys and sets user_id in locals
func Auth(tokenRepo *database.TokenRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		apiKey := c.Get(constants.APIKeyHeader)
		if apiKey == "" {
			log.Warn().Msg("Missing API key in request")
			return c.Status(401).JSON(fiber.Map{
				"error": constants.ErrMissingAPIKey,
			})
		}

		// Validate prefix
		if !strings.HasPrefix(apiKey, constants.APIKeyPrefix) {
			log.Warn().Str("prefix", apiKey[:min(10, len(apiKey))]).Msg("Invalid API key prefix")
			return c.Status(401).JSON(fiber.Map{
				"error": constants.ErrInvalidAPIKey,
			})
		}

		// Get user ID from token
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		userID, err := tokenRepo.GetUserIDByToken(ctx, apiKey)
		if err != nil {
			log.Warn().
				Err(err).
				Str("api_key_preview", apiKey[:min(20, len(apiKey))]+"...").
				Msg("Invalid API key")
			return c.Status(401).JSON(fiber.Map{
				"error": constants.ErrInvalidAPIKey,
			})
		}

		// Store user ID in context for handlers
		c.Locals("user_id", userID)

		log.Debug().Int64("user_id", userID).Msg("API authentication successful")

		return c.Next()
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
