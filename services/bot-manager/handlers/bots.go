package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/services/bot-manager/orchestrator"
	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/types"
)

type BotHandler struct {
	docker   *orchestrator.DockerOrchestrator
	listener *orchestrator.StatusListener
	meetingRepo *database.MeetingRepository
}

func NewBotHandler(docker *orchestrator.DockerOrchestrator, listener *orchestrator.StatusListener, meetingRepo *database.MeetingRepository) *BotHandler {
	return &BotHandler{
		docker:   docker,
		listener: listener,
		meetingRepo: meetingRepo,
	}
}

// SpawnBot handles POST /bots/spawn
func (h *BotHandler) SpawnBot(c *fiber.Ctx) error {
	var req types.SpawnBotRequest
	if err := c.BodyParser(&req); err != nil {
		log.Warn().Err(err).Msg("Failed to parse spawn bot request")
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Spawn Docker container
	containerID, err := h.docker.SpawnBot(ctx, req)
	if err != nil {
		log.Error().
			Err(err).
			Int64("meeting_id", req.MeetingID).
			Msg("Failed to spawn bot container")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to spawn bot",
			"details": fiber.Map{
				"message": err.Error(),
			},
		})
	}

	// Update meeting with container ID
	updateCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = h.meetingRepo.UpdateStatus(
		updateCtx,
		req.MeetingID,
		types.StatusJoining,
		&containerID,
		nil,
		nil,
	)

	if err != nil {
		log.Error().
			Err(err).
			Int64("meeting_id", req.MeetingID).
			Msg("Failed to update meeting status")
		// Don't fail the request, container is already spawned
	}

	// Start listening for status updates from this container
	go func() {
		listenerCtx := context.Background() // Long-lived context
		if err := h.listener.ListenForContainer(listenerCtx, containerID); err != nil {
			log.Error().
				Err(err).
				Str("container_id", containerID).
				Msg("Status listener stopped")
		}
	}()

	log.Info().
		Int64("meeting_id", req.MeetingID).
		Str("container_id", containerID).
		Msg("Bot spawned successfully")

	return c.Status(201).JSON(types.SpawnBotResponse{
		ContainerID: containerID,
		Status:      string(types.StatusJoining),
	})
}

// StopBot handles POST /bots/{container_id}/stop
func (h *BotHandler) StopBot(c *fiber.Ctx) error {
	containerID := c.Params("container_id")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Send stop command via Redis (bot will handle gracefully)
	// For now, just stop the container directly
	if err := h.docker.StopBot(ctx, containerID); err != nil {
		log.Error().
			Err(err).
			Str("container_id", containerID).
			Msg("Failed to stop bot")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to stop bot",
		})
	}

	log.Info().Str("container_id", containerID).Msg("Bot stopped successfully")

	return c.JSON(fiber.Map{
		"message": constants.MsgRecordingStopped,
	})
}
