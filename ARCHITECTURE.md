# Newar Insights - System Architecture

Technical design and data flow documentation.

---

## 🏗️ System Overview

Newar Insights is a distributed microservices system for automated meeting recording using browser automation.

### Design Principles

- **Microservices** - Each service has a single responsibility
- **Event-Driven** - Redis pub/sub for asynchronous communication
- **Stateless Services** - All state in database/Redis
- **Container-Native** - Every component runs in Docker
- **Horizontal Scalability** - Services can be replicated independently

---

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTS                              │
│  (curl, Postman, Web Apps, Mobile Apps)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    API GATEWAY (Port 8080)                   │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │   Auth     │  │ Rate Limit  │  │  Recording   │         │
│  │ Middleware │  │  Middleware │  │   Handlers   │         │
│  └────────────┘  └─────────────┘  └──────────────┘         │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
             │                           │ HTTP (spawn bot)
             │                           │
   ┌─────────▼─────────┐       ┌─────────▼───────────┐
   │  SQLite/Supabase  │       │  Bot Manager (8082) │
   │   (Database)      │       │  ┌──────────────┐  │
   └───────────────────┘       │  │ Docker Orch  │  │
                               │  │ FFmpeg Concat│  │
                               │  │ Redis Listen │  │
                               └──┬──────────────┬──┘
                                  │              │
                          Docker  │              │ Redis
                          Spawn   │              │ Pub/Sub
                                  │              │
                       ┌──────────▼──────────────▼──────────┐
                       │         REDIS (Pub/Sub)            │
                       │  ┌──────────────────────────┐      │
                       │  │ bot:status:{container}   │      │
                       │  │ bot:command:{container}  │      │
                       │  └──────────────────────────┘      │
                       └──────────┬─────────────────────────┘
                                  │
                                  │ Subscribe/Publish
                                  │
                   ┌──────────────▼──────────────┐
                   │     Recording Bots          │
                   │  (Dynamic Docker Containers)│
                   │  ┌─────────────────────┐   │
                   │  │ Playwright Browser  │   │
                   │  │ MediaRecorder API   │   │
                   │  │ Chunk Uploader      │   │
                   │  └─────────────────────┘   │
                   └─────────────────────────────┘
                                  │
                                  │ Write chunks
                                  │
                   ┌──────────────▼──────────────┐
                   │  Local Storage / Supabase   │
                   │  temp/{meeting_id}/         │
                   │    chunk_00000.webm         │
                   │    chunk_00001.webm         │
                   │  final/{user_id}/           │
                   │    meeting_123.webm         │
                   └─────────────────────────────┘
```

---

## 🧩 Service Breakdown

### 1. Admin API (Port 8081)

**Purpose:** User and API token management for administrators.

**Tech Stack:** Go 1.22 + Fiber v2 + SQLite/PostgreSQL

**Endpoints:**
- `POST /admin/users` - Create user
- `GET /admin/users` - List users
- `DELETE /admin/users/{id}` - Delete user
- `POST /admin/users/{id}/tokens` - Generate API token

**Responsibilities:**
- User CRUD operations
- API token generation (SHA-256 hashing)
- Admin authentication (`X-Admin-API-Key` header)
- Database migrations

**Dependencies:**
- Database (SQLite or Supabase)

---

### 2. API Gateway (Port 8080)

**Purpose:** Public-facing REST API for recording management.

**Tech Stack:** Go 1.22 + Fiber v2 + Redis + SQLite/PostgreSQL

**Endpoints:**
- `POST /recordings` - Create recording
- `GET /recordings` - List recordings
- `GET /recordings/{platform}/{id}` - Get status
- `DELETE /recordings/{platform}/{id}` - Stop recording
- `GET /recordings/{platform}/{id}/download` - Download file

**Responsibilities:**
- User authentication (API key validation)
- Rate limiting (10 req/min per user via Redis)
- Request validation
- Forward spawn requests to Bot Manager
- File download proxy

**Middleware:**
- `Auth` - Validates `X-API-Key`, sets `user_id` in context
- `RateLimit` - Redis-based per-user rate limiting
- `CORS` - Cross-origin resource sharing

**Dependencies:**
- Database (user/meeting lookups)
- Redis (rate limiting)
- Bot Manager (spawn bots)
- Storage (download files)

---

### 3. Bot Manager (Port 8082)

**Purpose:** Orchestrate recording bot lifecycle and finalize recordings.

**Tech Stack:** Go 1.22 + Fiber v2 + Docker SDK + FFmpeg + Redis

**Endpoints:**
- `POST /bots/spawn` - Spawn new bot container
- `POST /bots/{id}/stop` - Stop bot

**Responsibilities:**
- **Docker Orchestration:**
  - Spawn recording bot containers with environment variables
  - Monitor container health
  - Stop/remove containers

- **Status Listening:**
  - Subscribe to Redis `bot:status:{container_id}`
  - Update meeting status in database
  - Trigger finalization on completion

- **Recording Finalization:**
  - List chunks from storage (`temp/{meeting_id}/`)
  - Concatenate using FFmpeg concat protocol
  - Save final file to `final/{user_id}/`
  - Clean up temp chunks

**FFmpeg Command:**
```bash
ffmpeg -i "concat:chunk_00000.webm|chunk_00001.webm|..." \
       -c copy \
       final.webm
