package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/rs/zerolog/log"
)

// SupabaseStorage implements Storage interface using Supabase Storage (S3-compatible)
type SupabaseStorage struct {
	client      *s3.S3
	bucket      string
	supabaseURL string
}

// NewSupabaseStorage creates a new Supabase storage client
func NewSupabaseStorage(cfg Config) (*SupabaseStorage, error) {
	log.Info().
		Str("endpoint", cfg.Endpoint).
		Str("bucket", cfg.Bucket).
		Str("region", cfg.Region).
		Msg("Initializing Supabase Storage")

	// Create AWS session for S3-compatible Supabase Storage
	sess, err := session.NewSession(&aws.Config{
		Region:           aws.String(cfg.Region),
		Endpoint:         aws.String(cfg.Endpoint),
		Credentials:      credentials.NewStaticCredentials(cfg.AccessKey, cfg.SecretKey, ""),
		S3ForcePathStyle: aws.Bool(true), // Required for S3-compatible services
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	client := s3.New(sess)

	// Verify bucket exists
	_, err = client.HeadBucket(&s3.HeadBucketInput{
		Bucket: aws.String(cfg.Bucket),
	})
	if err != nil {
		log.Warn().
			Err(err).
			Str("bucket", cfg.Bucket).
			Msg("Bucket may not exist or is not accessible - will continue anyway")
	}

	log.Info().Msg("Supabase Storage initialized successfully")

	return &SupabaseStorage{
		client:      client,
		bucket:      cfg.Bucket,
		supabaseURL: cfg.SupabaseURL,
	}, nil
}

// Upload uploads a file to Supabase Storage
func (s *SupabaseStorage) Upload(ctx context.Context, path string, reader io.Reader, contentType string) (string, error) {
	log.Info().
		Str("path", path).
		Str("content_type", contentType).
		Msg("Uploading file to Supabase Storage")

	// Read all data from reader
	data, err := io.ReadAll(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read file data: %w", err)
	}

	log.Info().
		Int("size_bytes", len(data)).
		Str("path", path).
		Msg("File data read, uploading to S3")

	// Upload to S3
	_, err = s.client.PutObjectWithContext(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(path),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
		ACL:         aws.String("public-read"), // Make file publicly accessible
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to Supabase Storage: %w", err)
	}

	publicURL := s.GetPublicURL(path)

	log.Info().
		Str("path", path).
		Str("url", publicURL).
		Int("size_bytes", len(data)).
		Msg("File uploaded successfully to Supabase Storage")

	return publicURL, nil
}

// Download downloads a file from Supabase Storage
func (s *SupabaseStorage) Download(ctx context.Context, path string) (io.ReadCloser, error) {
	log.Info().
		Str("path", path).
		Msg("Downloading file from Supabase Storage")

	result, err := s.client.GetObjectWithContext(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to download from Supabase Storage: %w", err)
	}

	return result.Body, nil
}

// Delete deletes a file from Supabase Storage
func (s *SupabaseStorage) Delete(ctx context.Context, path string) error {
	log.Info().
		Str("path", path).
		Msg("Deleting file from Supabase Storage")

	_, err := s.client.DeleteObjectWithContext(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	})
	if err != nil {
		return fmt.Errorf("failed to delete from Supabase Storage: %w", err)
	}

	log.Info().Str("path", path).Msg("File deleted successfully")
	return nil
}

// GetPublicURL returns the public URL for a file in Supabase Storage
func (s *SupabaseStorage) GetPublicURL(path string) string {
	// Supabase Storage public URL format:
	// https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.supabaseURL, s.bucket, path)
}

// Exists checks if a file exists in Supabase Storage
func (s *SupabaseStorage) Exists(ctx context.Context, path string) (bool, error) {
	_, err := s.client.HeadObjectWithContext(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(path),
	})
	if err != nil {
		// Check if error is "not found"
		if _, ok := err.(interface{ StatusCode() int }); ok {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
