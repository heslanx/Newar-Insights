# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Newar Insights** is a Google Meet recording platform that spawns headless Chrome bots in Docker containers to join meetings and record audio. The system uses a microservices architecture with Go backends, a Next.js admin dashboard, and a Chrome extension for user interaction.

**Core Principle**: The Chrome extension is a **remote control** that sends HTTP commands to spawn/stop recording bots. It does NOT record directly. All recording happens server-side via Puppeteer bots in Docker.

## Architecture Overview

### System Flow
```
Chrome Extension → API Gateway (8080) → Bot Manager (8082) → Recording Bots (Docker containers)
                        ↓
                  Admin API (8081)
                        ↓
                   Supabase PostgreSQL
```

### Services (Go + Fiber)

**1. Admin API (port 8081)** - `services/admin-api/`
- User and token management
- Recording CRUD operations
- Bot container management (via Docker SDK)
- System health/metrics endpoints
- **Requires Docker socket access** (`/var/run/docker.sock`)
- Protected by `X-Admin-API-Key` header

**2. API Gateway (port 8080)** - `services/api-gateway/`
- Public API for Chrome extension
- Rate limiting (per-user, configurable)
- Recording lifecycle management
- Protected by `X-API-Key` header (user tokens)
- Proxies bot spawn requests to Bot Manager

**3. Bot Manager (port 8082)** - `services/bot-manager/`
- Spawns Docker containers dynamically (`newar-bot-{meetingId}-{timestamp}`)
- Listens to Redis pub/sub for bot status updates
- Updates recording status in database
- Handles recording finalization
- **Requires Docker socket access**

**4. Recording Bot** - `services/recording-bot/` (Node.js + Puppeteer)
- Runs inside Docker containers (headless Chrome)
- Joins Google Meet via Puppeteer
- Records audio in 10-second chunks (.webm)
- Publishes status updates to Redis
- Uploads chunks to Supabase Storage (S3-compatible)

### Shared Code - `shared/`

Critical shared packages used across all Go services:

- **`shared/server/builder.go`** - Fiber server builder with middleware (CORS, timeout, logging, recover)
- **`shared/database/`** - PostgreSQL repository implementations (users, meetings, tokens)
- **`shared/storage/`** - Storage abstraction (Supabase S3-compatible)
- **`shared/redis/`** - Redis pub/sub client
- **`shared/types/`** - Common types and constants
- **`shared/config/`** - Configuration loading from env vars

### Frontend - `frontend/` (Next.js 15)

- Admin dashboard for managing users, recordings, and bots
- API client in `lib/api.ts` with separate modules:
  - `adminAPI` - Admin operations (requires admin key)
  - `gatewayAPI` - Public recording operations (requires user token)
  - `adminRecordingsAPI` - Cross-user recording management
  - `botManagerAPI` - Bot container management
  - `systemHealthAPI` - System monitoring

### Chrome Extension - `chrome-extension/` (WXT + React 19)

- **Dev Mode** (`lib/dev-mode.ts`): Auto-configures with local backend
- Service worker (`entrypoints/background.ts`): Handles recording lifecycle
- Popup UI (`entrypoints/popup/`): Main user interface
- Settings page (`entrypoints/settings/`): API key configuration
- Recordings page (`entrypoints/recordings/`): View past recordings

## Development Commands

### Full Stack Development
```bash
# Start all backend services + frontend
make all

# Or separate:
make start              # Start Docker services (backend)
make frontend           # Start Next.js (port 3000)

# First time setup
make dev               # build + start + init test user
```

### Backend Services (Docker)
```bash
make build             # Build all Docker images including recording bot
make start             # Start services (Admin API, Gateway, Bot Manager, Redis)
make stop              # Stop all services
make restart           # Restart everything
make logs              # Tail all logs
make logs-admin        # Tail Admin API logs
make logs-gateway      # Tail API Gateway logs
make logs-manager      # Tail Bot Manager logs
make health            # Check health of all services
make ps                # Show running containers
```

### Database & Users
```bash
make init              # Create test user (after make start)
make token             # Generate API token for test user (ID=1)
```

### Frontend (Next.js)
```bash
cd frontend
npm run dev            # Dev server (port 3000)
npm run build          # Production build
npm run start          # Production server
npm run lint           # ESLint
```

