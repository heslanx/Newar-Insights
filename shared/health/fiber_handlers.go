package health

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/newar/insights/shared/database"
	redislib "github.com/newar/insights/shared/redis"
)

// RegisterHealthEndpoints registers standard health check endpoints
func RegisterHealthEndpoints(app *fiber.App, db database.Database, redis *redislib.Client) {
	// Basic health check
	app.Get("/health", func(c *fiber.Ctx) error {
		// Check database
		dbStatus := "ok"
		if db != nil {
			if err := db.Ping(context.Background()); err != nil {
				dbStatus = "error"
			}
		}

		// Check Redis
		redisStatus := "ok"
		if redis != nil {
			if err := redis.Ping(context.Background()); err != nil {
				redisStatus = "error"
			}
		}

		deps := fiber.Map{}
		if db != nil {
			deps["database"] = dbStatus
		}
		if redis != nil {
			deps["redis"] = redisStatus
		}

		return c.JSON(fiber.Map{
			"status":       "healthy",
			"dependencies": deps,
		})
	})

	// Readiness check
	app.Get("/health/ready", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ready",
		})
	})

	// Liveness check
	app.Get("/health/live", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "alive",
		})
	})
}
