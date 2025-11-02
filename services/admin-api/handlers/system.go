package handlers

import (
	"context"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/database"
)

type SystemHandler struct {
	db database.Database
}

func NewSystemHandler(db database.Database) *SystemHandler {
	return &SystemHandler{
		db: db,
	}
}

// GetSystemHealth handles GET /admin/system/health
func (h *SystemHandler) GetSystemHealth(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	health := fiber.Map{
		"status":    "healthy",
		"timestamp": time.Now(),
		"services":  fiber.Map{},
	}

	// Check database connectivity
	if err := h.db.Ping(ctx); err != nil {
		log.Error().Err(err).Msg("Database health check failed")
		health["services"].(fiber.Map)["database"] = "unhealthy"
		health["status"] = "degraded"
	} else {
		health["services"].(fiber.Map)["database"] = "healthy"
	}

	// Check if we can query the database
	var count int64
	err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		log.Error().Err(err).Msg("Database query check failed")
		health["services"].(fiber.Map)["database_queries"] = "unhealthy"
		health["status"] = "degraded"
	} else {
		health["services"].(fiber.Map)["database_queries"] = "healthy"
	}

	// Return appropriate status code
	statusCode := 200
	if health["status"] == "degraded" {
		statusCode = 503
	}

	log.Info().
		Str("status", health["status"].(string)).
		Msg("System health check completed")

	return c.Status(statusCode).JSON(health)
}

// GetSystemMetrics handles GET /admin/system/metrics
func (h *SystemHandler) GetSystemMetrics(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Gather basic system metrics
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// Get database statistics
	var userCount, meetingCount, tokenCount int64

	err := h.db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil {
		log.Error().Err(err).Msg("Failed to count users")
		userCount = -1
	}

	err = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM meetings").Scan(&meetingCount)
	if err != nil {
		log.Error().Err(err).Msg("Failed to count meetings")
		meetingCount = -1
	}

	err = h.db.QueryRow(ctx, "SELECT COUNT(*) FROM api_tokens").Scan(&tokenCount)
	if err != nil {
		log.Error().Err(err).Msg("Failed to count tokens")
		tokenCount = -1
	}

	// Get active recordings count
	var activeRecordings int64
	activeQuery := `
		SELECT COUNT(*) FROM meetings
		WHERE status IN ('requested', 'joining', 'active', 'recording')
	`
	err = h.db.QueryRow(ctx, activeQuery).Scan(&activeRecordings)
	if err != nil {
		log.Error().Err(err).Msg("Failed to count active recordings")
		activeRecordings = -1
	}

	metrics := fiber.Map{
		"timestamp": time.Now(),
		"system": fiber.Map{
			"go_version":      runtime.Version(),
			"goroutines":      runtime.NumGoroutine(),
			"memory_alloc_mb": m.Alloc / 1024 / 1024,
			"memory_total_mb": m.TotalAlloc / 1024 / 1024,
			"memory_sys_mb":   m.Sys / 1024 / 1024,
			"gc_runs":         m.NumGC,
		},
		"database": fiber.Map{
			"total_users":       userCount,
			"total_recordings":  meetingCount,
			"total_tokens":      tokenCount,
			"active_recordings": activeRecordings,
		},
	}

	log.Info().
		Int64("users", userCount).
		Int64("recordings", meetingCount).
		Int64("active", activeRecordings).
		Msg("System metrics retrieved")

	return c.JSON(metrics)
}

// GetSystemLogs handles GET /admin/system/logs
func (h *SystemHandler) GetSystemLogs(c *fiber.Ctx) error {
	// For now, return empty array as logs are handled by Docker/external systems
	log.Info().Msg("System logs endpoint called (not implemented)")

	return c.JSON(fiber.Map{
		"message": "System logs are available via Docker logs or external logging service",
		"logs":    []interface{}{},
	})
}
