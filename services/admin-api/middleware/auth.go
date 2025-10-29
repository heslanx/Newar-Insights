package middleware

import (
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
)

// AdminAuth validates the admin API key
func AdminAuth(c *fiber.Ctx) error {
	adminKey := os.Getenv("ADMIN_API_KEY")
	if adminKey == "" {
		log.Error().Msg("ADMIN_API_KEY environment variable not set")
		return c.Status(500).JSON(fiber.Map{
			"error": "Server configuration error",
		})
	}

	providedKey := c.Get(constants.AdminAPIKeyHeader)
	if providedKey == "" {
		log.Warn().Msg("Missing admin API key in request")
		return c.Status(401).JSON(fiber.Map{
			"error": constants.ErrMissingAPIKey,
		})
	}

	if providedKey != adminKey {
		log.Warn().
			Str("provided_key", providedKey[:min(8, len(providedKey))]+"...").
			Msg("Invalid admin API key")
		return c.Status(401).JSON(fiber.Map{
			"error": constants.ErrInvalidAPIKey,
		})
	}

	log.Debug().Msg("Admin authentication successful")
	return c.Next()
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
