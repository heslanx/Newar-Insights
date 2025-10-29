package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/types"
)

type HealthHandler struct {
	db database.Database
}

func NewHealthHandler(db database.Database) *HealthHandler {
	return &HealthHandler{db: db}
}

// Health handles GET /health
func (h *HealthHandler) Health(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	deps := make(map[string]string)

	// Check database
	if err := database.HealthCheck(h.db); err != nil {
		deps["database"] = "unhealthy: " + err.Error()
		return c.Status(503).JSON(types.HealthResponse{
			Status:       constants.HealthStatusUnhealthy,
			Timestamp:    time.Now(),
			Dependencies: deps,
		})
	}

	deps["database"] = "ok"

	return c.JSON(types.HealthResponse{
		Status:       constants.HealthStatusHealthy,
		Timestamp:    time.Now(),
		Dependencies: deps,
	})
}
