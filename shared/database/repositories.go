package database

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/newar/insights/shared/types"
)

// =====================================================
// USER REPOSITORY
// =====================================================

type UserRepository struct {
	db Database
}

func NewUserRepository(db Database) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, req types.CreateUserRequest) (*types.User, error) {
	query := `
		INSERT INTO users (email, name, max_concurrent_bots, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	now := time.Now()
	var id int64
	err := r.db.QueryRow(ctx, query, req.Email, req.Name, req.MaxConcurrentBots, now, now).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &types.User{
		ID:                id,
		Email:             req.Email,
		Name:              req.Name,
		MaxConcurrentBots: req.MaxConcurrentBots,
		CreatedAt:         now,
		UpdatedAt:         now,
	}, nil
}

// CreateOld is the old SQLite version (deprecated)
func (r *UserRepository) CreateOld(ctx context.Context, req types.CreateUserRequest) (*types.User, error) {
	query := `
		INSERT INTO users (email, name, max_concurrent_bots, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	now := time.Now()
	var id int64
	err := r.db.QueryRow(ctx, query, req.Email, req.Name, req.MaxConcurrentBots, now, now).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &types.User{
		ID:                int64(id),
		Email:             req.Email,
		Name:              req.Name,
		MaxConcurrentBots: req.MaxConcurrentBots,
		CreatedAt:         now,
		UpdatedAt:         now,
	}, nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*types.User, error) {
	query := `SELECT id, email, name, max_concurrent_bots, created_at, updated_at FROM users WHERE id = $1`

	var user types.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.MaxConcurrentBots,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*types.User, error) {
	query := `SELECT id, email, name, max_concurrent_bots, created_at, updated_at FROM users WHERE email = $1`

	var user types.User
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.MaxConcurrentBots,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

// List retrieves paginated users
func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]*types.User, int64, error) {
	// Get total count
	var total int64
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Get paginated users
	query := `
		SELECT id, email, name, max_concurrent_bots, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	users := []*types.User{}
	for rows.Next() {
		var user types.User
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Name,
			&user.MaxConcurrentBots,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, &user)
	}

	return users, total, nil
}

// Delete deletes a user by ID
func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.Exec(ctx, "DELETE FROM users WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if affected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// =====================================================
// API TOKEN REPOSITORY
// =====================================================

type TokenRepository struct {
	db Database
}

func NewTokenRepository(db Database) *TokenRepository {
	return &TokenRepository{db: db}
}

// HashToken hashes a token using SHA-256
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// Create creates a new API token
func (r *TokenRepository) Create(ctx context.Context, userID int64, token string) (*types.APIToken, error) {
	tokenHash := HashToken(token)
	now := time.Now()

	query := `INSERT INTO api_tokens (user_id, token_hash, created_at) VALUES ($1, $2, $3) RETURNING id`

	var id int64
	err := r.db.QueryRow(ctx, query, userID, tokenHash, now).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create token: %w", err)
	}

	return &types.APIToken{
		ID:        int64(id),
		UserID:    userID,
		TokenHash: tokenHash,
		CreatedAt: now,
	}, nil
}

// GetUserIDByToken retrieves user ID by token hash
func (r *TokenRepository) GetUserIDByToken(ctx context.Context, token string) (int64, error) {
	tokenHash := HashToken(token)

	var userID int64
	err := r.db.QueryRow(ctx, "SELECT user_id FROM api_tokens WHERE token_hash = $1", tokenHash).Scan(&userID)

	if err == sql.ErrNoRows {
		return 0, fmt.Errorf("invalid token")
	}
	if err != nil {
		return 0, fmt.Errorf("failed to get user ID: %w", err)
	}

	return userID, nil
}

// ValidateToken validates a token hash and returns the associated user
func (r *TokenRepository) ValidateToken(ctx context.Context, tokenHash string) (*types.User, error) {
	userID, err := r.GetUserIDByToken(ctx, tokenHash)
	if err != nil {
		return nil, err
	}

	// Get user by ID
	userRepo := NewUserRepository(r.db)
	return userRepo.GetByID(ctx, userID)
}

// DeleteByUserID deletes all tokens for a user
func (r *TokenRepository) DeleteByUserID(ctx context.Context, userID int64) error {
	_, err := r.db.Exec(ctx, "DELETE FROM api_tokens WHERE user_id = $1", userID)
	if err != nil {
		return fmt.Errorf("failed to delete tokens: %w", err)
	}
	return nil
}

// =====================================================
// MEETING REPOSITORY
// =====================================================

type MeetingRepository struct {
	db Database
}

func NewMeetingRepository(db Database) *MeetingRepository {
	return &MeetingRepository{db: db}
}

// Create creates a new meeting
func (r *MeetingRepository) Create(ctx context.Context, userID int64, req types.CreateRecordingRequest, meetingURL string) (*types.Meeting, error) {
	now := time.Now()
	query := `
		INSERT INTO meetings (user_id, platform, meeting_id, meeting_url, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`

	var id int64
	err := r.db.QueryRow(ctx, query, userID, req.Platform, req.MeetingID, meetingURL, types.StatusRequested, now, now).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create meeting: %w", err)
	}

	return &types.Meeting{
		ID:         int64(id),
		UserID:     userID,
		Platform:   req.Platform,
		MeetingID:  req.MeetingID,
		MeetingURL: meetingURL,
		Status:     types.StatusRequested,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

// GetByID retrieves a meeting by ID
func (r *MeetingRepository) GetByID(ctx context.Context, id int64) (*types.Meeting, error) {
	query := `
		SELECT id, user_id, platform, meeting_id, bot_container_id, status, meeting_url,
		       recording_path, started_at, completed_at, error_message, created_at, updated_at
		FROM meetings WHERE id = $1
	`

	var meeting types.Meeting
	err := r.db.QueryRow(ctx, query, id).Scan(
		&meeting.ID,
		&meeting.UserID,
		&meeting.Platform,
		&meeting.MeetingID,
		&meeting.BotContainerID,
		&meeting.Status,
		&meeting.MeetingURL,
		&meeting.RecordingPath,
		&meeting.StartedAt,
		&meeting.CompletedAt,
		&meeting.ErrorMessage,
		&meeting.CreatedAt,
		&meeting.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("meeting not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get meeting: %w", err)
	}

	return &meeting, nil
}

// Get retrieves a meeting by filter
func (r *MeetingRepository) Get(ctx context.Context, filter types.MeetingFilter) (*types.Meeting, error) {
	query := `
		SELECT id, user_id, platform, meeting_id, bot_container_id, recording_session_id, status, meeting_url,
		       recording_path, started_at, completed_at, error_message, created_at, updated_at
		FROM meetings WHERE 1=1
	`
	args := []interface{}{}
	paramIndex := 1

	if filter.UserID != nil {
		query += fmt.Sprintf(" AND user_id = $%d", paramIndex)
		args = append(args, *filter.UserID)
		paramIndex++
	}
	if filter.Platform != nil {
		query += fmt.Sprintf(" AND platform = $%d", paramIndex)
		args = append(args, *filter.Platform)
		paramIndex++
	}
	if filter.MeetingID != nil {
		query += fmt.Sprintf(" AND meeting_id = $%d", paramIndex)
		args = append(args, *filter.MeetingID)
		paramIndex++
	}
	if filter.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", paramIndex)
		args = append(args, *filter.Status)
		paramIndex++
	}
	if filter.BotContainerID != nil {
		query += fmt.Sprintf(" AND bot_container_id = $%d", paramIndex)
		args = append(args, *filter.BotContainerID)
		paramIndex++
	}
	if filter.RecordingSessionID != nil {
		query += fmt.Sprintf(" AND recording_session_id = $%d", paramIndex)
		args = append(args, *filter.RecordingSessionID)
		paramIndex++
	}

	query += " LIMIT 1"

	var meeting types.Meeting
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&meeting.ID,
		&meeting.UserID,
		&meeting.Platform,
		&meeting.MeetingID,
		&meeting.BotContainerID,
		&meeting.RecordingSessionID,
		&meeting.Status,
		&meeting.MeetingURL,
		&meeting.RecordingPath,
		&meeting.StartedAt,
		&meeting.CompletedAt,
		&meeting.ErrorMessage,
		&meeting.CreatedAt,
		&meeting.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("meeting not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get meeting: %w", err)
	}

	return &meeting, nil
}

// GetByPlatformAndMeetingID retrieves a meeting by platform and meeting ID
func (r *MeetingRepository) GetByPlatformAndMeetingID(ctx context.Context, userID int64, platform types.Platform, meetingID string) (*types.Meeting, error) {
	query := `
		SELECT id, user_id, platform, meeting_id, bot_container_id, status, meeting_url,
		       recording_path, started_at, completed_at, error_message, created_at, updated_at
		FROM meetings WHERE user_id = $1 AND platform = $2 AND meeting_id = $3
	`

	var meeting types.Meeting
	err := r.db.QueryRow(ctx, query, userID, platform, meetingID).Scan(
		&meeting.ID,
		&meeting.UserID,
		&meeting.Platform,
		&meeting.MeetingID,
		&meeting.BotContainerID,
		&meeting.Status,
		&meeting.MeetingURL,
		&meeting.RecordingPath,
		&meeting.StartedAt,
		&meeting.CompletedAt,
		&meeting.ErrorMessage,
		&meeting.CreatedAt,
		&meeting.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("meeting not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get meeting: %w", err)
	}

	return &meeting, nil
}

// UpdateStatus updates a meeting status
func (r *MeetingRepository) UpdateStatus(ctx context.Context, id int64, status types.MeetingStatus, recordingPath *string, errorMsg *string, recordingDuration *int) error {
	query := `
		UPDATE meetings
		SET status = $1, recording_path = COALESCE($2, recording_path),
		    error_message = $3, recording_duration = COALESCE($4, recording_duration), updated_at = $5
		WHERE id = $6
	`

	// Set started_at when status changes to active
	if status == types.StatusActive {
		now := time.Now()
		query = `
			UPDATE meetings
			SET status = $1, started_at = $2, updated_at = $3
			WHERE id = $4
		`
		_, err := r.db.Exec(ctx, query, status, now, now, id)
		return err
	}

	// Set completed_at when status changes to completed or failed
	if status == types.StatusCompleted || status == types.StatusFailed {
		now := time.Now()
		query = `
			UPDATE meetings
			SET status = $1, error_message = $2, recording_path = COALESCE($3, recording_path),
			    recording_duration = COALESCE($4, recording_duration), completed_at = $5, updated_at = $6
			WHERE id = $7
		`
		_, err := r.db.Exec(ctx, query, status, errorMsg, recordingPath, recordingDuration, now, now, id)
		return err
	}

	_, err := r.db.Exec(ctx, query, status, recordingPath, errorMsg, recordingDuration, time.Now(), id)
	return err
}

// List retrieves paginated meetings for a user
func (r *MeetingRepository) List(ctx context.Context, userID int64, limit, offset int) ([]types.Meeting, int64, error) {
	// Get total count
	var total int64
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM meetings WHERE user_id = $1", userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count meetings: %w", err)
	}

	// Get paginated meetings
	query := `
		SELECT id, user_id, platform, meeting_id, bot_container_id, status, meeting_url,
		       recording_path, started_at, completed_at, error_message, created_at, updated_at
		FROM meetings
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list meetings: %w", err)
	}
	defer rows.Close()

	meetings := []types.Meeting{}
	for rows.Next() {
		var meeting types.Meeting
		err := rows.Scan(
			&meeting.ID,
			&meeting.UserID,
			&meeting.Platform,
			&meeting.MeetingID,
			&meeting.BotContainerID,
			&meeting.Status,
			&meeting.MeetingURL,
			&meeting.RecordingPath,
			&meeting.StartedAt,
			&meeting.CompletedAt,
			&meeting.ErrorMessage,
			&meeting.CreatedAt,
			&meeting.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan meeting: %w", err)
		}
		meetings = append(meetings, meeting)
	}

	return meetings, total, nil
}

