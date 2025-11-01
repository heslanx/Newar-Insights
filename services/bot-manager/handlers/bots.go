package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/services/bot-manager/interfaces"
	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/types"
)

type BotHandler struct {
	orchestrator interfaces.BotOrchestrator
	listener     interfaces.BotListener
	meetingRepo  interfaces.MeetingRepository
	userRepo     interfaces.UserRepository
}

func NewBotHandler(orchestrator interfaces.BotOrchestrator, listener interfaces.BotListener, meetingRepo interfaces.MeetingRepository, userRepo interfaces.UserRepository) *BotHandler {
	return &BotHandler{
		orchestrator: orchestrator,
		listener:     listener,
		meetingRepo:  meetingRepo,
		userRepo:     userRepo,
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

	// Get meeting from database
	meeting, err := h.meetingRepo.Get(ctx, types.MeetingFilter{
		UserID:    &req.UserID,
		MeetingID: &req.MeetingURL, // Note: using URL as meeting ID filter
	})
	if err != nil {
		log.Error().Err(err).Int64("meeting_id", req.MeetingID).Msg("Meeting not found")
		return c.Status(404).JSON(fiber.Map{"error": "Meeting not found"})
	}

	// Get user from database
	user, err := h.userRepo.GetByID(ctx, req.UserID)
	if err != nil {
		log.Error().Err(err).Int64("user_id", req.UserID).Msg("User not found")
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	// Spawn bot container (orchestrator updates meeting internally)
	if err := h.orchestrator.SpawnBot(ctx, meeting, user); err != nil {
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

	// Fetch updated meeting to get recording_session_id
	updatedMeeting, err := h.meetingRepo.Get(ctx, types.MeetingFilter{
		UserID:    &req.UserID,
		MeetingID: &req.MeetingURL,
	})
	if err != nil {
		log.Error().Err(err).Int64("meeting_id", req.MeetingID).Msg("Failed to fetch updated meeting")
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch meeting after spawn"})
	}

	sessionID := ""
	if updatedMeeting.RecordingSessionID != nil {
		sessionID = *updatedMeeting.RecordingSessionID
	}

	// Start listening for status updates from this recording session
	if sessionID != "" {
		go func() {
			listenerCtx := context.Background() // Long-lived context
			if err := h.listener.ListenForContainer(listenerCtx, sessionID); err != nil {
				log.Error().
					Err(err).
					Str("session_id", sessionID).
					Msg("Status listener stopped")
			}
		}()
	}

	log.Info().
		Int64("meeting_id", req.MeetingID).
		Str("session_id", sessionID).
		Msg("Bot spawned successfully")

	return c.Status(201).JSON(types.SpawnBotResponse{
		ContainerID: sessionID,
		Status:      string(updatedMeeting.Status),
	})
}

// StopBot handles POST /bots/{container_id}/stop
func (h *BotHandler) StopBot(c *fiber.Ctx) error {
	containerID := c.Params("container_id")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Stop bot via orchestrator (abstracted)
	if err := h.orchestrator.StopBot(ctx, containerID); err != nil {
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
