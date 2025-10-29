package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/redis"
	"github.com/newar/insights/shared/types"
)

type HealthHandler struct {
	db    database.Database
	redis *redis.Client
}

func NewHealthHandler(db database.Database, redisClient *redis.Client) *HealthHandler {
	return &HealthHandler{
		db:    db,
		redis: redisClient,
	}
}

// Health handles GET /health
func (h *HealthHandler) Health(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	deps := make(map[string]string)
	overallStatus := constants.HealthStatusHealthy

	// Check database
	if err := database.HealthCheck(h.db); err != nil {
		deps["database"] = "unhealthy: " + err.Error()
		overallStatus = constants.HealthStatusUnhealthy
	} else {
		deps["database"] = "ok"
	}

	// Check Redis
	if err := h.redis.HealthCheck(ctx); err != nil {
		deps["redis"] = "unhealthy: " + err.Error()
		overallStatus = constants.HealthStatusUnhealthy
	} else {
		deps["redis"] = "ok"
	}

	// TODO: Check Docker daemon connectivity

	statusCode := 200
	if overallStatus == constants.HealthStatusUnhealthy {
		statusCode = 503
	}

	return c.Status(statusCode).JSON(types.HealthResponse{
		Status:       overallStatus,
		Timestamp:    time.Now(),
		Dependencies: deps,
	})
}
