package constants

import "time"

// =====================================================
// API CONFIGURATION
// =====================================================

const (
	// API Keys
	APIKeyHeader      = "X-API-Key"
	AdminAPIKeyHeader = "X-Admin-API-Key"
	APIKeyPrefix      = "vxa_live_"
	APIKeyLength      = 40 // Total length including prefix

	// Rate Limiting
	DefaultRateLimit       = 10               // requests per minute
	RateLimitWindow        = 1 * time.Minute
	AdminRateLimit         = 100              // requests per minute

	// Request Limits
	MaxRequestBodySize     = 10 * 1024 * 1024 // 10MB
	RequestTimeout         = 30 * time.Second
)

// =====================================================
// DATABASE CONFIGURATION
// =====================================================

const (
	// Connection Pools
	MaxOpenConnections     = 25
	MaxIdleConnections     = 5
	ConnectionMaxLifetime  = 5 * time.Minute
	ConnectionMaxIdleTime  = 10 * time.Minute

	// Query Timeouts
	DefaultQueryTimeout    = 10 * time.Second
	LongQueryTimeout       = 30 * time.Second
)

// =====================================================
// RECORDING CONFIGURATION
// =====================================================

const (
	// Chunk Settings
	ChunkDurationSeconds   = 10
	ChunkUploadTimeout     = 30 * time.Second
	MaxChunksPerRecording  = 3600 // 10 hours max (10s chunks)

	// Audio Settings
	DefaultAudioBitrate    = 128000 // 128 kbps
	AudioCodec             = "opus"
	AudioMimeType          = "audio/webm;codecs=opus"
	FinalRecordingFormat   = ".webm"

	// Bot Timeouts
	BotJoinTimeout         = 60 * time.Second  // Wait for admission
	BotStartTimeout        = 120 * time.Second // Browser startup
	BotShutdownTimeout     = 30 * time.Second
	BotHealthCheckInterval = 10 * time.Second
)

// =====================================================
// MEETING CONFIGURATION
// =====================================================

const (
	// Meeting URLs
	GoogleMeetBaseURL      = "https://meet.google.com/"
	TeamsBaseURL           = "https://teams.microsoft.com/"

	// Meeting ID Validation
	GoogleMeetIDMinLength  = 10
	GoogleMeetIDMaxLength  = 100
	TeamsIDMinLength       = 10
	TeamsIDMaxLength       = 200

	// Bot Names
	DefaultBotName         = "Newar Recorder"
	BotNameMaxLength       = 100
)

// =====================================================
// STORAGE CONFIGURATION
// =====================================================

const (
	// Local Storage Paths
	TempStoragePath        = "storage/recordings/temp"
	FinalStoragePath       = "storage/recordings/final"
	ChunkFilePattern       = "chunk_%05d.webm" // chunk_00000.webm

	// Supabase Storage
	SupabaseBucketName     = "recordings"
	TempFolderPrefix       = "temp"
	FinalFolderPrefix      = "final"

	// Storage Limits
	MaxRecordingSize       = 5 * 1024 * 1024 * 1024 // 5GB
	MaxChunkSize           = 50 * 1024 * 1024       // 50MB
)

// =====================================================
// REDIS CONFIGURATION
// =====================================================

const (
	// Channel Prefixes
	BotStatusChannel       = "bot:status:"     // bot:status:{container_id}
	BotCommandChannel      = "bot:command:"    // bot:command:{container_id}
	MeetingEventsChannel   = "meeting:events"  // Global events

	// Pub/Sub Timeouts
	RedisPublishTimeout    = 5 * time.Second
	RedisSubscribeTimeout  = 0 // No timeout for subscriptions

	// Key Expiration
	BotStatusTTL           = 24 * time.Hour
	RateLimitTTL           = 1 * time.Minute
)

// =====================================================
// DOCKER CONFIGURATION
// =====================================================

const (
	// Bot Container
	BotImageDefault        = "newar-recording-bot:latest"
	BotContainerPrefix     = "newar-bot-"
	BotNetworkName         = "newar-network"

	// Container Limits
	BotMemoryLimit         = 2 * 1024 * 1024 * 1024 // 2GB
	BotCPUQuota            = 100000                  // 1 CPU
	MaxContainerLogs       = 10 * 1024 * 1024        // 10MB

	// Container Lifecycle
	ContainerStartTimeout  = 60 * time.Second
	ContainerStopTimeout   = 30 * time.Second
	ContainerCleanupDelay  = 5 * time.Minute
)

// =====================================================
// LOGGING CONFIGURATION
// =====================================================

const (
	// Log Levels
	LogLevelDebug          = "debug"
	LogLevelInfo           = "info"
	LogLevelWarn           = "warn"
	LogLevelError          = "error"

	// Log Fields (standardized)
	LogFieldService        = "service"
	LogFieldUserID         = "user_id"
	LogFieldMeetingID      = "meeting_id"
	LogFieldContainerID    = "container_id"
	LogFieldPlatform       = "platform"
	LogFieldDuration       = "duration_ms"
	LogFieldError          = "error"
)

// =====================================================
// HTTP STATUS MESSAGES
// =====================================================

const (
	// Success Messages
	MsgUserCreated         = "User created successfully"
	MsgTokenGenerated      = "API token generated successfully"
	MsgRecordingStarted    = "Recording started successfully"
	MsgRecordingStopped    = "Recording stopped successfully"
	MsgRecordingCompleted  = "Recording completed"

	// Error Messages
	ErrInvalidAPIKey       = "Invalid API key"
	ErrMissingAPIKey       = "Missing API key"
	ErrUnauthorized        = "Unauthorized"
	ErrForbidden           = "Forbidden"
	ErrNotFound            = "Resource not found"
	ErrBadRequest          = "Bad request"
	ErrInternalServer      = "Internal server error"
	ErrServiceUnavailable  = "Service unavailable"

	// Validation Errors
	ErrInvalidPlatform     = "Invalid platform. Must be 'google_meet' or 'teams'"
	ErrInvalidMeetingID    = "Invalid meeting ID format"
	ErrMaxBotsReached      = "Maximum concurrent bots limit reached"
	ErrDuplicateRecording  = "Recording already exists for this meeting"
	ErrRecordingNotFound   = "Recording not found"
)

// =====================================================
// HEALTH CHECK
// =====================================================

const (
	HealthStatusHealthy    = "healthy"
	HealthStatusDegraded   = "degraded"
	HealthStatusUnhealthy  = "unhealthy"
)

// =====================================================
// PLATFORM-SPECIFIC SELECTORS (for recording-bot)
// =====================================================

// GoogleMeetSelectors holds CSS selectors for Google Meet
var GoogleMeetSelectors = map[string]string{
	"mic_button":     "button[aria-label*='microphone']",
	"camera_button":  "button[aria-label*='camera']",
	"join_button":    "button[aria-label*='Join']",
	"leave_button":   "button[aria-label*='Leave']",
	"admitted_indicator": "[data-self-name]",
}

// TeamsSelectors holds CSS selectors for Microsoft Teams
var TeamsSelectors = map[string]string{
	"mic_button":     "button[data-tid='toggle-mute']",
	"camera_button":  "button[data-tid='toggle-video']",
	"join_button":    "button[data-tid='prejoin-join-button']",
	"leave_button":   "button[data-tid='call-hangup']",
	"admitted_indicator": "[data-tid='meeting-stage']",
}