### Chrome Extension (WXT)
```bash
cd chrome-extension
npm install
npm run build          # Build for production
npm run dev            # Build with watch mode
npm run zip            # Create .zip for Chrome Web Store
```

Load extension in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `.output/chrome-mv3` folder

### Go Services (Direct)
```bash
# From project root
go mod download
go build -o bin/admin-api ./services/admin-api
go build -o bin/api-gateway ./services/api-gateway
go build -o bin/bot-manager ./services/bot-manager

# Run locally (not recommended, use Docker)
cd services/admin-api && go run .
```

## Database Schema (Supabase PostgreSQL)

**Key tables:**
- `users` - User accounts with `max_concurrent_bots` limit
- `api_keys` - User API tokens (format: `vxa_live_*`)
- `meetings` - Recording records with status tracking

**Recording Status Flow:**
```
requested → joining → active → completed/failed
```

**Active Recording Count:**
System counts recordings with status `requested`, `joining`, or `active` against user's `max_concurrent_bots` limit.

**Stale Recording Cleanup:**
```bash
# Mark recordings stuck in "requested" for >5min as "failed"
curl -X POST \
  -H "X-Admin-API-Key: admin_secret_change_me_in_production" \
  http://localhost:8081/admin/recordings/cleanup
```

## Environment Configuration

Primary config file: `.env` (copied from `.env.example`)

**Critical Variables:**
```bash
# Supabase PostgreSQL
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-db-password

# Supabase Storage (S3-compatible)
STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=insights
SUPABASE_STORAGE_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
SUPABASE_STORAGE_ACCESS_KEY=your-access-key
SUPABASE_STORAGE_SECRET_KEY=your-secret-key

# Redis
REDIS_URL=redis://localhost:6379

# API Keys
ADMIN_API_KEY=admin_secret_change_me_in_production

# Limits
MAX_CONCURRENT_BOTS=10
API_GATEWAY_RATE_LIMIT=10  # requests per minute per user
```

## Key Patterns & Conventions

### Go Service Structure
```
services/{service-name}/
├── main.go              # Entry point, uses ServerBuilder
├── handlers/            # Fiber HTTP handlers
├── middleware/          # Service-specific middleware
└── interfaces/          # Interface definitions for DI
```

**Server Initialization Pattern:**
```go
// All services follow this pattern
builder, _ := server.NewServerBuilder("service-name")
db, _ := database.NewDatabase(builder.Config().Database)
defer db.Close()

// Register health endpoints
builder.RegisterHealthEndpoints(db, redisClient)

// Register routes
builder.App().Post("/endpoint", handler.Method)

// Start server (blocks)
builder.MustStart()
```

### Middleware Stack (Applied in `shared/server/builder.go`)
1. Recover - Catch panics with stack traces
2. Logger - Request logging with duration
3. Timeout - 30s default timeout for all requests
4. CORS - Configurable origins
5. HTTPMetrics - Prometheus metrics (disabled in dev)

### Error Handling
- Use `fiber.Map{"error": "message"}` for errors
- Status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 429 (rate limit), 500 (server error), 503 (degraded)
- Log all errors with `zerolog`: `log.Error().Err(err).Msg("description")`

### Database Context Timeouts
```go
ctx, cancel := context.WithTimeout(context.Background(), constants.DefaultQueryTimeout)
defer cancel()
```

### Redis Pub/Sub Pattern
**Bot publishes status:**
```typescript
// In recording bot (Node.js)
await redis.publish(`bot:status:${containerId}`, JSON.stringify({
  status: 'active', // requested, joining, active, completed, failed
  meeting_id: 123,
  container_id: 'abc123',
  chunk_count: 5,
  error_message: null
}));
```

**Bot Manager subscribes:**
```go
// In bot-manager orchestrator/listener.go
redisClient.SubscribeBotStatus(ctx, containerID, func(status types.BotStatusUpdate) {
  // Update database with new status
  meetingRepo.UpdateStatus(ctx, status.MeetingID, status.Status, ...)
})
```

## Common Issues & Solutions

### 1. "Maximum concurrent bots limit reached"
**Cause:** Recordings stuck in "requested" status blocking new recordings.
**Solution:** Run cleanup endpoint (see Database Schema section).

