package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/types"
)

type RecordingHandler struct {
	db database.Database
}

func NewRecordingHandler(db database.Database) *RecordingHandler {
	return &RecordingHandler{
		db: db,
	}
}

// ListRecordings handles GET /admin/recordings
func (h *RecordingHandler) ListRecordings(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	if limit < 1 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Query recordings with pagination
	query := `
		SELECT id, user_id, platform, meeting_id, meeting_url,
		       bot_name, bot_container_id, recording_session_id, status,
		       recording_path, recording_duration, error_message,
		       started_at, completed_at, created_at, updated_at
		FROM meetings
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := h.db.Query(ctx, query, limit, offset)
	if err != nil {
		log.Error().Err(err).Msg("Failed to query recordings")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to list recordings",
		})
	}
	defer rows.Close()

	var recordings []types.Meeting
	for rows.Next() {
		var m types.Meeting
		err := rows.Scan(
			&m.ID, &m.UserID, &m.Platform, &m.MeetingID, &m.MeetingURL,
			&m.BotName, &m.BotContainerID, &m.RecordingSessionID, &m.Status,
			&m.RecordingPath, &m.RecordingDuration, &m.ErrorMessage,
			&m.StartedAt, &m.CompletedAt, &m.CreatedAt, &m.UpdatedAt,
		)
		if err != nil {
			log.Error().Err(err).Msg("Failed to scan recording row")
			continue
		}
		recordings = append(recordings, m)
	}

	// Get total count
	var total int64
	countQuery := `SELECT COUNT(*) FROM meetings`
	err = h.db.QueryRow(ctx, countQuery).Scan(&total)
	if err != nil {
		log.Error().Err(err).Msg("Failed to count recordings")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to count recordings",
		})
	}

	return c.JSON(types.PaginatedResponse{
		Data:   recordings,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// GetRecordingsByUser handles GET /admin/users/:id/recordings
func (h *RecordingHandler) GetRecordingsByUser(c *fiber.Ctx) error {
	userID, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	if limit < 1 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Query recordings for specific user
	query := `
		SELECT id, user_id, platform, meeting_id, meeting_url,
		       bot_name, bot_container_id, recording_session_id, status,
		       recording_path, recording_duration, error_message,
		       started_at, completed_at, created_at, updated_at
		FROM meetings
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := h.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		log.Error().Err(err).Int("user_id", userID).Msg("Failed to query user recordings")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to list user recordings",
		})
	}
	defer rows.Close()

	var recordings []types.Meeting
	for rows.Next() {
		var m types.Meeting
		err := rows.Scan(
			&m.ID, &m.UserID, &m.Platform, &m.MeetingID, &m.MeetingURL,
			&m.BotName, &m.BotContainerID, &m.RecordingSessionID, &m.Status,
			&m.RecordingPath, &m.RecordingDuration, &m.ErrorMessage,
			&m.StartedAt, &m.CompletedAt, &m.CreatedAt, &m.UpdatedAt,
		)
		if err != nil {
			log.Error().Err(err).Msg("Failed to scan recording row")
			continue
		}
		recordings = append(recordings, m)
	}

	// Get total count for user
	var total int64
	countQuery := `SELECT COUNT(*) FROM meetings WHERE user_id = $1`
	err = h.db.QueryRow(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		log.Error().Err(err).Int("user_id", userID).Msg("Failed to count user recordings")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to count user recordings",
		})
	}

	return c.JSON(types.PaginatedResponse{
		Data:   recordings,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// DeleteRecording handles DELETE /admin/recordings/:id
func (h *RecordingHandler) DeleteRecording(c *fiber.Ctx) error {
	recordingID, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid recording ID",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Delete recording from database
	query := `DELETE FROM meetings WHERE id = $1`
	result, err := h.db.Exec(ctx, query, recordingID)
	if err != nil {
		log.Error().Err(err).Int("recording_id", recordingID).Msg("Failed to delete recording")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to delete recording",
		})
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		log.Warn().Int("recording_id", recordingID).Msg("Recording not found")
		return c.Status(404).JSON(fiber.Map{
			"error": constants.ErrNotFound,
		})
	}

	log.Info().Int("recording_id", recordingID).Msg("Recording deleted successfully")

	return c.JSON(fiber.Map{
		"message": "Recording deleted successfully",
	})
}

// CleanupStaleRecordings marks old "requested" recordings as "failed"
// Recordings that have been in "requested" status for more than 5 minutes are considered stale
func (h *RecordingHandler) CleanupStaleRecordings(c *fiber.Ctx) error {
	log.Info().Msg("Cleaning up stale recordings")

	ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
	defer cancel()

	// Mark all recordings in "requested" status for more than 5 minutes as "failed"
	query := `
		UPDATE meetings
		SET status = 'failed', updated_at = NOW()
		WHERE status = 'requested'
		AND created_at < NOW() - INTERVAL '5 minutes'
	`
	result, err := h.db.Exec(ctx, query)
	if err != nil {
		log.Error().Err(err).Msg("Failed to cleanup stale recordings")
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to cleanup stale recordings",
		})
	}

	rowsAffected, _ := result.RowsAffected()

	log.Info().Int64("cleaned_up", rowsAffected).Msg("Stale recordings cleaned up")

	return c.JSON(fiber.Map{
		"message":       "Stale recordings cleaned up successfully",
		"rows_affected": rowsAffected,
	})
}
