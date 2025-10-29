package types

import "time"

// =====================================================
// USER TYPES
// =====================================================

// User represents a system user with API access
type User struct {
	ID                 int64     `json:"id" db:"id"`
	Email              string    `json:"email" db:"email" validate:"required,email"`
	Name               string    `json:"name" db:"name" validate:"required,min=2,max=255"`
	MaxConcurrentBots  int       `json:"max_concurrent_bots" db:"max_concurrent_bots" validate:"gte=1,lte=50"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time `json:"updated_at" db:"updated_at"`
	ActiveRecordings   int       `json:"active_recordings,omitempty" db:"-"` // Computed field
}

// CreateUserRequest is the request body for creating a user
type CreateUserRequest struct {
	Email             string `json:"email" validate:"required,email"`
	Name              string `json:"name" validate:"required,min=2,max=255"`
	MaxConcurrentBots int    `json:"max_concurrent_bots" validate:"gte=1,lte=50"`
}

// UpdateUserRequest is the request body for updating a user
type UpdateUserRequest struct {
	Name              *string `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	MaxConcurrentBots *int    `json:"max_concurrent_bots,omitempty" validate:"omitempty,gte=1,lte=50"`
}

// =====================================================
// API TOKEN TYPES
// =====================================================

// APIToken represents an API authentication token
type APIToken struct {
	ID        int64     `json:"id" db:"id"`
	UserID    int64     `json:"user_id" db:"user_id"`
	TokenHash string    `json:"-" db:"token_hash"` // Never expose hash
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// GenerateTokenResponse is returned when a new token is created
type GenerateTokenResponse struct {
	Token     string    `json:"token"` // Only returned once!
	CreatedAt time.Time `json:"created_at"`
}

// =====================================================
// MEETING TYPES
// =====================================================

// MeetingStatus represents the current state of a recording
type MeetingStatus string

const (
	StatusRequested  MeetingStatus = "requested"
	StatusJoining    MeetingStatus = "joining"
	StatusActive     MeetingStatus = "active"
	StatusRecording  MeetingStatus = "recording"
	StatusFinalizing MeetingStatus = "finalizing"
	StatusCompleted  MeetingStatus = "completed"
	StatusFailed     MeetingStatus = "failed"
)

// Platform represents supported meeting platforms
type Platform string

const (
	PlatformGoogleMeet Platform = "google_meet"
	PlatformTeams      Platform = "teams"
)

// Meeting represents a recording session
type Meeting struct {
	ID             int64         `json:"id" db:"id"`
	UserID         int64         `json:"user_id" db:"user_id"`
	Platform       Platform      `json:"platform" db:"platform"`
	MeetingID      string        `json:"meeting_id" db:"meeting_id"`
	BotContainerID *string       `json:"bot_container_id,omitempty" db:"bot_container_id"`
	Status         MeetingStatus `json:"status" db:"status"`
	MeetingURL     string        `json:"meeting_url" db:"meeting_url"`
	RecordingPath  *string       `json:"recording_path,omitempty" db:"recording_path"`
	RecordingURL   *string       `json:"recording_url,omitempty" db:"-"` // Computed
	StartedAt      *time.Time    `json:"started_at,omitempty" db:"started_at"`
	CompletedAt    *time.Time    `json:"completed_at,omitempty" db:"completed_at"`
	ErrorMessage   *string       `json:"error_message,omitempty" db:"error_message"`
	CreatedAt      time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at" db:"updated_at"`
}

// CreateRecordingRequest is the request body for starting a recording
type CreateRecordingRequest struct {
	Platform  Platform `json:"platform" validate:"required,oneof=google_meet teams"`
	MeetingID string   `json:"meeting_id" validate:"required,min=3,max=255"`
	BotName   string   `json:"bot_name,omitempty" validate:"omitempty,max=100"`
}

// UpdateMeetingStatusRequest is used internally to update meeting status
type UpdateMeetingStatusRequest struct {
	Status         MeetingStatus `json:"status" validate:"required"`
	BotContainerID *string       `json:"bot_container_id,omitempty"`
	ErrorMessage   *string       `json:"error_message,omitempty"`
	RecordingPath  *string       `json:"recording_path,omitempty"`
}

// =====================================================
// BOT MANAGER TYPES
// =====================================================

// SpawnBotRequest is sent to bot-manager to start a recording
type SpawnBotRequest struct {
	MeetingID  int64    `json:"meeting_id" validate:"required"`
	UserID     int64    `json:"user_id" validate:"required"`
	Platform   Platform `json:"platform" validate:"required"`
	MeetingURL string   `json:"meeting_url" validate:"required,url"`
	BotName    string   `json:"bot_name,omitempty"`
}

// SpawnBotResponse is returned when a bot is spawned
type SpawnBotResponse struct {
	ContainerID string `json:"container_id"`
	Status      string `json:"status"`
}

// BotStatusUpdate is published by bots to Redis
type BotStatusUpdate struct {
	ContainerID  string        `json:"container_id"`
	MeetingID    int64         `json:"meeting_id"`
	Status       MeetingStatus `json:"status"`
	ErrorMessage *string       `json:"error_message,omitempty"`
	ChunkCount   int           `json:"chunk_count,omitempty"`
	Timestamp    time.Time     `json:"timestamp"`
}

// BotCommand is sent to bots via Redis
type BotCommand struct {
	Command   string    `json:"command"` // "stop", "status"
	Timestamp time.Time `json:"timestamp"`
}

// =====================================================
// PAGINATION TYPES
// =====================================================

// PaginationParams holds common pagination parameters
type PaginationParams struct {
	Limit  int `query:"limit" validate:"gte=1,lte=100"`
	Offset int `query:"offset" validate:"gte=0"`
}

// PaginatedResponse wraps paginated data
type PaginatedResponse struct {
	Data   interface{} `json:"data"`
	Total  int64       `json:"total"`
	Limit  int         `json:"limit"`
	Offset int         `json:"offset"`
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

// ErrorResponse is the standard error response format
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// SuccessResponse is a generic success response
type SuccessResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// HealthResponse is returned by /health endpoints
type HealthResponse struct {
	Status       string            `json:"status"` // "healthy", "degraded", "unhealthy"
	Timestamp    time.Time         `json:"timestamp"`
	Dependencies map[string]string `json:"dependencies,omitempty"`
}

// =====================================================
// STORAGE TYPES
// =====================================================

// StorageProvider represents different storage backends
type StorageProvider string

const (
	StorageLocal    StorageProvider = "local"
	StorageSupabase StorageProvider = "supabase"
)

// ChunkMetadata holds information about recording chunks
type ChunkMetadata struct {
	Index     int       `json:"index"`
	Path      string    `json:"path"`
	Size      int64     `json:"size"`
	UploadedAt time.Time `json:"uploaded_at"`
}
