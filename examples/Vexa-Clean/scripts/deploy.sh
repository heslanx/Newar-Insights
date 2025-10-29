#!/bin/bash
# Vexa Simplified Recording System - Production Deploy Script
# For Ubuntu 24.04 LTS with 16GB RAM, 4 CPU cores

set -e  # Exit on error

echo "🚀 Vexa Recording System - Production Deploy"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running as root${NC}"
echo ""

# Step 1: Check system requirements
echo "📋 Step 1: Checking system requirements..."
echo "-------------------------------------------"

# Check RAM
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 15 ]; then
    echo -e "${RED}❌ Insufficient RAM: ${TOTAL_RAM}GB (minimum 16GB required)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ RAM: ${TOTAL_RAM}GB${NC}"

# Check CPU cores
CPU_CORES=$(nproc)
if [ "$CPU_CORES" -lt 4 ]; then
    echo -e "${RED}❌ Insufficient CPU cores: ${CPU_CORES} (minimum 4 required)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ CPU Cores: ${CPU_CORES}${NC}"

# Check disk space
DISK_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$DISK_SPACE" -lt 50 ]; then
    echo -e "${YELLOW}⚠️  Low disk space: ${DISK_SPACE}GB (recommended 50GB+)${NC}"
else
    echo -e "${GREEN}✅ Disk Space: ${DISK_SPACE}GB available${NC}"
fi

echo ""

# Step 2: Install Docker if needed
echo "🐳 Step 2: Checking Docker installation..."
echo "-------------------------------------------"

if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    echo -e "${GREEN}✅ Docker already installed: ${DOCKER_VERSION}${NC}"
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose plugin not found${NC}"
    exit 1
fi
COMPOSE_VERSION=$(docker compose version --short)
echo -e "${GREEN}✅ Docker Compose: ${COMPOSE_VERSION}${NC}"

echo ""

# Step 3: Configure environment
echo "⚙️  Step 3: Configuring environment..."
echo "-------------------------------------------"

# Generate secure tokens if .env doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    
    # Generate random tokens
    ADMIN_TOKEN=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -hex 16)
    
    cat > .env << EOF
# Vexa Recording System - Production Configuration
# Generated: $(date)

# Admin API
ADMIN_API_TOKEN=${ADMIN_TOKEN}

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=vexa
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/vexa

# Redis
REDIS_URL=redis://redis:6379/0

# Docker
COMPOSE_PROJECT_NAME=vexa_simple

# Bot Configuration
MAX_CONCURRENT_BOTS=5
BOT_IMAGE_NAME=vexa-bot:dev
DOCKER_NETWORK=vexa_simple_default

# Recording Storage
RECORDINGS_DIR=/recordings
EOF

    echo -e "${GREEN}✅ .env file created with secure tokens${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Save these credentials!${NC}"
    echo ""
    echo "Admin API Token: ${ADMIN_TOKEN}"
    echo "Database Password: ${DB_PASSWORD}"
    echo ""
    echo "Press Enter to continue..."
    read
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

echo ""

# Step 4: Build Docker images
echo "🔨 Step 4: Building Docker images..."
echo "-------------------------------------------"

docker compose build --no-cache

echo -e "${GREEN}✅ Images built successfully${NC}"
echo ""

# Step 5: Start services
echo "🚀 Step 5: Starting services..."
echo "-------------------------------------------"

docker compose up -d

echo "Waiting for services to be ready..."
sleep 10

echo -e "${GREEN}✅ Services started${NC}"
echo ""

# Step 6: Verify services
echo "🔍 Step 6: Verifying services..."
echo "-------------------------------------------"

docker compose ps

echo ""

# Check if all services are running
RUNNING=$(docker compose ps --status running | grep -c "running" || true)
TOTAL=$(docker compose ps | tail -n +2 | wc -l)

if [ "$RUNNING" -eq "$TOTAL" ]; then
    echo -e "${GREEN}✅ All services running (${RUNNING}/${TOTAL})${NC}"
