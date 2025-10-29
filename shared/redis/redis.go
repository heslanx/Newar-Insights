package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/newar/insights/shared/constants"
	"github.com/newar/insights/shared/types"
)

// Client wraps the Redis client with helper methods
type Client struct {
	rdb *redis.Client
}

// Config holds Redis configuration
type Config struct {
	URL string // Redis connection URL (e.g., redis://localhost:6379)
}

// NewClient creates a new Redis client
func NewClient(cfg Config) (*Client, error) {
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	rdb := redis.NewClient(opts)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Info().Str("url", cfg.URL).Msg("Connected to Redis")

	return &Client{rdb: rdb}, nil
}

// Close closes the Redis connection
func (c *Client) Close() error {
	log.Info().Msg("Closing Redis connection")
	return c.rdb.Close()
}

// Ping checks if Redis is reachable
func (c *Client) Ping(ctx context.Context) error {
	return c.rdb.Ping(ctx).Err()
}

// =====================================================
// BOT STATUS UPDATES
// =====================================================

// PublishBotStatus publishes a bot status update to Redis
func (c *Client) PublishBotStatus(ctx context.Context, status types.BotStatusUpdate) error {
	channel := constants.BotStatusChannel + status.ContainerID

	data, err := json.Marshal(status)
	if err != nil {
		return fmt.Errorf("failed to marshal bot status: %w", err)
	}

	pubCtx, cancel := context.WithTimeout(ctx, constants.RedisPublishTimeout)
	defer cancel()

	err = c.rdb.Publish(pubCtx, channel, data).Err()
	if err != nil {
		return fmt.Errorf("failed to publish bot status: %w", err)
	}

	log.Debug().
		Str("container_id", status.ContainerID).
		Str("status", string(status.Status)).
		Str("channel", channel).
		Msg("Published bot status update")

	return nil
}

// SubscribeBotStatus subscribes to bot status updates for a specific container
func (c *Client) SubscribeBotStatus(ctx context.Context, containerID string, handler func(types.BotStatusUpdate)) error {
	channel := constants.BotStatusChannel + containerID

	pubsub := c.rdb.Subscribe(ctx, channel)
	defer pubsub.Close()

	log.Info().Str("channel", channel).Msg("Subscribed to bot status updates")

	// Wait for confirmation
	_, err := pubsub.Receive(ctx)
	if err != nil {
		return fmt.Errorf("failed to subscribe to bot status: %w", err)
	}

	// Listen for messages
	ch := pubsub.Channel()
	for {
		select {
		case msg := <-ch:
			var status types.BotStatusUpdate
			if err := json.Unmarshal([]byte(msg.Payload), &status); err != nil {
				log.Error().Err(err).Msg("Failed to unmarshal bot status update")
				continue
			}

			log.Debug().
				Str("container_id", status.ContainerID).
				Str("status", string(status.Status)).
				Msg("Received bot status update")

			handler(status)

		case <-ctx.Done():
			log.Info().Str("channel", channel).Msg("Unsubscribed from bot status updates")
			return ctx.Err()
		}
	}
}

// =====================================================
// BOT COMMANDS
// =====================================================

// PublishBotCommand sends a command to a specific bot
func (c *Client) PublishBotCommand(ctx context.Context, containerID string, command types.BotCommand) error {
	channel := constants.BotCommandChannel + containerID

	data, err := json.Marshal(command)
	if err != nil {
		return fmt.Errorf("failed to marshal bot command: %w", err)
	}

	pubCtx, cancel := context.WithTimeout(ctx, constants.RedisPublishTimeout)
	defer cancel()

	err = c.rdb.Publish(pubCtx, channel, data).Err()
	if err != nil {
		return fmt.Errorf("failed to publish bot command: %w", err)
	}

	log.Debug().
		Str("container_id", containerID).
		Str("command", command.Command).
		Str("channel", channel).
		Msg("Published bot command")

	return nil
}

