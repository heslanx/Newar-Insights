package config

import (
	"context"
	"os"
	"strconv"
	"time"

	"github.com/newar/insights/shared/database"
	"github.com/newar/insights/shared/redis"
)

// Config holds all application configuration
type Config struct {
	Server        ServerConfig
	Database      database.Config
	Redis         redis.Config
	Logging       LoggingConfig
	Observability ObservabilityConfig
	Features      FeaturesConfig
	RateLimit     RateLimitConfig
}

// ServerConfig holds HTTP server configuration
type ServerConfig struct {
	Port               int
	Timeout            int
	CORSAllowedOrigins string
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level  string
	Format string
	Output string
}

// ObservabilityConfig holds observability configuration
type ObservabilityConfig struct {
	JaegerEndpoint string
}

// FeaturesConfig holds feature flags
type FeaturesConfig struct {
	EnableCORS bool
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	RequestsPerMinute int
}

// Load loads configuration from environment variables
func Load(ctx context.Context, configPath string) (*Config, error) {
	// Parse port
	port, err := strconv.Atoi(getEnv("PORT", "8080"))
	if err != nil {
		port = 8080
	}

	// Parse timeout
	timeout, err := strconv.Atoi(getEnv("TIMEOUT_SECONDS", "30"))
	if err != nil {
		timeout = 30
	}

	// Parse rate limit
	rateLimit, err := strconv.Atoi(getEnv("API_GATEWAY_RATE_LIMIT", "10"))
	if err != nil {
		rateLimit = 10
	}

	return &Config{
		Server: ServerConfig{
			Port:               port,
			Timeout:            timeout,
			CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),
		},
		Database: database.Config{
			SupabaseURL:  getEnv("SUPABASE_URL", ""),
			SupabaseKey:  getEnv("SUPABASE_SERVICE_KEY", getEnv("SUPABASE_KEY", "")),
			MaxOpenConns: 25,
			MaxIdleConns: 5,
			ConnMaxLife:  5 * time.Minute,
			ConnMaxIdle:  10 * time.Minute,
		},
		Redis: redis.Config{
			URL: getEnv("REDIS_URL", "redis://localhost:6379"),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "console"),
			Output: getEnv("LOG_OUTPUT", "stdout"),
		},
		Observability: ObservabilityConfig{
			JaegerEndpoint: getEnv("JAEGER_ENDPOINT", ""),
		},
		Features: FeaturesConfig{
			EnableCORS: getEnv("ENABLE_CORS", "true") == "true",
		},
		RateLimit: RateLimitConfig{
			RequestsPerMinute: rateLimit,
		},
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
