# ADR-004: Redis Pub/Sub for Real-Time Bot Status

**Status**: Accepted
**Date**: 2025-10-31
**Authors**: Development Team

## Context

Bot manager and recording bots need real-time, bidirectional communication:

**Bot → Bot Manager**:
- Status updates: `joining`, `active`, `recording`, `finalizing`, `completed`, `failed`
- Error notifications
- Participant count updates

**Bot Manager → Bot**:
- Stop commands
- Reconnect signals
- Configuration updates

Requirements:
- Low latency (<100ms)
- Reliable delivery
- Works across Docker containers
- Simple to implement

## Decision

Use **Redis Pub/Sub** with channel-based communication:

### Channel Structure

```
bot:status:{sessionID}   → Bot publishes status updates
bot:command:{sessionID}  → Bot manager sends commands
```

Example:
```
bot:status:ca027e1cdbc04cd2bbcbe2e3cc4cac53
bot:command:ca027e1cdbc04cd2bbcbe2e3cc4cac53
```

### Message Format

```json
{
  "status": "recording",
  "timestamp": 1698765432000,
  "participant_count": 5,
  "error": null
}
```

### Flow

1. **Bot Manager spawns bot** → Creates Docker container
2. **Bot Manager starts listener** → Subscribes to `bot:status:{sessionID}`
3. **Bot joins meeting** → Publishes `{"status": "joining"}`
4. **Bot Manager receives update** → Updates database status
5. **Bot finishes** → Publishes `{"status": "completed", "chunks": 42}`
6. **Bot Manager finalizes** → Runs FFmpeg concat, updates DB

## Consequences

### Positive

✅ **Real-Time**: <50ms latency for status updates
✅ **Simple API**: Just `PUBLISH` and `SUBSCRIBE`
✅ **Reliable**: Redis is battle-tested, rarely goes down
✅ **Cross-Container**: Works across Docker network
✅ **Scalable**: Can handle 1000s of concurrent subscriptions

### Negative

❌ **Fire-and-Forget**: Pub/Sub doesn't guarantee delivery if no subscribers
❌ **No Persistence**: Messages not stored (if listener dies, updates lost)
❌ **No Message History**: Can't replay events

### Mitigations

**Delivery Guarantee**:
- Bot manager starts listener BEFORE spawning bot
- If bot-manager restarts, reconciliation logic re-attaches listeners
- Status: ✅ **MITIGATED** (Phase 1 & 2 implementation)

**Message Loss**:
- Critical state persisted in database (not just Redis)
- Redis only used for real-time notifications
- Database is source of truth

## Implementation

**Bot Manager Listener** (`services/bot-manager/orchestrator/listener.go`):
```go
func (l *StatusListener) ListenForContainer(ctx context.Context, containerID string) error {
    pubsub := l.redis.Subscribe(ctx, fmt.Sprintf("bot:status:%s", containerID))
    defer pubsub.Close()

    ch := pubsub.Channel()
    for {
        select {
        case msg := <-ch:
            var status types.BotStatusUpdate
            json.Unmarshal([]byte(msg.Payload), &status)

            // Update database
            l.meetingRepo.UpdateStatus(ctx, status.SessionID, status.Status, ...)

            // Trigger finalization if completed
            if status.Status == types.MeetingStatusCompleted {
                l.finalizer.Finalize(ctx, status.SessionID)
            }

        case <-ctx.Done():
            return ctx.Err()
        }
    }
}
```

**Recording Bot** (`services/recording-bot/src/redis-client.ts`):
```typescript
export function publishBotStatus(sessionID: string, status: string) {
  const message = {
    status,
    timestamp: Date.now(),
    participant_count: participantCount,
  };

  redisClient.publish(`bot:status:${sessionID}`, JSON.stringify(message));
}
```

## Alternatives Considered

### 1. Polling (HTTP)
- Bot manager polls bot containers via HTTP endpoint
- **Rejected**: High latency (1-5s), wasted CPU
- Bot containers would need embedded HTTP server

### 2. Webhooks
- Bot sends HTTP POST to bot-manager on status change
- **Rejected**: Requires bot to know bot-manager URL
- NAT/firewall issues in Docker network

### 3. Message Queue (RabbitMQ, Kafka)
- Persistent, guaranteed delivery
- **Rejected**: Overkill for simple status updates
- More infrastructure to manage

### 4. gRPC Streams
- Bidirectional streaming
- **Rejected**: More complex than Pub/Sub
- Requires long-lived connections

### 5. WebSockets
- Real-time bidirectional communication
- **Rejected**: Bot manager would need WS server
- Redis Pub/Sub simpler for server-to-server

## Performance Characteristics

**Latency**:
- Publish: <5ms
- Delivery: <50ms
- End-to-end: <100ms

**Throughput**:
- 50,000 messages/sec (single Redis instance)
- 100+ concurrent subscribers

**Memory**:
- Negligible (messages not persisted)
- ~10KB per active subscription

## Future Improvements

1. **Redis Streams**: Persistent message log (can replay events)
2. **Retry Logic**: Exponential backoff on Redis connection failures
3. **Message Compression**: Gzip for large payloads
4. **Dead Letter Queue**: Capture failed processing attempts

## References

- [Redis Pub/Sub Documentation](https://redis.io/docs/manual/pubsub/)
- [Redis Streams vs Pub/Sub](https://redis.io/docs/data-types/streams/)
- [Go Redis Client](https://github.com/redis/go-redis)
