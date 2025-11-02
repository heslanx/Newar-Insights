package handlers

import (
	"context"
	"io"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
)

type BotHandler struct {
	dockerClient *client.Client
}

func NewBotHandler() (*BotHandler, error) {
	dockerClient, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	return &BotHandler{
		dockerClient: dockerClient,
	}, nil
}

// Close closes the Docker client connection
func (h *BotHandler) Close() error {
	if h.dockerClient != nil {
		return h.dockerClient.Close()
	}
	return nil
}

// GetActiveBots handles GET /admin/bots/active
func (h *BotHandler) GetActiveBots(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Filter for containers with name prefix "newar-bot-"
	filterArgs := filters.NewArgs()
	filterArgs.Add("name", "newar-bot-")

	containers, err := h.dockerClient.ContainerList(ctx, container.ListOptions{
		All:     true, // Include stopped containers
		Filters: filterArgs,
	})
	if err != nil {
		log.Error().Err(err).Msg("Failed to list Docker containers")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to list active bots",
		})
	}

	// Transform container data into response format
	var bots []fiber.Map
	for _, container := range containers {
		bot := fiber.Map{
			"id":      container.ID,
			"name":    container.Names[0], // Remove leading slash
			"image":   container.Image,
			"state":   container.State,
			"status":  container.Status,
			"created": container.Created,
		}

		// Add labels if available
		if container.Labels != nil {
			bot["labels"] = container.Labels
		}

		bots = append(bots, bot)
	}

	log.Info().Int("count", len(bots)).Msg("Retrieved active bots")

	return c.JSON(fiber.Map{
		"bots":  bots,
		"total": len(bots),
	})
}

// GetBotLogs handles GET /admin/bots/:containerId/logs
func (h *BotHandler) GetBotLogs(c *fiber.Ctx) error {
	containerID := c.Params("containerId")
	if containerID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Container ID is required",
		})
	}

	// Parse query parameters
	tail := c.Query("tail", "100")
	timestamps := c.QueryBool("timestamps", true)

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Get container logs
	logOptions := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       tail,
		Timestamps: timestamps,
	}

	logs, err := h.dockerClient.ContainerLogs(ctx, containerID, logOptions)
	if err != nil {
		log.Error().Err(err).Str("container_id", containerID).Msg("Failed to get container logs")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get bot logs",
		})
	}
	defer logs.Close()

	// Read logs
	logBytes, err := io.ReadAll(logs)
	if err != nil {
		log.Error().Err(err).Str("container_id", containerID).Msg("Failed to read container logs")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to read bot logs",
		})
	}

	log.Info().
		Str("container_id", containerID).
		Int("log_size", len(logBytes)).
		Msg("Retrieved bot logs")

	return c.JSON(fiber.Map{
		"container_id": containerID,
		"logs":         string(logBytes),
	})
}

// StopBot handles POST /admin/bots/:containerId/stop
func (h *BotHandler) StopBot(c *fiber.Ctx) error {
	containerID := c.Params("containerId")
	if containerID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Container ID is required",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Stop container with timeout
	timeout := 10 // seconds
	stopOptions := container.StopOptions{
		Timeout: &timeout,
	}

	err := h.dockerClient.ContainerStop(ctx, containerID, stopOptions)
	if err != nil {
		log.Error().Err(err).Str("container_id", containerID).Msg("Failed to stop container")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to stop bot",
		})
	}

	log.Info().Str("container_id", containerID).Msg("Bot container stopped successfully")

	return c.JSON(fiber.Map{
		"message":      "Bot stopped successfully",
		"container_id": containerID,
	})
}
