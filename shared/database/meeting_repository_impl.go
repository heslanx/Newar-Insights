package database

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/newar/insights/shared/adapters"
	"github.com/newar/insights/shared/domain/entities"
	"github.com/newar/insights/shared/domain/repositories"
	"github.com/newar/insights/shared/types"
)

// MeetingRepositoryImpl implements domain/repositories.MeetingRepository
// It handles persistence of Meeting entities to the database
type MeetingRepositoryImpl struct {
	db      Database
	adapter *adapters.MeetingAdapter
}

// NewMeetingRepositoryImpl creates a new MeetingRepositoryImpl
func NewMeetingRepositoryImpl(db Database) repositories.MeetingRepository {
	return &MeetingRepositoryImpl{
		db:      db,
		adapter: adapters.NewMeetingAdapter(),
	}
}

// Save persists a meeting entity
func (r *MeetingRepositoryImpl) Save(ctx context.Context, meeting *entities.Meeting) error {
	// Convert entity to DTO
	dto := r.adapter.ToDTO(meeting)

	// Check if meeting exists
	var existingID int64
	query := "SELECT id FROM meetings WHERE id = ?"
	err := r.db.QueryRow(ctx, query, dto.ID).Scan(&existingID)

	if err != nil {
		// Meeting doesn't exist, insert
		insertQuery := `
			INSERT INTO meetings (
				user_id, platform, meeting_id, meeting_url, bot_name,
				bot_container_id, recording_session_id, status,
				recording_path, recording_duration, error_message,
				created_at, updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			RETURNING id
		`
		err = r.db.QueryRow(
			ctx,
			insertQuery,
			dto.UserID,
			dto.Platform,
			dto.MeetingID,
			dto.MeetingURL,
			dto.BotName,
			dto.BotContainerID,
			dto.RecordingSessionID,
			dto.Status,
			dto.RecordingPath,
			dto.RecordingDuration,
			dto.ErrorMessage,
			dto.CreatedAt,
			dto.UpdatedAt,
		).Scan(&dto.ID)

		if err != nil {
			return fmt.Errorf("failed to insert meeting: %w", err)
		}
	} else {
		// Meeting exists, update
		updateQuery := `
			UPDATE meetings
			SET status = ?, bot_container_id = ?, recording_path = ?,
			    recording_duration = ?, error_message = ?, updated_at = ?
			WHERE id = ?
		`
		_, err = r.db.Exec(
			ctx,
			updateQuery,
			dto.Status,
			dto.BotContainerID,
			dto.RecordingPath,
			dto.RecordingDuration,
			dto.ErrorMessage,
			dto.UpdatedAt,
			dto.ID,
		)

		if err != nil {
			return fmt.Errorf("failed to update meeting: %w", err)
		}
	}

	return nil
}

// FindByID retrieves a meeting by ID
func (r *MeetingRepositoryImpl) FindByID(ctx context.Context, id int64) (*entities.Meeting, error) {
	query := `
		SELECT id, user_id, platform, meeting_id, meeting_url, bot_name,
		       bot_container_id, recording_session_id, status, recording_path,
		       recording_duration, error_message, created_at, updated_at
		FROM meetings WHERE id = ?
	`

	var dto types.Meeting
	err := r.db.QueryRow(ctx, query, id).Scan(
		&dto.ID,
		&dto.UserID,
		&dto.Platform,
		&dto.MeetingID,
		&dto.MeetingURL,
		&dto.BotName,
		&dto.BotContainerID,
		&dto.RecordingSessionID,
		&dto.Status,
		&dto.RecordingPath,
		&dto.RecordingDuration,
		&dto.ErrorMessage,
		&dto.CreatedAt,
		&dto.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("meeting not found: %w", err)
	}

	// Convert DTO to entity
	return r.adapter.ToEntity(&dto)
}

// FindBySessionID retrieves a meeting by recording session ID
func (r *MeetingRepositoryImpl) FindBySessionID(ctx context.Context, sessionID string) (*entities.Meeting, error) {
	query := `
		SELECT id, user_id, platform, meeting_id, meeting_url, bot_name,
		       bot_container_id, recording_session_id, status, recording_path,
		       recording_duration, error_message, created_at, updated_at
		FROM meetings WHERE recording_session_id = ?
	`

	var dto types.Meeting
	err := r.db.QueryRow(ctx, query, sessionID).Scan(
		&dto.ID,
		&dto.UserID,
		&dto.Platform,
		&dto.MeetingID,
		&dto.MeetingURL,
		&dto.BotName,
		&dto.BotContainerID,
		&dto.RecordingSessionID,
		&dto.Status,
		&dto.RecordingPath,
		&dto.RecordingDuration,
		&dto.ErrorMessage,
		&dto.CreatedAt,
		&dto.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("meeting not found: %w", err)
	}

	// Convert DTO to entity
	return r.adapter.ToEntity(&dto)
}

