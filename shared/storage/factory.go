package storage

import (
	"fmt"
	"os"

	"github.com/rs/zerolog/log"
)

// NewStorage creates a new storage instance based on configuration
func NewStorage(provider string) (Storage, error) {
	log.Info().Str("provider", provider).Msg("Creating storage instance")

	switch provider {
	case "supabase":
		cfg := Config{
			Provider:    "supabase",
			SupabaseURL: os.Getenv("SUPABASE_URL"),
			Bucket:      os.Getenv("SUPABASE_STORAGE_BUCKET"),
			Region:      os.Getenv("SUPABASE_STORAGE_REGION"),
			AccessKey:   os.Getenv("SUPABASE_STORAGE_ACCESS_KEY"),
			SecretKey:   os.Getenv("SUPABASE_STORAGE_SECRET_KEY"),
			Endpoint:    os.Getenv("SUPABASE_STORAGE_ENDPOINT"),
		}

		// Validate configuration
		if cfg.SupabaseURL == "" {
			return nil, fmt.Errorf("SUPABASE_URL is required")
		}
		if cfg.Bucket == "" {
			return nil, fmt.Errorf("SUPABASE_STORAGE_BUCKET is required")
		}
		if cfg.Endpoint == "" {
			return nil, fmt.Errorf("SUPABASE_STORAGE_ENDPOINT is required")
		}
		if cfg.AccessKey == "" {
			return nil, fmt.Errorf("SUPABASE_STORAGE_ACCESS_KEY is required")
		}
		if cfg.SecretKey == "" {
			return nil, fmt.Errorf("SUPABASE_STORAGE_SECRET_KEY is required")
		}

		return NewSupabaseStorage(cfg)

	case "local":
		// Local storage implementation (fallback)
		return nil, fmt.Errorf("local storage not implemented yet")

	default:
		return nil, fmt.Errorf("unknown storage provider: %s", provider)
	}
}
