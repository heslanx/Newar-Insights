package middleware

import (
	"context"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/redis"
)

// RateLimit implements per-user rate limiting using Redis
func RateLimit(redisClient *redis.Client, limit int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user ID from locals (set by Auth middleware)
		userID, ok := c.Locals("user_id").(int64)
		if !ok {
			// No user ID means auth middleware hasn't run - skip rate limiting
			return c.Next()
		}

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		// Check if rate limit exceeded
		exceeded, err := redisClient.CheckRateLimit(ctx, userID, limit)
		if err != nil {
			// Log error but don't block request if Redis fails
			log.Warn().Err(err).Int64("user_id", userID).Msg("Failed to check rate limit - allowing request")
			return c.Next()
		}

		if exceeded {
			log.Warn().Int64("user_id", userID).Int("limit", limit).Msg("Rate limit exceeded")
			return c.Status(429).JSON(fiber.Map{
				"error": "Rate limit exceeded",
				"details": fiber.Map{
					"limit":  limit,
					"window": "1 minute",
				},
			})
		}

		// Increment rate limit counter
		if err := redisClient.IncrementRateLimit(ctx, userID); err != nil {
			log.Warn().Err(err).Int64("user_id", userID).Msg("Failed to increment rate limit - allowing request")
		}

		// Add rate limit headers
		c.Set("X-RateLimit-Limit", strconv.Itoa(limit))
		// Note: We can't easily get remaining count without another Redis call, skipping for now

		return c.Next()
	}
}
