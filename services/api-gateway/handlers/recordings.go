package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/types"
	"github.com/newar/insights/shared/utils"
)

type RecordingHandler struct {
	meetingRepo   *database.MeetingRepository
	userRepo      *database.UserRepository
	botManagerURL string
}

func NewRecordingHandler(meetingRepo *database.MeetingRepository, userRepo *database.UserRepository, botManagerURL string) *RecordingHandler {
	return &RecordingHandler{
		meetingRepo:   meetingRepo,
		userRepo:      userRepo,
		botManagerURL: botManagerURL,
	}
}

// CreateRecording handles POST /recordings
func (h *RecordingHandler) CreateRecording(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(int64)

	var req types.CreateRecordingRequest
	if err := c.BodyParser(&req); err != nil {
		log.Warn().Err(err).Msg("Failed to parse create recording request")
		return c.Status(400).JSON(fiber.Map{
			"error": constants.ErrBadRequest,
		})
	}

	// Validate platform
	if req.Platform != types.PlatformGoogleMeet && req.Platform != types.PlatformTeams {
		return c.Status(400).JSON(fiber.Map{
			"error": constants.ErrInvalidPlatform,
		})
	}

	// Set default bot name
	if req.BotName == "" {
		req.BotName = constants.DefaultBotName
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if user has reached max concurrent bots
	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		log.Error().Err(err).Int64("user_id", userID).Msg("Failed to get user")
		return c.Status(500).JSON(fiber.Map{
			"error": constants.ErrInternalServer,
		})
	}

	activeCount, err := h.meetingRepo.CountActiveByUser(ctx, userID)
	if err != nil {
		log.Error().Err(err).Int64("user_id", userID).Msg("Failed to count active meetings")
		return c.Status(500).JSON(fiber.Map{
			"error": constants.ErrInternalServer,
		})
	}

	if activeCount >= user.MaxConcurrentBots {
		log.Warn().
			Int64("user_id", userID).
			Int("active", activeCount).
			Int("max", user.MaxConcurrentBots).
			Msg("Max concurrent bots reached")
		return c.Status(429).JSON(fiber.Map{
			"error": constants.ErrMaxBotsReached,
			"details": fiber.Map{
				"active": activeCount,
				"max":    user.MaxConcurrentBots,
			},
		})
	}

	// Build meeting URL
	meetingURL := utils.BuildMeetingURL(string(req.Platform), req.MeetingID)

	// Create meeting record
	meeting, err := h.meetingRepo.Create(ctx, userID, req, meetingURL)
	if err != nil {
		log.Error().Err(err).Str("meeting_id", req.MeetingID).Msg("Failed to create meeting")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create recording",
		})
	}

	// Send request to bot-manager to spawn bot
	spawnReq := types.SpawnBotRequest{
		MeetingID:  meeting.ID,
		UserID:     userID,
		Platform:   req.Platform,
		MeetingURL: meetingURL,
		BotName:    req.BotName,
	}

	go h.spawnBot(spawnReq, meeting.ID)

	log.Info().
		Int64("meeting_id", meeting.ID).
		Int64("user_id", userID).
		Str("platform", string(req.Platform)).
		Msg("Recording requested")

	return c.Status(201).JSON(meeting)
}

// spawnBot sends a request to bot-manager to spawn a bot (async)
func (h *RecordingHandler) spawnBot(req types.SpawnBotRequest, meetingID int64) {
	data, err := json.Marshal(req)
	if err != nil {
		log.Error().Err(err).Int64("meeting_id", meetingID).Msg("Failed to marshal spawn bot request")
		return
	}

	url := h.botManagerURL + "/bots/spawn"
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(data))
	if err != nil {
		log.Error().Err(err).Str("url", url).Msg("Failed to spawn bot")
		// TODO: Update meeting status to failed
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		log.Error().
			Int("status_code", resp.StatusCode).
			Str("response", string(body)).
			Msg("Bot manager returned error")
		// TODO: Update meeting status to failed
	}
}

