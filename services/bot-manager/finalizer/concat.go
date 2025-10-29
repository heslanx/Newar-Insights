package finalizer

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
)

// Finalizer handles recording finalization (chunk concatenation)
type Finalizer struct {
	storagePath string
}

// NewFinalizer creates a new finalizer
func NewFinalizer(storagePath string) *Finalizer {
	return &Finalizer{
		storagePath: storagePath,
	}
}

// FinalizeRecording concatenates audio chunks into a single file
func (f *Finalizer) FinalizeRecording(ctx context.Context, meetingID int64, containerID string) (string, error) {
	log.Info().
		Int64("meeting_id", meetingID).
		Str("container_id", containerID).
		Msg("Starting recording finalization")

	start := time.Now()

	// Paths
	tempDir := filepath.Join(f.storagePath, constants.TempFolderPrefix, fmt.Sprintf("meeting_%d", meetingID))
	finalDir := filepath.Join(f.storagePath, constants.FinalFolderPrefix)
	finalFileName := fmt.Sprintf("meeting_%d_%s.webm", meetingID, time.Now().Format("20060102_150405"))
	finalPath := filepath.Join(finalDir, finalFileName)

	// Check if temp directory exists
	if _, err := os.Stat(tempDir); os.IsNotExist(err) {
		return "", fmt.Errorf("temp directory not found: %s", tempDir)
	}

	// List chunk files
	chunks, err := f.listChunkFiles(tempDir)
	if err != nil {
		return "", fmt.Errorf("failed to list chunks: %w", err)
	}

	if len(chunks) == 0 {
		return "", fmt.Errorf("no chunks found in %s", tempDir)
	}

	log.Info().
		Int64("meeting_id", meetingID).
		Int("chunk_count", len(chunks)).
		Msg("Found chunks to concatenate")

	// Ensure final directory exists
	if err := os.MkdirAll(finalDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create final directory: %w", err)
	}

	// Concatenate chunks using FFmpeg concat protocol
	if err := f.concatenateChunks(ctx, chunks, finalPath); err != nil {
		return "", fmt.Errorf("failed to concatenate chunks: %w", err)
	}

	// Verify final file exists
	fileInfo, err := os.Stat(finalPath)
	if err != nil {
		return "", fmt.Errorf("final file not found after concatenation: %w", err)
	}

	log.Info().
		Int64("meeting_id", meetingID).
		Str("final_path", finalPath).
		Int64("file_size_bytes", fileInfo.Size()).
		Int64("duration_ms", time.Since(start).Milliseconds()).
		Msg("Recording finalized successfully")

	// Clean up temp chunks
	go func() {
		time.Sleep(5 * time.Second) // Wait a bit before cleanup
		if err := os.RemoveAll(tempDir); err != nil {
			log.Warn().Err(err).Str("temp_dir", tempDir).Msg("Failed to clean up temp directory")
		} else {
			log.Info().Str("temp_dir", tempDir).Msg("Temp chunks cleaned up")
		}
	}()

	// Return relative path for database storage
	relativePath := filepath.Join(constants.FinalFolderPrefix, finalFileName)
	return relativePath, nil
}

// listChunkFiles lists and sorts chunk files
func (f *Finalizer) listChunkFiles(dir string) ([]string, error) {
	files, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	chunks := []string{}
	for _, file := range files {
		if file.IsDir() {
			continue
		}

		// Filter for .webm files
		if filepath.Ext(file.Name()) == ".webm" {
			chunks = append(chunks, filepath.Join(dir, file.Name()))
		}
	}

	// Sort chunks by name (chunk_00000.webm, chunk_00001.webm, etc.)
	sort.Strings(chunks)

	return chunks, nil
}

// concatenateChunks uses FFmpeg concat protocol to merge chunks
func (f *Finalizer) concatenateChunks(ctx context.Context, chunks []string, outputPath string) error {
	// Build concat input string: "concat:chunk_00000.webm|chunk_00001.webm|..."
	concatInput := "concat:"
	for i, chunk := range chunks {
		if i > 0 {
			concatInput += "|"
		}
		concatInput += chunk
	}

	log.Debug().
		Str("concat_input", concatInput[:min(100, len(concatInput))]+"...").
		Str("output", outputPath).
		Msg("Running FFmpeg concatenation")

	// Run FFmpeg with concat protocol
	// -i "concat:file1|file2|..." : Input using concat protocol
	// -c copy : Copy streams without re-encoding (fast)
	// -y : Overwrite output file
	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-i", concatInput,
		"-c", "copy",
		"-y",
		outputPath,
	)

	// Capture output for debugging
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Error().
			Err(err).
			Str("ffmpeg_output", string(output)).
			Msg("FFmpeg concatenation failed")
		return fmt.Errorf("ffmpeg failed: %w", err)
	}

	log.Debug().
		Str("ffmpeg_output", string(output)).
		Msg("FFmpeg concatenation completed")

	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