```

**Dependencies:**
- Database (meeting status updates)
- Redis (bot communication)
- Docker daemon (socket mount)
- Storage (chunk concatenation)
- FFmpeg binary

---

### 4. Recording Bot (Dynamic)

**Purpose:** Join meetings, record audio, and stream chunks.

**Tech Stack:** TypeScript + Playwright + Redis + MediaRecorder API

**Lifecycle:**
1. **Launch** - Bot Manager spawns container
2. **Join** - Playwright navigates to meeting URL
3. **Record** - MediaRecorder captures audio in 10s chunks
4. **Upload** - Save chunks to storage
5. **Monitor** - Publish status updates to Redis
6. **Exit** - Stop recording, publish "completed"

**Status Updates (Redis):**
```typescript
{
  container_id: "newar-bot-123",
  meeting_id: 456,
  status: "recording",
  chunk_count: 30,
  timestamp: "2025-10-28T10:30:00Z"
}
```

**Platform Support:**
- ✅ **Google Meet** - Fully implemented
  - Auto-mute mic & disable camera
  - Handle admission wait
  - Leave gracefully
- ⏳ **Microsoft Teams** - Placeholder (coming soon)

**Dependencies:**
- Redis (status updates, command subscription)
- Storage (chunk upload)
- Meeting platform (Google Meet/Teams)

---

## 🔄 Data Flow

### Recording Creation Flow

```
1. User → API Gateway
   POST /recordings {"platform": "google_meet", "meeting_id": "abc"}

2. API Gateway validates API key (check database)

3. API Gateway checks rate limit (Redis)

4. API Gateway checks max_concurrent_bots (database query)

5. API Gateway creates meeting record (status: "requested")

6. API Gateway → Bot Manager (async HTTP call)
   POST /bots/spawn {...}

7. Bot Manager spawns Docker container
   docker run -e MEETING_URL=... newar-recording-bot

8. Recording Bot starts, publishes "joining" to Redis

9. Bot Manager receives "joining", updates database

10. Recording Bot joins meeting, publishes "active"

11. Recording Bot starts MediaRecorder, publishes "recording"

12. Every 10 seconds:
    - MediaRecorder emits chunk
    - Bot uploads chunk to storage (temp/{meeting_id}/chunk_N.webm)
    - Bot publishes status update with chunk_count

13. User sends DELETE /recordings/{platform}/{id}
    OR meeting ends naturally

14. Recording Bot stops MediaRecorder, publishes "finalizing"

15. Bot Manager receives "finalizing":
    - Lists all chunks
    - Runs FFmpeg concatenation
    - Saves final file to storage
    - Updates database (status: "completed", recording_path: "...")
    - Cleans up temp chunks

16. User requests GET /recordings/{platform}/{id}/download

17. API Gateway streams file from storage
```

---

## 💾 Database Schema

### Tables

**users**
```sql
id                BIGINT PRIMARY KEY
email             TEXT UNIQUE
name              TEXT
max_concurrent_bots INTEGER DEFAULT 5
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

**api_tokens**
```sql
id         BIGINT PRIMARY KEY
user_id    BIGINT FOREIGN KEY → users.id
token_hash TEXT UNIQUE  -- SHA-256 hash
created_at TIMESTAMP
```

**meetings**
```sql
id              BIGINT PRIMARY KEY
user_id         BIGINT FOREIGN KEY → users.id
platform        TEXT  -- 'google_meet' or 'teams'
meeting_id      TEXT
bot_container_id TEXT
status          TEXT  -- 'requested', 'joining', 'active', 'recording', 'finalizing', 'completed', 'failed'
meeting_url     TEXT
recording_path  TEXT  -- 'final/user_1/meeting_123.webm'
started_at      TIMESTAMP
completed_at    TIMESTAMP
error_message   TEXT
created_at      TIMESTAMP
updated_at      TIMESTAMP

UNIQUE(platform, meeting_id, user_id)
```

**Indexes:**
- `meetings(user_id)` - List user recordings
- `meetings(status)` - Count active bots
- `api_tokens(token_hash)` - Auth lookups

---

## 📡 Redis Communication

### Channels

**Bot Status Updates:**
```
Channel: bot:status:{container_id}
Publisher: Recording Bot
Subscriber: Bot Manager

Message Format:
{
  "container_id": "newar-bot-123",
  "meeting_id": 456,
  "status": "recording",
  "chunk_count": 30,
  "error_message": null,
  "timestamp": "2025-10-28T10:30:00Z"
}
```

