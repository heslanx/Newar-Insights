package storage

import (
	"context"
	"io"
)

// Storage defines the interface for file storage operations
type Storage interface {
	// Upload uploads a file to storage
	Upload(ctx context.Context, path string, reader io.Reader, contentType string) (string, error)

	// Download downloads a file from storage
	Download(ctx context.Context, path string) (io.ReadCloser, error)

	// Delete deletes a file from storage
	Delete(ctx context.Context, path string) error

	// GetPublicURL returns the public URL for a file
	GetPublicURL(path string) string

	// Exists checks if a file exists in storage
	Exists(ctx context.Context, path string) (bool, error)
}

// Config holds storage configuration
type Config struct {
	Provider      string // "supabase" or "local"
	SupabaseURL   string
	Bucket        string
	Region        string
	AccessKey     string
	SecretKey     string
	Endpoint      string
	LocalBasePath string
}
