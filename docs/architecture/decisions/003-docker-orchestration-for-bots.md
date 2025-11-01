# ADR-003: Docker Orchestration for Recording Bots

**Status**: Accepted
**Date**: 2025-10-31
**Authors**: Development Team

## Context

Recording bots need to:
- Run Chromium with Playwright (browser automation)
- Join Google Meet sessions with audio capture
- Record audio in 10-second chunks
- Run in isolation (one bot per meeting)
- Scale dynamically (spawn/kill containers on demand)

Challenges:
- Each bot needs ~1GB RAM + browser resources
- Browsers can crash or leak memory
- Need isolation between meetings
- Must handle concurrent recordings

## Decision

Use **Docker containers** orchestrated by `bot-manager` service:

### Architecture

```
bot-manager (Port 8082)
    ↓ (spawns via Docker API)
recording-bot containers (dynamic)
    ↓ (publishes status via Redis)
bot-manager (listens & finalizes)
```

### Container Lifecycle

1. **Spawn**: Bot manager creates container with unique env vars
2. **Run**: Bot joins meeting, records audio to shared volume
3. **Status**: Bot publishes Redis messages (`bot:status:{sessionID}`)
4. **Cleanup**: Bot manager finalizes (FFmpeg concat) and removes container

### Key Design Decisions

**1. Docker-in-Docker Pattern**
- Bot manager runs with `/var/run/docker.sock` mounted
- Can spawn sibling containers (not child containers)

**2. Shared Volume for Audio Chunks**
```yaml
volumes:
  - ./storage/recordings:/app/storage/recordings
```
- Bots write chunks to `/app/storage/recordings/temp/user_{id}/`
- Bot manager reads chunks from same path for FFmpeg concat

**3. Dynamic Container Naming**
```
newar-bot-{sessionID}
```
- Predictable names for cleanup
- Easy to track in `docker ps`

**4. Resource Limits**
```dockerfile
memory: 2GB
cpu: 1 core
```
- Prevents single bot from consuming all host resources

## Consequences

### Positive

✅ **Isolation**: Crash in one bot doesn't affect others
✅ **Scalability**: Spawn 50+ concurrent bots (hardware limited)
✅ **Cleanup**: Container removal frees all resources
✅ **Debugging**: `docker logs newar-bot-{id}` for troubleshooting
✅ **Portability**: Works on any Docker host (local, EC2, Kubernetes)

### Negative

❌ **Cold Start**: Container spawn takes 3-5s
❌ **Overhead**: Docker adds ~100MB per container
❌ **Complexity**: Requires Docker socket access (security concern)
❌ **No State Persistence**: If bot-manager restarts, loses active container tracking

### Mitigations

**State Loss on Restart**:
- Implemented reconciliation logic (`ReconcileActiveRecordings()`)
- Re-attaches listeners to running containers on bot-manager startup
- Status: ✅ **RESOLVED** (Phase 2 implementation)

**Security**:
- Docker socket access restricted to bot-manager only
- Containers run with minimal privileges
- No host network mode (isolated network)

## Implementation

**Bot Manager** (`services/bot-manager/orchestrator/docker.go`):
```go
type DockerOrchestrator struct {
    cli    *client.Client
    image  string
}

func (o *DockerOrchestrator) SpawnBot(ctx context.Context, meeting *types.Meeting, user *types.User) error {
    // 1. Create container
    container, err := o.cli.ContainerCreate(ctx, &container.Config{
        Image: o.image,
        Env: []string{
            fmt.Sprintf("RECORDING_SESSION_ID=%s", sessionID),
            fmt.Sprintf("MEETING_URL=%s", meeting.MeetingURL),
            // ...
        },
    }, &container.HostConfig{
        Binds: []string{storagePath + ":/app/storage/recordings"},
        Resources: container.Resources{
            Memory:   2 * 1024 * 1024 * 1024, // 2GB
            CPUQuota: 100000,                  // 1 CPU
        },
    }, nil, nil, containerName)

    // 2. Start container
    return o.cli.ContainerStart(ctx, container.ID, types.ContainerStartOptions{})
}
```

**Recording Bot** (`services/recording-bot/src/index.ts`):
```typescript
const sessionID = process.env.RECORDING_SESSION_ID;
const meetingURL = process.env.MEETING_URL;

// Publish status to Redis
redisClient.publish(`bot:status:${sessionID}`, JSON.stringify({
    status: 'joining',
    timestamp: Date.now()
}));
```

## Alternatives Considered

### 1. Long-Running Bot Pool
- **Rejected**: Browsers leak memory over time
- Would need periodic restarts anyway
- Per-meeting containers simpler

### 2. Kubernetes Jobs
- **Considered**: More production-ready
- **Rejected for MVP**: Overkill for development
- **Migration Path**: Docker abstraction allows K8s later

### 3. Serverless Functions (Lambda)
- **Rejected**: Chrome requires custom runtime
- 15-minute Lambda limit too short for meetings
- Cold start issues

### 4. Process-per-Bot (No Docker)
- **Rejected**: No isolation
- Harder to clean up zombie processes
- Port conflicts for concurrent bots

## Future Improvements

1. **Container Pooling**: Pre-spawn idle containers for faster joins
2. **Kubernetes Migration**: Replace Docker with K8s Jobs for production
3. **GPU Acceleration**: Use GPU-enabled containers for video processing
4. **Auto-Scaling**: Spawn bot-manager replicas based on load

## References

- [Docker SDK for Go](https://docs.docker.com/engine/api/sdk/)
- [Docker-in-Docker Best Practices](https://jpetazzo.github.io/2015/09/03/do-not-use-docker-in-docker-for-ci/)
- [Kubernetes vs Docker](https://kubernetes.io/docs/concepts/overview/what-is-kubernetes/)
