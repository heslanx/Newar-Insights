package orchestrator

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/types"
)

// DockerOrchestrator manages Docker container lifecycle for recording bots
type DockerOrchestrator struct {
	client  *client.Client
	botImage string
	redisURL string
	storageType string
	storagePath string
}

// NewDockerOrchestrator creates a new Docker orchestrator
func NewDockerOrchestrator(botImage, redisURL, storageType, storagePath string) (*DockerOrchestrator, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	log.Info().Str("bot_image", botImage).Msg("Docker orchestrator initialized")

	return &DockerOrchestrator{
		client:      cli,
		botImage:    botImage,
		redisURL:    redisURL,
		storageType: storageType,
		storagePath: storagePath,
	}, nil
}

// SpawnBot creates and starts a new recording bot container
func (o *DockerOrchestrator) SpawnBot(ctx context.Context, meeting *types.Meeting, user *types.User) error {
	containerName := fmt.Sprintf("%s%d-%d", constants.BotContainerPrefix, meeting.ID, time.Now().Unix())

	log.Info().
		Int64("meeting_id", meeting.ID).
		Str("container_name", containerName).
		Msg("Spawning recording bot container")

	botName := "Newar Bot"
	if meeting.BotName != nil {
		botName = *meeting.BotName
	}

	// Container configuration
	config := &container.Config{
		Image: o.botImage,
		Env: []string{
			fmt.Sprintf("MEETING_ID=%d", meeting.ID),
			fmt.Sprintf("USER_ID=%d", user.ID),
			fmt.Sprintf("PLATFORM=%s", meeting.Platform),
			fmt.Sprintf("MEETING_URL=%s", meeting.MeetingURL),
			fmt.Sprintf("BOT_NAME=%s", botName),
			fmt.Sprintf("REDIS_URL=%s", o.redisURL),
			fmt.Sprintf("STORAGE_TYPE=%s", o.storageType),
			fmt.Sprintf("STORAGE_PATH=%s", o.storagePath),
			fmt.Sprintf("CHUNK_DURATION=%d", constants.ChunkDurationSeconds),
			fmt.Sprintf("AUDIO_BITRATE=%d", constants.DefaultAudioBitrate),
		},
		Labels: map[string]string{
			"newar.meeting_id": fmt.Sprintf("%d", meeting.ID),
			"newar.user_id":    fmt.Sprintf("%d", user.ID),
			"newar.platform":   string(meeting.Platform),
		},
	}

	hostConfig := &container.HostConfig{
		AutoRemove: false, // We'll remove manually after finalization
		Resources: container.Resources{
			Memory:   constants.BotMemoryLimit,
			NanoCPUs: 1e9, // 1 CPU = 1,000,000,000 NanoCPUs
		},
		NetworkMode: container.NetworkMode(constants.BotNetworkName),
	}

	// Create container
	resp, err := o.client.ContainerCreate(ctx, config, hostConfig, nil, nil, containerName)
	if err != nil {
		return fmt.Errorf("failed to create container: %w", err)
	}

	containerID := resp.ID

	log.Info().
		Str("container_id", containerID).
		Str("container_name", containerName).
		Msg("Container created")

	// Start container
	if err := o.client.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}

	log.Info().
		Str("container_id", containerID).
		Msg("Container started successfully")

	return nil
}

// StopBot stops a running bot container
func (o *DockerOrchestrator) StopBot(ctx context.Context, containerID string) error {
	log.Info().Str("container_id", containerID).Msg("Stopping bot container")

	timeout := int(constants.ContainerStopTimeout.Seconds())
	stopOptions := container.StopOptions{
		Timeout: &timeout,
	}

	if err := o.client.ContainerStop(ctx, containerID, stopOptions); err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}

	log.Info().Str("container_id", containerID).Msg("Container stopped")
	return nil
}

// RemoveBot removes a bot container
func (o *DockerOrchestrator) RemoveBot(ctx context.Context, containerID string) error {
	log.Info().Str("container_id", containerID).Msg("Removing bot container")

	if err := o.client.ContainerRemove(ctx, containerID, container.RemoveOptions{
		Force: true,
	}); err != nil {
		return fmt.Errorf("failed to remove container: %w", err)
	}

	log.Info().Str("container_id", containerID).Msg("Container removed")
	return nil
}

// GetContainerLogs retrieves logs from a container
func (o *DockerOrchestrator) GetContainerLogs(ctx context.Context, containerID string, tail int) (string, error) {
	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       fmt.Sprintf("%d", tail),
	}

	reader, err := o.client.ContainerLogs(ctx, containerID, options)
	if err != nil {
		return "", fmt.Errorf("failed to get container logs: %w", err)
	}
	defer reader.Close()

	logs, err := io.ReadAll(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read logs: %w", err)
	}

	return string(logs), nil
}

// GetBotStatus retrieves the current status of a bot
func (o *DockerOrchestrator) GetBotStatus(ctx context.Context, sessionID string) (*types.BotStatusUpdate, error) {
	// This is a stub implementation - in a real scenario, you'd query the bot's status
	// For now, we return nil to indicate the method exists
	return nil, fmt.Errorf("GetBotStatus not implemented - status should be retrieved via Redis")
}

// Close closes the Docker client
func (o *DockerOrchestrator) Close() error {
	return o.client.Close()
}