else
    echo -e "${RED}❌ Some services failed (${RUNNING}/${TOTAL} running)${NC}"
    echo "Check logs with: docker compose logs"
    exit 1
fi

echo ""

# Step 7: Create admin user
echo "👤 Step 7: Creating admin user..."
echo "-------------------------------------------"

# Load admin token from .env
source .env

# Wait for API to be ready
echo "Waiting for API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8057/health &> /dev/null; then
        break
    fi
    sleep 2
done

# Create admin user
ADMIN_EMAIL="admin@vexa.local"
ADMIN_NAME="Admin"

echo "Creating user: ${ADMIN_EMAIL}"

USER_RESPONSE=$(curl -s -X POST http://localhost:8057/admin/users \
  -H "X-Admin-API-Key: ${ADMIN_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${ADMIN_EMAIL}\", \"name\": \"${ADMIN_NAME}\", \"max_concurrent_bots\": 5}")

USER_ID=$(echo $USER_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

if [ -z "$USER_ID" ]; then
    echo -e "${RED}❌ Failed to create user${NC}"
    echo "Response: $USER_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ User created (ID: ${USER_ID})${NC}"

# Generate API token
echo "Generating API token..."

TOKEN_RESPONSE=$(curl -s -X POST http://localhost:8057/admin/users/${USER_ID}/tokens \
  -H "X-Admin-API-Key: ${ADMIN_API_TOKEN}")

API_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$API_TOKEN" ]; then
    echo -e "${RED}❌ Failed to generate token${NC}"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ API token generated${NC}"
echo ""

# Step 8: Save credentials
echo "💾 Step 8: Saving credentials..."
echo "-------------------------------------------"

cat > /root/vexa-credentials.txt << EOF
Vexa Recording System - Credentials
Generated: $(date)

Admin API:
  URL: http://localhost:8057
  Token: ${ADMIN_API_TOKEN}

User API:
  URL: http://localhost:8056
  Email: ${ADMIN_EMAIL}
  User ID: ${USER_ID}
  API Token: ${API_TOKEN}

Database:
  Host: localhost:5438
  User: postgres
  Password: ${POSTGRES_PASSWORD}
  Database: vexa

Test Recording:
  curl -X POST http://localhost:8056/bots \\
    -H "X-API-Key: ${API_TOKEN}" \\
    -H "Content-Type: application/json" \\
    -d '{"platform": "google_meet", "native_meeting_id": "test-meeting", "bot_name": "Test Bot"}'

List Recordings:
  curl http://localhost:8056/recordings \\
    -H "X-API-Key: ${API_TOKEN}"

Download Recording:
  curl http://localhost:8056/recordings/google_meet/test-meeting \\
    -H "X-API-Key: ${API_TOKEN}" \\
    --output recording.webm
EOF

chmod 600 /root/vexa-credentials.txt

echo -e "${GREEN}✅ Credentials saved to /root/vexa-credentials.txt${NC}"
echo ""

# Step 9: Display summary
echo "=========================================="
echo "🎉 Vexa Recording System - Deploy Complete!"
echo "=========================================="
echo ""
echo "📊 System Status:"
echo "  - Services: Running"
echo "  - Admin User: ${ADMIN_EMAIL}"
echo "  - Max Concurrent Bots: 5"
echo ""
echo "🔑 Credentials saved to: /root/vexa-credentials.txt"
echo ""
echo "📝 Quick Start:"
echo "  1. View credentials: cat /root/vexa-credentials.txt"
echo "  2. Test recording: See commands in credentials file"
echo "  3. Monitor: docker compose logs -f"
echo "  4. Check status: docker compose ps"
echo ""
echo "🔗 API Endpoints:"
echo "  - Admin API: http://localhost:8057"
echo "  - User API: http://localhost:8056"
echo "  - Recordings: http://localhost:8056/recordings"
echo ""
echo "📚 Documentation: See CLAUDE.md and README.simple.md"
echo ""
echo -e "${GREEN}✅ System is ready for production use!${NC}"
echo ""
