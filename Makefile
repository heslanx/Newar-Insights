# Newar Insights - Makefile

.PHONY: help build start stop clean logs test

help: ## Show this help message
	@echo "Newar Insights - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker images
	@echo "🏗️  Building all services..."
	docker-compose build
	@echo "🏗️  Building recording bot..."
	docker build -t newar-recording-bot:latest -f docker/Dockerfile.bot .
	@echo "✅ All images built successfully"

start: ## Start all services
	@echo "🚀 Starting Newar Insights services..."
	docker-compose up -d
	@echo "✅ Services started"
	@echo ""
	@echo "📋 Access points:"
	@echo "  - Admin API:    http://localhost:8081"
	@echo "  - API Gateway:  http://localhost:8080"
	@echo "  - Bot Manager:  http://localhost:8082"
	@echo "  - Redis:        localhost:6379"

stop: ## Stop all services
	@echo "🛑 Stopping services..."
	docker-compose down
	@echo "✅ Services stopped"

restart: stop start ## Restart all services

logs: ## Show logs from all services
	docker-compose logs -f

logs-admin: ## Show Admin API logs
	docker-compose logs -f admin-api

logs-gateway: ## Show API Gateway logs
	docker-compose logs -f api-gateway

logs-manager: ## Show Bot Manager logs
	docker-compose logs -f bot-manager

clean: ## Remove all containers, volumes, and images
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	docker rmi newar-recording-bot:latest || true
	rm -rf storage/database/*.db storage/recordings/temp/* storage/recordings/final/*
	@echo "✅ Cleanup complete"

init: ## Initialize database and create test user
	@echo "🔧 Initializing database..."
	@sleep 2  # Wait for services to start
	@echo "Creating test user..."
	curl -X POST http://localhost:8081/admin/users \
		-H "Content-Type: application/json" \
		-H "X-Admin-API-Key: admin_dev_secret_key_123" \
		-d '{"email": "test@newar.com", "name": "Test User", "max_concurrent_bots": 10}'
	@echo ""
	@echo "✅ Test user created. Generate API token with: make token"

token: ## Generate API token for test user (ID=1)
	@echo "🔑 Generating API token..."
	curl -X POST http://localhost:8081/admin/users/1/tokens \
		-H "X-Admin-API-Key: admin_dev_secret_key_123"
	@echo ""

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@echo ""
	@echo "Admin API:"
	@curl -s http://localhost:8081/health | jq . || echo "❌ Admin API is down"
	@echo ""
	@echo "API Gateway:"
	@curl -s http://localhost:8080/health | jq . || echo "❌ API Gateway is down"
	@echo ""
	@echo "Bot Manager:"
	@curl -s http://localhost:8082/health | jq . || echo "❌ Bot Manager is down"

dev: build start init ## Full dev setup (build + start + init)
	@echo "✅ Development environment ready!"

frontend: ## Start frontend development server
	@echo "🚀 Starting frontend on http://localhost:3000..."
	cd frontend && npm run dev

all: start frontend ## Start all services (backend + frontend)
	@echo "✅ All services running!"
	@echo "  - Backend APIs: http://localhost:8080, http://localhost:8081, http://localhost:8082"
	@echo "  - Frontend: http://localhost:3000"

ps: ## Show running containers
	docker-compose ps

shell-admin: ## Open shell in Admin API container
	docker exec -it newar-admin-api sh

shell-gateway: ## Open shell in API Gateway container
	docker exec -it newar-api-gateway sh

shell-manager: ## Open shell in Bot Manager container
	docker exec -it newar-bot-manager sh