// SubscribeBotCommands subscribes to bot commands for a specific container
func (c *Client) SubscribeBotCommands(ctx context.Context, containerID string, handler func(types.BotCommand)) error {
	channel := constants.BotCommandChannel + containerID

	pubsub := c.rdb.Subscribe(ctx, channel)
	defer pubsub.Close()

	log.Info().Str("channel", channel).Msg("Subscribed to bot commands")

	// Wait for confirmation
	_, err := pubsub.Receive(ctx)
	if err != nil {
		return fmt.Errorf("failed to subscribe to bot commands: %w", err)
	}

	// Listen for messages
	ch := pubsub.Channel()
	for {
		select {
		case msg := <-ch:
			var command types.BotCommand
			if err := json.Unmarshal([]byte(msg.Payload), &command); err != nil {
				log.Error().Err(err).Msg("Failed to unmarshal bot command")
				continue
			}

			log.Debug().
				Str("container_id", containerID).
				Str("command", command.Command).
				Msg("Received bot command")

			handler(command)

		case <-ctx.Done():
			log.Info().Str("channel", channel).Msg("Unsubscribed from bot commands")
			return ctx.Err()
		}
	}
}

// =====================================================
// MEETING EVENTS (Global)
// =====================================================

// PublishMeetingEvent publishes a global meeting event
func (c *Client) PublishMeetingEvent(ctx context.Context, event interface{}) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal meeting event: %w", err)
	}

	pubCtx, cancel := context.WithTimeout(ctx, constants.RedisPublishTimeout)
	defer cancel()

	err = c.rdb.Publish(pubCtx, constants.MeetingEventsChannel, data).Err()
	if err != nil {
		return fmt.Errorf("failed to publish meeting event: %w", err)
	}

	log.Debug().Str("channel", constants.MeetingEventsChannel).Msg("Published meeting event")

	return nil
}

// SubscribeMeetingEvents subscribes to global meeting events
func (c *Client) SubscribeMeetingEvents(ctx context.Context, handler func([]byte)) error {
	pubsub := c.rdb.Subscribe(ctx, constants.MeetingEventsChannel)
	defer pubsub.Close()

	log.Info().Str("channel", constants.MeetingEventsChannel).Msg("Subscribed to meeting events")

	// Wait for confirmation
	_, err := pubsub.Receive(ctx)
	if err != nil {
		return fmt.Errorf("failed to subscribe to meeting events: %w", err)
	}

	// Listen for messages
	ch := pubsub.Channel()
	for {
		select {
		case msg := <-ch:
			handler([]byte(msg.Payload))

		case <-ctx.Done():
			log.Info().Str("channel", constants.MeetingEventsChannel).Msg("Unsubscribed from meeting events")
			return ctx.Err()
		}
	}
}

// =====================================================
// RATE LIMITING
// =====================================================

// IncrementRateLimit increments the rate limit counter for a user
func (c *Client) IncrementRateLimit(ctx context.Context, userID int64) error {
	key := fmt.Sprintf("ratelimit:%d", userID)

	pipe := c.rdb.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, constants.RateLimitTTL)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to increment rate limit: %w", err)
	}

	count := incr.Val()
	log.Debug().Int64("user_id", userID).Int64("count", count).Msg("Rate limit incremented")

	return nil
}

// CheckRateLimit checks if a user has exceeded the rate limit
func (c *Client) CheckRateLimit(ctx context.Context, userID int64, limit int) (bool, error) {
	key := fmt.Sprintf("ratelimit:%d", userID)

	count, err := c.rdb.Get(ctx, key).Int()
	if err == redis.Nil {
		return false, nil // No limit hit yet
	}
	if err != nil {
		return false, fmt.Errorf("failed to check rate limit: %w", err)
	}

	exceeded := count >= limit

	log.Debug().
		Int64("user_id", userID).
		Int("count", count).
		Int("limit", limit).
		Bool("exceeded", exceeded).
		Msg("Rate limit checked")

	return exceeded, nil
}

// =====================================================
// HEALTH CHECK
// =====================================================

// HealthCheck performs a Redis health check
func (c *Client) HealthCheck(ctx context.Context) error {
	// Ping
	if err := c.Ping(ctx); err != nil {
		return fmt.Errorf("redis ping failed: %w", err)
	}

	// Test SET and GET
	testKey := "health:check"
	testValue := "ok"

	if err := c.rdb.Set(ctx, testKey, testValue, 10*time.Second).Err(); err != nil {
		return fmt.Errorf("redis SET failed: %w", err)
	}

	val, err := c.rdb.Get(ctx, testKey).Result()
	if err != nil {
		return fmt.Errorf("redis GET failed: %w", err)
	}

	if val != testValue {
		return fmt.Errorf("unexpected value: got %s, want %s", val, testValue)
	}

	return nil
}

// =====================================================
// UTILITY METHODS
// =====================================================

// GetClient returns the underlying Redis client (for advanced usage)
func (c *Client) GetClient() *redis.Client {
	return c.rdb
}
