# Newar Insights - Deployment Guide

Production deployment instructions for EasyPanel and other platforms.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [EasyPanel Deployment](#easypanel-deployment)
- [Supabase Setup](#supabase-setup)
- [Redis Setup](#redis-setup)
- [Environment Variables](#environment-variables)
- [Domain Configuration](#domain-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ **EasyPanel account** or self-hosted instance
- ✅ **Supabase project** (free tier available)
- ✅ **Redis** (Upstash or self-hosted)
- ✅ **Domain name** (optional but recommended)
- ✅ **Git repository** (GitHub, GitLab, etc.)

---

## EasyPanel Deployment

### Step 1: Prepare Repository

1. **Push code to Git:**
```bash
git remote add origin https://github.com/yourusername/newar-insights.git
git push -u origin main
```

2. **Ensure all Dockerfiles are in `docker/` directory:**
```
docker/
├── Dockerfile.admin
├── Dockerfile.gateway
├── Dockerfile.manager
└── Dockerfile.bot
```

### Step 2: Create EasyPanel Project

1. Login to EasyPanel
2. Click **"Create New Project"**
3. Name: `newar-insights`
4. Select your Git provider
5. Connect repository: `yourusername/newar-insights`
6. Branch: `main`

### Step 3: Add Redis Service

1. In project, click **"Add Service"** → **"Redis"**
2. Name: `redis`
3. Version: `7-alpine`
4. Port: `6379` (internal)
5. Enable: ✅ Persistence
6. Deploy

**Note the internal URL:** `redis://redis:6379`

### Step 4: Add Admin API Service

1. Click **"Add Service"** → **"Docker Build"**
2. **General:**
   - Name: `admin-api`
   - Dockerfile path: `docker/Dockerfile.admin`
   - Port: `8081`

3. **Environment Variables:**
```env
DATABASE_TYPE=supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbG...
ADMIN_API_KEY=<generate_strong_random_key>
ADMIN_API_PORT=8081
LOG_LEVEL=info
```

4. **Domain (optional):**
   - `admin.newar.yourdomain.com`

5. **Deploy**

### Step 5: Add API Gateway Service

1. Click **"Add Service"** → **"Docker Build"**
2. **General:**
   - Name: `api-gateway`
   - Dockerfile path: `docker/Dockerfile.gateway`
   - Port: `8080`

3. **Environment Variables:**
```env
DATABASE_TYPE=supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbG...
REDIS_URL=redis://redis:6379
API_GATEWAY_PORT=8080
API_GATEWAY_RATE_LIMIT=10
BOT_MANAGER_URL=http://bot-manager:8082
STORAGE_TYPE=supabase
LOG_LEVEL=info
CORS_ALLOWED_ORIGINS=https://yourapp.com
```

4. **Domain:**
   - `api.newar.yourdomain.com`

5. **Deploy**

### Step 6: Add Bot Manager Service

1. Click **"Add Service"** → **"Docker Build"**
2. **General:**
   - Name: `bot-manager`
   - Dockerfile path: `docker/Dockerfile.manager`
   - Port: `8082`

3. **Environment Variables:**
```env
DATABASE_TYPE=supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbG...
REDIS_URL=redis://redis:6379
BOT_MANAGER_PORT=8082
BOT_IMAGE=newar-recording-bot:latest
MAX_CONCURRENT_BOTS=10
STORAGE_TYPE=supabase
LOG_LEVEL=info
```

4. **Volumes:**
   - **CRITICAL:** Mount Docker socket
   - Host path: `/var/run/docker.sock`
   - Container path: `/var/run/docker.sock`

5. **Deploy**

### Step 7: Build Recording Bot Image

**On EasyPanel host (SSH):**
```bash
# Clone repo
git clone https://github.com/yourusername/newar-insights.git
cd newar-insights

# Build bot image
docker build -t newar-recording-bot:latest -f docker/Dockerfile.bot .

# Verify
docker images | grep newar-recording-bot
```

### Step 8: Run Database Migrations

```bash
# Access admin-api container
docker exec -it admin-api sh

# Migrations auto-run on startup, verify with:
sqlite3 /app/storage/database/newar.db ".tables"

# Or for Supabase: already migrated in Supabase SQL Editor
```

### Step 9: Create First User

```bash
curl -X POST https://admin.newar.yourdomain.com/admin/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: YOUR_ADMIN_KEY" \
  -d '{
    "email": "admin@yourcompany.com",
    "name": "Admin User",
    "max_concurrent_bots": 20
  }'
```

### Step 10: Test Deployment

```bash
# Health checks
curl https://api.newar.yourdomain.com/health
curl https://admin.newar.yourdomain.com/health

# Should both return: {"status": "healthy", ...}
```

---

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region (closest to your users)
4. Wait for provisioning (~2 minutes)

### 2. Run SQL Migration

1. In Supabase Dashboard, go to **SQL Editor**
2. Copy contents of `migrations/001_initial_schema.sql`
3. **Uncomment PostgreSQL sections:**
```sql
-- Change this:
id INTEGER PRIMARY KEY AUTOINCREMENT, -- SQLite

-- To this:
id BIGSERIAL PRIMARY KEY, -- PostgreSQL/Supabase
```

4. Run the migration
5. Verify tables in **Table Editor**

### 3. Setup Storage

1. Go to **Storage** → **New Bucket**
2. Name: `recordings`
3. Public: ✅ (or implement signed URLs)
4. Create bucket

5. **Folder structure:**
```
recordings/
├── temp/
│   └── meeting_{id}/
│       └── chunk_*.webm
└── final/
    └── user_{id}/
        └── meeting_*.webm
```

### 4. Get Credentials

**Project Settings → API:**
- **Project URL:** `https://xxxxx.supabase.co`
- **Anon/Public Key:** (for public operations)
- **Service Role Key:** (for admin operations - KEEP SECRET!)

**Use Service Role Key in services:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Redis Setup

### Option 1: Upstash (Recommended for Production)

1. Go to [upstash.com](https://upstash.com)
2. Create Redis database
3. Region: Closest to EasyPanel server
4. Copy connection URL:
```
REDIS_URL=rediss://:password@region.upstash.io:6379
```

**Benefits:**
- ✅ Fully managed
- ✅ Pay-as-you-go
- ✅ Free tier available
- ✅ Built-in TLS

### Option 2: Self-Hosted (Development)

**In docker-compose.yml:**
```yaml
redis:
  image: redis:7-alpine
  volumes:
    - redis-data:/data
  ports:
    - "6379:6379"
```

---

## Environment Variables

### Admin API

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_TYPE` | ✅ | `supabase` |
| `SUPABASE_URL` | ✅ | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | ✅ | `eyJhbG...` |
| `ADMIN_API_KEY` | ✅ | `<strong_random_key>` |
| `ADMIN_API_PORT` | ❌ | `8081` |
| `LOG_LEVEL` | ❌ | `info` |

### API Gateway

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_TYPE` | ✅ | `supabase` |
| `SUPABASE_URL` | ✅ | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | ✅ | `eyJhbG...` |
| `REDIS_URL` | ✅ | `redis://redis:6379` |
| `BOT_MANAGER_URL` | ✅ | `http://bot-manager:8082` |
| `API_GATEWAY_PORT` | ❌ | `8080` |
| `API_GATEWAY_RATE_LIMIT` | ❌ | `10` |
| `CORS_ALLOWED_ORIGINS` | ❌ | `https://app.com` |
| `LOG_LEVEL` | ❌ | `info` |

### Bot Manager

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_TYPE` | ✅ | `supabase` |
| `SUPABASE_URL` | ✅ | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | ✅ | `eyJhbG...` |
| `REDIS_URL` | ✅ | `redis://redis:6379` |
| `BOT_IMAGE` | ✅ | `newar-recording-bot:latest` |
| `MAX_CONCURRENT_BOTS` | ❌ | `10` |
| `STORAGE_TYPE` | ✅ | `supabase` |
| `LOG_LEVEL` | ❌ | `info` |

---

## Domain Configuration

### DNS Setup

**Recommended structure:**
```
api.newar.yourdomain.com     → API Gateway (public)
admin.newar.yourdomain.com   → Admin API (internal only)
manager.newar.yourdomain.com → Bot Manager (internal only)
```

**DNS Records (in your domain provider):**
```
Type  Name     Value                    TTL
A     api      <easypanel_server_ip>    300
A     admin    <easypanel_server_ip>    300
```

**Or use CNAME if EasyPanel provides domain:**
```
CNAME api     api-gateway.easypanel.example.com
CNAME admin   admin-api.easypanel.example.com
```

---

## SSL/TLS Setup

### EasyPanel Automatic SSL

EasyPanel provides automatic Let's Encrypt SSL:

1. In service settings, enable **"Auto SSL"**
2. Enter domain: `api.newar.yourdomain.com`
3. Wait ~2 minutes for certificate issuance
4. **Force HTTPS:** ✅

### Manual SSL (Cloudflare)

1. Add domain to Cloudflare
2. Set DNS records (proxied)
3. SSL/TLS mode: **Full (strict)**
4. Auto HTTPS rewrites: ✅

---

## Monitoring

### Health Checks

**Setup monitoring service (e.g., UptimeRobot):**

```
URL: https://api.newar.yourdomain.com/health
Interval: 5 minutes
Expected: 200 OK
Alert: Email/Slack on failure
```

### Logs

**Access logs in EasyPanel:**
```bash
# Real-time logs
docker logs -f api-gateway

# Last 100 lines
docker logs --tail 100 bot-manager
```

**Log aggregation (optional):**
- Papertrail
- Logtail
- Datadog

### Metrics (Optional)

**Prometheus + Grafana:**

1. Add Prometheus endpoints to services
2. Setup Grafana dashboard
3. Track:
   - Request rate
   - Error rate
   - Active bots
   - Storage usage

---

## Backup & Recovery

### Database Backup (Supabase)

**Automatic backups:**
- Supabase provides daily backups (Pro plan)
- Point-in-time recovery available

**Manual export:**
```bash
pg_dump -h db.xxxxx.supabase.co \
        -U postgres \
        -d postgres \
        > backup_$(date +%Y%m%d).sql
```

### Storage Backup

**Supabase Storage:**
- Enable versioning in bucket settings
- Setup lifecycle policy to archive old recordings

**Manual backup:**
```bash
# Download all recordings
aws s3 sync s3://supabase-bucket/recordings ./backup/
```

### Configuration Backup

**Backup .env files:**
```bash
# Store securely (1Password, Vault, etc.)
cp .env .env.backup
gpg --encrypt .env.backup
```

---

## Scaling

### Horizontal Scaling

**API Gateway:**
```yaml
# EasyPanel: Set replicas to 3
replicas: 3
```

**Bot Manager:**
- Deploy on multiple nodes
- Each needs Docker socket access
- Use Redis for coordination

**Database:**
- Supabase auto-scales
- Consider read replicas for high traffic

### Vertical Scaling

**Increase resources per service:**
```yaml
resources:
  limits:
    memory: 2Gi
    cpu: "2"
```

### Load Balancing

**EasyPanel auto-balances** between replicas.

For external LB:
- Use Cloudflare Load Balancing
- Or Nginx reverse proxy

---

## Security Checklist

Before going live:

- ✅ Change `ADMIN_API_KEY` to strong random value
- ✅ Use HTTPS for all endpoints
- ✅ Enable Supabase Row Level Security (RLS)
- ✅ Rotate API tokens regularly
- ✅ Limit CORS origins to specific domains
- ✅ Enable rate limiting
- ✅ Use firewall to restrict Admin API access
- ✅ Enable Docker socket security (use TLS)
- ✅ Scan images for vulnerabilities
- ✅ Setup audit logs

---

## Troubleshooting

### Bot Manager can't spawn containers

**Error:** `Cannot connect to Docker daemon`

**Fix:**
1. Verify Docker socket mount:
```bash
docker exec bot-manager ls -l /var/run/docker.sock
```
2. Should show: `srw-rw----`
3. If missing, add volume in EasyPanel service config

---

### Recordings fail to finalize

**Error:** `ffmpeg: command not found`

**Fix:**
Dockerfile.manager includes FFmpeg. Rebuild:
```bash
docker build -t bot-manager -f docker/Dockerfile.manager .
```

---

### Database connection timeout

**Error:** `dial tcp: i/o timeout`

**Fix:**
1. Check Supabase firewall rules
2. Verify `SUPABASE_URL` is correct
3. Test connection:
```bash
curl https://xxxxx.supabase.co/rest/v1/
```

---

### Redis connection refused

**Error:** `dial tcp: connection refused`

**Fix:**
1. Verify Redis service is running
2. Check `REDIS_URL` format:
   - Docker: `redis://redis:6379`
   - Upstash: `rediss://:password@region.upstash.io:6379`

---

## Cost Estimation

**Monthly costs (estimated):**

| Service | Provider | Tier | Cost |
|---------|----------|------|------|
| Hosting | EasyPanel | Self-hosted | $0 |
| Database | Supabase | Free | $0 |
| Redis | Upstash | Free | $0 |
| Storage | Supabase | 1GB free | $0.021/GB |
| **Total** | | **Free tier** | **~$0-20/mo** |

**Production costs (1000 recordings/month):**

| Service | Provider | Plan | Cost |
|---------|----------|------|------|
| Hosting | EasyPanel/AWS | VPS 4GB RAM | $20/mo |
| Database | Supabase | Pro | $25/mo |
| Redis | Upstash | Pay-as-you-go | $5/mo |
| Storage | Supabase | 100GB | $2/mo |
| **Total** | | | **~$52/mo** |

---

## Next Steps

1. ✅ Complete EasyPanel deployment
2. ✅ Setup monitoring
3. ✅ Configure backups
4. ✅ Test end-to-end workflow
5. ✅ Load test with multiple concurrent recordings
6. ✅ Setup CI/CD pipeline
7. ✅ Document runbooks for common issues

---

**Need help?** Open an issue: [GitHub Issues](https://github.com/newar/insights/issues)