// FindByMeetingID retrieves a meeting by platform and meeting ID
func (r *MeetingRepositoryImpl) FindByMeetingID(ctx context.Context, platform, meetingID string) (*entities.Meeting, error) {
	query := `
		SELECT id, user_id, platform, meeting_id, meeting_url, bot_name,
		       bot_container_id, recording_session_id, status, recording_path,
		       recording_duration, error_message, created_at, updated_at
		FROM meetings WHERE platform = ? AND meeting_id = ?
	`

	var dto types.Meeting
	err := r.db.QueryRow(ctx, query, platform, meetingID).Scan(
		&dto.ID,
		&dto.UserID,
		&dto.Platform,
		&dto.MeetingID,
		&dto.MeetingURL,
		&dto.BotName,
		&dto.BotContainerID,
		&dto.RecordingSessionID,
		&dto.Status,
		&dto.RecordingPath,
		&dto.RecordingDuration,
		&dto.ErrorMessage,
		&dto.CreatedAt,
		&dto.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("meeting not found: %w", err)
	}

	// Convert DTO to entity
	return r.adapter.ToEntity(&dto)
}

// FindByUserID retrieves all meetings for a user with pagination
func (r *MeetingRepositoryImpl) FindByUserID(ctx context.Context, userID int64, limit, offset int) ([]*entities.Meeting, int, error) {
	// Get total count
	var total int
	countQuery := "SELECT COUNT(*) FROM meetings WHERE user_id = ?"
	err := r.db.QueryRow(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count meetings: %w", err)
	}

	// Get meetings
	query := `
		SELECT id, user_id, platform, meeting_id, meeting_url, bot_name,
		       bot_container_id, recording_session_id, status, recording_path,
		       recording_duration, error_message, created_at, updated_at
		FROM meetings
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query meetings: %w", err)
	}
	defer rows.Close()

	return r.scanMeetings(rows)
}

// FindActiveByUserID retrieves active meetings for a user
func (r *MeetingRepositoryImpl) FindActiveByUserID(ctx context.Context, userID int64) ([]*entities.Meeting, error) {
	query := `
		SELECT id, user_id, platform, meeting_id, meeting_url, bot_name,
		       bot_container_id, recording_session_id, status, recording_path,
		       recording_duration, error_message, created_at, updated_at
		FROM meetings
		WHERE user_id = ?
		AND status IN ('joining', 'active', 'recording')
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query active meetings: %w", err)
	}
	defer rows.Close()

	meetings, _, err := r.scanMeetings(rows)
	return meetings, err
}

// FindAllActive retrieves all active meetings across all users
func (r *MeetingRepositoryImpl) FindAllActive(ctx context.Context) ([]*entities.Meeting, error) {
	query := `
		SELECT id, user_id, platform, meeting_id, meeting_url, bot_name,
		       bot_container_id, recording_session_id, status, recording_path,
		       recording_duration, error_message, created_at, updated_at
		FROM meetings
		WHERE status IN ('joining', 'active', 'recording')
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query all active meetings: %w", err)
	}
	defer rows.Close()

	meetings, _, err := r.scanMeetings(rows)
	return meetings, err
}

// Update updates a meeting entity
func (r *MeetingRepositoryImpl) Update(ctx context.Context, meeting *entities.Meeting) error {
	// This is just an alias for Save since our Save method handles both insert and update
	return r.Save(ctx, meeting)
}

// Delete removes a meeting by ID
func (r *MeetingRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := "DELETE FROM meetings WHERE id = ?"
	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete meeting: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("meeting not found")
	}

	return nil
}

// scanMeetings is a helper to scan multiple meetings from rows
func (r *MeetingRepositoryImpl) scanMeetings(rows *sql.Rows) ([]*entities.Meeting, int, error) {
	var dtos []*types.Meeting
	for rows.Next() {
		var dto types.Meeting
		err := rows.Scan(
			&dto.ID,
			&dto.UserID,
			&dto.Platform,
			&dto.MeetingID,
			&dto.MeetingURL,
			&dto.BotName,
			&dto.BotContainerID,
			&dto.RecordingSessionID,
			&dto.Status,
			&dto.RecordingPath,
			&dto.RecordingDuration,
			&dto.ErrorMessage,
			&dto.CreatedAt,
			&dto.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan meeting: %w", err)
		}
		dtos = append(dtos, &dto)
	}

	// Convert DTOs to entities
	entities := make([]*entities.Meeting, len(dtos))
	for i, dto := range dtos {
		entity, err := r.adapter.ToEntity(dto)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to convert meeting to entity: %w", err)
		}
		entities[i] = entity
	}

	return entities, len(entities), nil
}