### 2. Frontend pages empty (/bots, /recordings)
**Cause:** Admin API missing endpoints or not running.
**Check:** `curl http://localhost:8081/health`
**Solution:** Ensure all admin API handlers are registered in `main.go`.

### 3. Bot containers failing silently
**Cause:** Status updates not reaching database (Redis channel mismatch or listener not started).
**Debug:**
```bash
docker logs newar-bot-{id}-{timestamp}  # Check bot logs
docker logs newar-bot-manager --tail 50 # Check for status updates
```
**Solution:** Verify listener started in `bot-manager/handlers/bots.go` after `SpawnBot()`.

### 4. Docker socket permission errors
**Cause:** Admin API or Bot Manager can't access `/var/run/docker.sock`.
**Solution:** Ensure volume mount in `docker-compose.yml`:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

### 5. Stop recording timeout (30s)
**Cause:** Long-running container stop operation exceeds timeout middleware.
**Workaround:** Stop via admin API bot management endpoint instead of gateway.

## Testing & Debugging

### Health Checks
```bash
make health  # All services
curl http://localhost:8081/health  # Admin API
curl http://localhost:8080/health  # Gateway
curl http://localhost:8082/health  # Bot Manager
```

### Check Active Bots
```bash
curl -H "X-Admin-API-Key: admin_secret_change_me_in_production" \
  http://localhost:8081/admin/bots/active | jq
```

### View Recordings
```bash
curl -H "X-Admin-API-Key: admin_secret_change_me_in_production" \
  "http://localhost:8081/admin/recordings?limit=10" | jq
```

### Chrome Extension Debugging
1. Open `chrome://extensions/`
2. Click "Details" on Newar Insights
3. Click "Inspect views: service worker"
4. Check console for:
   - `[DEV MODE ENABLED - REAL API]` message
   - API call logs
   - WebSocket/polling status

### Bot Container Logs
```bash
# List bot containers
docker ps -a --filter "name=newar-bot-"

# View logs
docker logs newar-bot-{meetingId}-{timestamp}

# Tail logs
docker logs -f newar-bot-{meetingId}-{timestamp}
```

## Adding New Endpoints

### Backend (Go/Fiber)
1. Create handler in `services/{service}/handlers/{feature}.go`
2. Define handler struct with dependencies (db, redis, etc.)
3. Implement handler methods with signature: `func (h *Handler) Method(c *fiber.Ctx) error`
4. Register route in `services/{service}/main.go`
5. Rebuild Docker image: `docker-compose build {service}`
6. Restart service: `docker-compose up -d {service}`

### Frontend API Client
1. Add method to appropriate section in `frontend/lib/api.ts`
2. Use existing `fetcher<T>()` function for type safety
3. Include proper headers (`X-Admin-API-Key` or `X-API-Key`)
4. Update components to call new method

## Docker Images

**Built by `make build`:**
- `newar-insights-admin-api` (from `docker/Dockerfile.admin`)
- `newar-insights-api-gateway` (from `docker/Dockerfile.gateway`)
- `newar-insights-bot-manager` (from `docker/Dockerfile.manager`)
- `newar-recording-bot:latest` (from `docker/Dockerfile.bot`)

**Network:** All services on `newar-network` bridge (172.20.0.0/16)

## Supabase Storage Integration

**Setup:** Create bucket "insights" in Supabase Storage, set to public.

**Usage in Go:**
```go
storageClient, _ := storage.NewStorage("supabase")
url, _ := storageClient.Upload(ctx, "path/file.webm", reader, "audio/webm")
```

**File Structure:**
```
insights/
└── recordings/
    └── {meetingId}/
        ├── chunk-0.webm
        ├── chunk-1.webm
        └── final.webm
```

## Principles Applied

This codebase follows **SOLID, KISS, YAGNI, DRY, and DDD** principles:

- **Single Responsibility**: Each service has one job (user mgmt, recording control, bot orchestration)
- **Dependency Injection**: Handlers receive dependencies via constructors
- **Interface Segregation**: `shared/domain/repositories/` defines minimal interfaces
- **Repository Pattern**: Database access abstracted behind interfaces
- **Shared Kernel**: Common types and utilities in `shared/`
- **Simple Architecture**: No over-engineering, straightforward HTTP + Docker orchestration