// GetRecording handles GET /recordings/{platform}/{meeting_id}
func (h *RecordingHandler) GetRecording(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(int64)
	platform := types.Platform(c.Params("platform"))
	meetingID := c.Params("meeting_id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	meeting, err := h.meetingRepo.GetByPlatformAndMeetingID(ctx, userID, platform, meetingID)
	if err != nil {
		log.Warn().
			Err(err).
			Int64("user_id", userID).
			Str("platform", string(platform)).
			Str("meeting_id", meetingID).
			Msg("Meeting not found")
		return c.Status(404).JSON(fiber.Map{
			"error": constants.ErrRecordingNotFound,
		})
	}

	// Add recording URL if available
	if meeting.RecordingPath != nil && *meeting.RecordingPath != "" {
		recordingURL := fmt.Sprintf("/recordings/%s/%s/download", platform, meetingID)
		meeting.RecordingURL = &recordingURL
	}

	return c.JSON(meeting)
}

// ListRecordings handles GET /recordings
func (h *RecordingHandler) ListRecordings(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(int64)

	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)

	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	meetings, total, err := h.meetingRepo.List(ctx, userID, limit, offset)
	if err != nil {
		log.Error().Err(err).Int64("user_id", userID).Msg("Failed to list meetings")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to list recordings",
		})
	}

	// Add recording URLs
	for i := range meetings {
		if meetings[i].RecordingPath != nil && *meetings[i].RecordingPath != "" {
			recordingURL := fmt.Sprintf("/recordings/%s/%s/download", meetings[i].Platform, meetings[i].MeetingID)
			meetings[i].RecordingURL = &recordingURL
		}
	}

	return c.JSON(types.PaginatedResponse{
		Data:   meetings,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// StopRecording handles DELETE /recordings/{platform}/{meeting_id}
func (h *RecordingHandler) StopRecording(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(int64)
	platform := types.Platform(c.Params("platform"))
	meetingID := c.Params("meeting_id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	meeting, err := h.meetingRepo.GetByPlatformAndMeetingID(ctx, userID, platform, meetingID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": constants.ErrRecordingNotFound,
		})
	}

	if meeting.Status == types.StatusCompleted || meeting.Status == types.StatusFailed {
		return c.Status(400).JSON(fiber.Map{
			"error": "Recording already stopped",
		})
	}

	// Send stop command to bot-manager
	// TODO: Implement stop command via Redis or HTTP
	log.Info().
		Int64("meeting_id", meeting.ID).
		Str("container_id", *meeting.BotContainerID).
		Msg("Stop recording requested")

	return c.JSON(fiber.Map{
		"message": "Recording stop requested",
		"status":  meeting.Status,
	})
}

// DownloadRecording handles GET /recordings/{platform}/{meeting_id}/download
func (h *RecordingHandler) DownloadRecording(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(int64)
	platform := types.Platform(c.Params("platform"))
	meetingID := c.Params("meeting_id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	meeting, err := h.meetingRepo.GetByPlatformAndMeetingID(ctx, userID, platform, meetingID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": constants.ErrRecordingNotFound,
		})
	}

	if meeting.RecordingPath == nil || *meeting.RecordingPath == "" {
		return c.Status(404).JSON(fiber.Map{
			"error": "Recording file not available",
		})
	}

	// For local storage, serve file directly
	storagePath := os.Getenv("STORAGE_PATH")
	if storagePath == "" {
		storagePath = "./storage/recordings"
	}

	filePath := filepath.Join(storagePath, *meeting.RecordingPath)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		log.Error().Str("file_path", filePath).Msg("Recording file not found")
		return c.Status(404).JSON(fiber.Map{
			"error": "Recording file not found",
		})
	}

	// Send file
	c.Set("Content-Type", "audio/webm")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s_%s.webm\"", platform, meetingID))

	return c.SendFile(filePath)
}
