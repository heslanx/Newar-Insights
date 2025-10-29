# Newar Insights

**Production-ready meeting recording system with browser automation**

Record Google Meet and Microsoft Teams meetings via simple REST API. Built with Go microservices, Redis pub/sub, Playwright browser automation, and Docker.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/newar/insights)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go)](https://go.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://www.docker.com/)

---

## 🚀 Features

- ✅ **Multi-tenant API** - Separate API keys per user with rate limiting
- ✅ **Google Meet Support** - Auto-join with muted mic & disabled camera
- ✅ **Streaming Recording** - 10-second audio chunks (no memory accumulation)
- ✅ **FFmpeg Concatenation** - Automatic chunk merging to final WebM
- ✅ **Docker Native** - All services containerized, EasyPanel ready
- ✅ **SQLite + Supabase** - Local development with production migration path
- ✅ **Redis Pub/Sub** - Real-time bot status updates
- ✅ **Health Checks** - All services expose `/health` endpoints
- ⏳ **Teams Support** - Coming soon

---

## 🏗️ Architecture

### Microservices

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Admin API  │      │ API Gateway  │      │ Bot Manager │
│  Port 8081  │      │  Port 8080   │      │  Port 8082  │
└──────┬──────┘      └──────┬───────┘      └──────┬──────┘
       │                    │                     │
       └────────────────────┴─────────────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
              ┌────▼────┐       ┌───▼────┐
              │ SQLite  │       │ Redis  │
              │   DB    │       │ Pub/Sub│
              └─────────┘       └────────┘
                                     │
                            ┌────────┴────────┐
                            │                 │
                       ┌────▼────┐       ┌───▼────┐
                       │  Bot 1  │  ...  │  Bot N │
                       │ (Docker)│       │(Docker)│
                       └─────────┘       └────────┘
```

**Services:**
- **Admin API** - User & token management, admin operations
- **API Gateway** - Public REST API, auth, rate limiting
- **Bot Manager** - Docker orchestration, FFmpeg finalization
- **Recording Bots** - Playwright browser automation (spawned dynamically)

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed design.

---

## 📦 Quick Start

### Prerequisites

- Docker & Docker Compose
- Make (optional, for shortcuts)

### 1. Clone & Setup

```bash
git clone https://github.com/newar/insights.git
cd insights

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Build & Start

```bash
# Using Make (recommended)
make dev

# OR manually
docker-compose build
docker build -t newar-recording-bot:latest -f docker/Dockerfile.bot .
docker-compose up -d
```

### 3. Initialize Database

```bash
# Create test user
make init

# Generate API token
make token
```

**Example Output:**
```json
{
  "token": "vxa_live_a1b2c3d4e5f6g7h8i9j0...",
  "created_at": "2025-10-28T10:00:00Z"
}
```

**Save this token!** It's only shown once.

---

## 🎯 Usage

### Create a Recording

```bash
curl -X POST http://localhost:8080/recordings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: vxa_live_YOUR_TOKEN_HERE" \
  -d '{
    "platform": "google_meet",
    "meeting_id": "abc-defg-hij",
    "bot_name": "Meeting Recorder"
  }'
```

**Response:**
```json
{
  "id": 1,
  "platform": "google_meet",
  "meeting_id": "abc-defg-hij",
  "status": "requested",
  "meeting_url": "https://meet.google.com/abc-defg-hij",
  "created_at": "2025-10-28T10:00:00Z"
}
```

### Check Recording Status

```bash
curl http://localhost:8080/recordings/google_meet/abc-defg-hij \
  -H "X-API-Key: vxa_live_YOUR_TOKEN_HERE"
```

### Download Recording

```bash
curl http://localhost:8080/recordings/google_meet/abc-defg-hij/download \
  -H "X-API-Key: vxa_live_YOUR_TOKEN_HERE" \
  -o recording.webm
```

See [API_REFERENCE.md](API_REFERENCE.md) for complete API docs.

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_TYPE` | Database type (`sqlite` or `supabase`) | `sqlite` |
| `SQLITE_PATH` | Path to SQLite database | `./storage/database/newar.db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `ADMIN_API_KEY` | Admin API secret key | `admin_secret_change_me` |
| `API_GATEWAY_RATE_LIMIT` | Requests per minute per user | `10` |
| `MAX_CONCURRENT_BOTS` | Max bots per user | `10` |
| `LOG_LEVEL` | Logging level | `info` |

See [.env.example](.env.example) for full list.

---

## 🧪 Testing

### Health Checks

```bash
make health
```

### Manual Testing

```bash
# Check all services
curl http://localhost:8081/health  # Admin API
curl http://localhost:8080/health  # API Gateway
curl http://localhost:8082/health  # Bot Manager
```

### E2E Test Flow

1. Create user via Admin API
2. Generate API token
3. Create recording request
4. Wait for bot to join
5. Let recording run for 30s (3 chunks)
6. Stop recording
7. Download final file
8. Verify WebM format with `ffprobe`

---

## 📚 Documentation

- [API Reference](API_REFERENCE.md) - Complete endpoint documentation
- [Architecture](ARCHITECTURE.md) - System design & data flow
- [Deployment](DEPLOYMENT.md) - EasyPanel deployment guide
- [Development Plan](PLAN.md) - Implementation roadmap

---

## 🛠️ Development

### Project Structure

```
newar-insights/
├── services/          # Microservices
│   ├── admin-api/     # User management (Go)
│   ├── api-gateway/   # Public API (Go)
│   ├── bot-manager/   # Bot orchestration (Go)
│   └── recording-bot/ # Browser automation (TypeScript)
├── shared/            # Shared Go packages
│   ├── types/
│   ├── constants/
│   ├── database/
│   └── redis/
├── docker/            # Dockerfiles
├── migrations/        # SQL migrations
└── storage/           # Local storage (SQLite + recordings)
```

### Common Commands

```bash
make build       # Build all images
make start       # Start services
make stop        # Stop services
make logs        # View logs
make clean       # Remove all data
make ps          # Show running containers
```

---

## 🚀 Production Deployment

### EasyPanel

1. Create new project in EasyPanel
2. Connect Git repository
3. Add services from `docker-compose.yml`
4. Set environment variables
5. Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Supabase Migration

Change `.env`:
```bash
DATABASE_TYPE=supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbG...
```

Run migration in Supabase SQL Editor:
```bash
cat migrations/001_initial_schema.sql
# Copy and execute (uncomment PostgreSQL sections)
```

---

## 🔒 Security

- ✅ API keys hashed with SHA-256
- ✅ No plaintext credentials in database
- ✅ Rate limiting per user
- ✅ Input validation on all endpoints
- ✅ SQL injection protection (parameterized queries)
- ✅ CORS configuration
- ⚠️  Use HTTPS in production
- ⚠️  Change default admin key

---

## 📊 Monitoring

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway
```

### Metrics

All services expose `/health` endpoints:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-28T10:00:00Z",
  "dependencies": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🆘 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/newar/insights/issues)
- 📧 **Email**: dev@newar.com
- 📚 **Docs**: [Full Documentation](https://docs.newar.com)

---

## 🙏 Acknowledgments

Built with:
- [Go](https://go.dev/) - Backend services
- [Fiber](https://gofiber.io/) - Web framework
- [Playwright](https://playwright.dev/) - Browser automation
- [Redis](https://redis.io/) - Pub/sub messaging
- [FFmpeg](https://ffmpeg.org/) - Audio processing
- [Docker](https://www.docker.com/) - Containerization

---

**Made with ❤️ by Newar Team**

🤖 *Generated with [Claude Code](https://claude.com/claude-code)*