// CountActiveByUser counts active recordings for a user
func (r *MeetingRepository) CountActiveByUser(ctx context.Context, userID int64) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM meetings
		WHERE user_id = $1 AND status IN ($2, $3, $4)
	`, userID, types.StatusRequested, types.StatusJoining, types.StatusActive).Scan(&count)

	if err != nil {
		return 0, fmt.Errorf("failed to count active meetings: %w", err)
	}

	return count, nil
}

// Update updates a meeting with flexible filter and update params
func (r *MeetingRepository) Update(ctx context.Context, filter types.MeetingFilter, update types.MeetingUpdate) error {
	query := "UPDATE meetings SET updated_at = $1"
	args := []interface{}{time.Now()}
	paramIndex := 2

	// Build SET clause
	if update.Status != nil {
		query += fmt.Sprintf(", status = $%d", paramIndex)
		args = append(args, *update.Status)
		paramIndex++
	}
	if update.BotContainerID != nil {
		query += fmt.Sprintf(", bot_container_id = $%d", paramIndex)
		args = append(args, *update.BotContainerID)
		paramIndex++
	}
	if update.RecordingPath != nil {
		query += fmt.Sprintf(", recording_path = $%d", paramIndex)
		args = append(args, *update.RecordingPath)
		paramIndex++
	}
	if update.RecordingDuration != nil {
		query += fmt.Sprintf(", recording_duration = $%d", paramIndex)
		args = append(args, *update.RecordingDuration)
		paramIndex++
	}
	if update.ErrorMessage != nil {
		query += fmt.Sprintf(", error_message = $%d", paramIndex)
		args = append(args, *update.ErrorMessage)
		paramIndex++
	}
	if update.StartedAt != nil {
		query += fmt.Sprintf(", started_at = $%d", paramIndex)
		args = append(args, *update.StartedAt)
		paramIndex++
	}
	if update.CompletedAt != nil {
		query += fmt.Sprintf(", completed_at = $%d", paramIndex)
		args = append(args, *update.CompletedAt)
		paramIndex++
	}

	// Build WHERE clause
	query += " WHERE 1=1"
	if filter.UserID != nil {
		query += fmt.Sprintf(" AND user_id = $%d", paramIndex)
		args = append(args, *filter.UserID)
		paramIndex++
	}
	if filter.Platform != nil {
		query += fmt.Sprintf(" AND platform = $%d", paramIndex)
		args = append(args, *filter.Platform)
		paramIndex++
	}
	if filter.MeetingID != nil {
		query += fmt.Sprintf(" AND meeting_id = $%d", paramIndex)
		args = append(args, *filter.MeetingID)
		paramIndex++
	}
	if filter.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", paramIndex)
		args = append(args, *filter.Status)
		paramIndex++
	}
	if filter.BotContainerID != nil {
		query += fmt.Sprintf(" AND bot_container_id = $%d", paramIndex)
		args = append(args, *filter.BotContainerID)
		paramIndex++
	}
	if filter.RecordingSessionID != nil {
		query += fmt.Sprintf(" AND recording_session_id = $%d", paramIndex)
		args = append(args, *filter.RecordingSessionID)
		paramIndex++
	}

	_, err := r.db.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update meeting: %w", err)
	}

	return nil
}

// GetActiveRecordings retrieves all recordings in active states
func (r *MeetingRepository) GetActiveRecordings(ctx context.Context) ([]*types.Meeting, error) {
	query := `
		SELECT id, user_id, platform, meeting_id, bot_container_id, recording_session_id, status, meeting_url,
		       recording_path, started_at, completed_at, error_message, created_at, updated_at
		FROM meetings
		WHERE status IN ($1, $2, $3, $4)
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(ctx, query, types.StatusRequested, types.StatusJoining, types.StatusActive, types.StatusRecording)
	if err != nil {
		return nil, fmt.Errorf("failed to get active recordings: %w", err)
	}
	defer rows.Close()

	meetings := []*types.Meeting{}
	for rows.Next() {
		var meeting types.Meeting
		err := rows.Scan(
			&meeting.ID,
			&meeting.UserID,
			&meeting.Platform,
			&meeting.MeetingID,
			&meeting.BotContainerID,
			&meeting.RecordingSessionID,
			&meeting.Status,
			&meeting.MeetingURL,
			&meeting.RecordingPath,
			&meeting.StartedAt,
			&meeting.CompletedAt,
			&meeting.ErrorMessage,
			&meeting.CreatedAt,
			&meeting.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan meeting: %w", err)
		}
		meetings = append(meetings, &meeting)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return meetings, nil
}