**Bot Commands:**
```
Channel: bot:command:{container_id}
Publisher: Bot Manager
Subscriber: Recording Bot

Message Format:
{
  "command": "stop",
  "timestamp": "2025-10-28T10:35:00Z"
}
```

**Rate Limiting:**
```
Key: ratelimit:{user_id}
Type: Counter
TTL: 1 minute
```

---

## 🗂️ Storage Structure

### Local Storage (Development)

```
storage/
├── database/
│   └── newar.db                   # SQLite database
└── recordings/
    ├── temp/                      # Temporary chunks
    │   └── meeting_123/
    │       ├── chunk_00000.webm
    │       ├── chunk_00001.webm
    │       └── chunk_00002.webm
    └── final/                     # Final recordings
        └── user_1/
            └── meeting_123_20251028.webm
```

### Supabase Storage (Production)

```
Bucket: recordings

Paths:
- temp/{meeting_id}/chunk_{index}.webm
- final/user_{user_id}/meeting_{id}_{timestamp}.webm
```

---

## 🔐 Security Design

### Authentication Flow

```
1. User requests API token from admin
2. Admin API generates random token (40 chars)
3. Token hashed with SHA-256 before storing
4. Plaintext token returned ONCE to admin
5. User includes token in X-API-Key header
6. API Gateway hashes incoming token
7. Lookup hash in database
8. If match, set user_id in request context
```

**Why SHA-256?**
- Fast lookup
- Secure against rainbow tables (token is random, not password)
- No need for bcrypt (tokens don't need slow hashing)

### Rate Limiting

- **Implementation:** Redis INCR with 1-minute expiry
- **Scope:** Per user (not per IP)
- **Limit:** 10 requests/minute (configurable)
- **Response:** `429 Too Many Requests`

### Input Validation

All inputs validated using `go-playground/validator`:
```go
type CreateRecordingRequest struct {
    Platform  string `validate:"required,oneof=google_meet teams"`
    MeetingID string `validate:"required,min=3,max=255"`
    BotName   string `validate:"max=100"`
}
```

---

## ⚡ Performance Considerations

### Bottlenecks

| Component | Bottleneck | Mitigation |
|-----------|-----------|------------|
| Database | Concurrent writes | Use connection pooling |
| Redis | Network latency | Deploy Redis close to services |
| FFmpeg | CPU-intensive | Run in dedicated bot-manager instances |
| Storage | I/O throughput | Use SSD, consider object storage |

### Scalability

**Horizontal Scaling:**
- API Gateway: Multiple replicas behind load balancer
- Bot Manager: Multiple instances (Docker socket per node)
- Recording Bots: Limited by `max_concurrent_bots` per user

**Vertical Scaling:**
- Bot Manager: More CPU for FFmpeg
- Recording Bots: More memory for browser instances

**Database:**
- SQLite: Development only (no horizontal scaling)
- Supabase/PostgreSQL: Production (read replicas, connection pooling)

---

## 🛡️ Fault Tolerance

### Failure Scenarios

**Bot crashes during recording:**
- Status listener detects no heartbeat
- Updates meeting status to "failed"
- Temp chunks remain for manual recovery

**FFmpeg concatenation fails:**
- Error logged
- Meeting status set to "failed" with error message
- Temp chunks preserved for retry

**Redis connection lost:**
- Rate limiting degraded (allows requests)
- Status updates lost (manual database update needed)

**Database connection lost:**
- Services return 503 Service Unavailable
- Health checks fail

---

## 📊 Monitoring Points

### Metrics to Track

**Application Metrics:**
- Active recordings count
- Recording success/failure rate
- Average recording duration
- Chunk concatenation duration
- API request rate

**Infrastructure Metrics:**
- Container CPU/memory usage
- Docker daemon health
- Redis connection pool
- Database query latency
- Storage I/O throughput

**Business Metrics:**
- Users per day
- Recordings per user
- Total storage used
- Average meeting length

---

## 🚀 Deployment Topology

### Development (docker-compose)
```
┌─────────────────────────────────────┐
│         Single Host                  │
│  ┌────────┐  ┌────────┐  ┌────────┐│
│  │Gateway │  │ Admin  │  │Manager ││
│  └────────┘  └────────┘  └────────┘│
│       │           │           │     │
│  ┌────▼───────────▼───────────▼───┐│
│  │  SQLite + Redis (containers)   ││
│  └────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Production (EasyPanel/Kubernetes)
```
┌─────────────────────────────────────┐
│       Load Balancer (HTTPS)         │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│    Gateway (3 replicas)             │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  Bot Manager (2 replicas)           │
│  + FFmpeg                            │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  Recording Bots (dynamic)           │
│  Max: user.max_concurrent_bots      │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  Supabase (PostgreSQL + Storage)    │
│  Redis (Managed/Upstash)            │
└─────────────────────────────────────┘
```

---

**For deployment details, see [DEPLOYMENT.md](DEPLOYMENT.md)**
