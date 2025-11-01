# 🎯 PLANO DE AÇÃO CONSOLIDADO - Newar Insights

**Data:** 2025-11-01
**Objetivo:** Elevar o sistema de **EM DESENVOLVIMENTO (6.8/10)** para **MADURO (9.0/10)** em 8 semanas
**Análises Integradas:** Claude Code Assistant + Análise Externa

---

## 📊 DIAGNÓSTICO ATUAL

### Pontuação por Princípio

| Princípio | Nota Atual | Meta | Gap | Prioridade |
|-----------|------------|------|-----|------------|
| **SOLID** | 7.5/10 | 9.0 | ⬆️ 1.5 | 🔴 ALTA |
| **KISS** | 7.0/10 | 8.5 | ⬆️ 1.5 | 🟡 MÉDIA |
| **YAGNI** | 5.0/10 | 8.0 | ⬆️ 3.0 | 🔴 ALTA |
| **DRY** | 6.5/10 | 9.0 | ⬆️ 2.5 | 🔴 ALTA |
| **DDD** | 6.0/10 | 8.5 | ⬆️ 2.5 | 🟡 MÉDIA |
| **TDD** | 3.0/10 | 8.0 | ⬆️ 5.0 | 🔴 CRÍTICA |

### Arquitetura Health Score

```
ANTES: 4.4/10 (Fragile)
ATUAL: 8.5/10 (Production-Ready)
META:  9.5/10 (Exemplar)
```

### Cobertura de Testes

```
ATUAL:  10% (6 arquivos de teste / 55 arquivos de código)
META:   80% mínimo
```

---

## 🚀 ROADMAP CONSOLIDADO - 8 SEMANAS

### FASE 1: CORREÇÕES CRÍTICAS DE SOLID/DRY (1 semana) 🔴

**Objetivo:** Eliminar duplicações críticas e violações de DIP/OCP

#### 1.1 Centralizar Middlewares Duplicados (DRY + OCP)

**Problema:**
- Middleware de métricas HTTP duplicado em 3 serviços
- Health endpoints duplicados em 3 serviços
- `getEnvOrDefault` duplicado em múltiplos arquivos

**Solução:**

```go
// shared/middleware/http_metrics.go
package middleware

import (
    "time"
    "github.com/gofiber/fiber/v2"
    "github.com/newar/insights/shared/metrics"
)

func HTTPMetrics(collector *metrics.Collector) fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()
        err := c.Next()
        duration := time.Since(start).Seconds()

        status := c.Response().StatusCode()
        method := c.Method()
        path := c.Route().Path

        collector.RecordHTTPRequest(method, path, status, duration)
        collector.RecordHTTPRequestSize(float64(len(c.Body())))
        collector.RecordHTTPResponseSize(float64(len(c.Response().Body())))

        return err
    }
}
```

```go
// shared/health/fiber_handlers.go
package health

import (
    "github.com/gofiber/fiber/v2"
    "github.com/newar/insights/shared/database"
    "github.com/newar/insights/shared/redis"
    healthadvanced "github.com/newar/insights/shared/health"
)

func RegisterHealthEndpoints(app *fiber.App, db database.Database, redis *redis.Client) {
    healthChecker := healthadvanced.NewAdvancedHealthChecker(db, redis)

    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "ok"})
    })

    app.Get("/health/ready", func(c *fiber.Ctx) error {
        status := healthChecker.CheckReadiness(c.Context())
        if !status.Ready {
            return c.Status(503).JSON(status)
        }
        return c.JSON(status)
    })

    app.Get("/health/live", func(c *fiber.Ctx) error {
        status := healthChecker.CheckLiveness(c.Context())
        if !status.Alive {
            return c.Status(503).JSON(status)
        }
        return c.JSON(status)
    })
}
```

```go
// shared/utils/env.go
package utils

import "os"

func GetEnvOrDefault(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

**Impacto:**
- ✅ Remove 300+ linhas duplicadas
- ✅ Mudanças em health/metrics agora em 1 lugar
- ✅ Segue OCP (extensão sem modificação)

**Arquivos a Modificar:**
```
CRIAR:
- shared/middleware/http_metrics.go
- shared/health/fiber_handlers.go
- shared/utils/env.go

MODIFICAR:
- services/api-gateway/main.go (remover duplicação)
- services/bot-manager/main.go (remover duplicação)
- services/admin-api/main.go (remover duplicação)
```

---

#### 1.2 Implementar DIP no Admin API e Bot Manager (SOLID)

**Problema:**
```go
// ❌ Handlers dependem de implementações concretas
type UserHandler struct {
    userRepo *database.UserRepository  // Concreto!
}

type BotHandler struct {
    docker      *orchestrator.DockerOrchestrator  // Concreto!
    meetingRepo *database.MeetingRepository       // Concreto!
}
```

**Solução:**

```go
// services/admin-api/interfaces/repositories.go
package interfaces

import (
    "context"
    "github.com/newar/insights/shared/types"
)

type UserManager interface {
    Create(ctx context.Context, req types.CreateUserRequest) (*types.User, error)
    GetByID(ctx context.Context, id int64) (*types.User, error)
    GetByEmail(ctx context.Context, email string) (*types.User, error)
    List(ctx context.Context, limit, offset int) ([]*types.User, int64, error)
    Delete(ctx context.Context, id int64) error
}

type TokenManager interface {
    Create(ctx context.Context, userID int64, token string) (*types.APIToken, error)
    ValidateToken(ctx context.Context, tokenHash string) (*types.User, error)
    DeleteByUserID(ctx context.Context, userID int64) error
}

type RecordingProvider interface {
    Get(ctx context.Context, filter types.MeetingFilter) (*types.Meeting, error)
    List(ctx context.Context, userID int64, limit, offset int) ([]*types.Meeting, error)
}
```

```go
// services/bot-manager/interfaces/orchestrator.go
package interfaces

import (
    "context"
    "github.com/newar/insights/shared/types"
)

type BotOrchestrator interface {
    SpawnBot(ctx context.Context, meeting *types.Meeting, user *types.User) error
    StopBot(ctx context.Context, sessionID string) error
    GetBotStatus(ctx context.Context, sessionID string) (*types.BotStatus, error)
}

type BotListener interface {
    StartListening(sessionID string, meetingID int64)
    StopListening(sessionID string)
}

type MeetingRepository interface {
    Get(ctx context.Context, filter types.MeetingFilter) (*types.Meeting, error)
    Update(ctx context.Context, filter types.MeetingFilter, update types.MeetingUpdate) error
    GetActiveRecordings(ctx context.Context) ([]*types.Meeting, error)
}
```

```go
// services/admin-api/handlers/users.go (APÓS)
type UserHandler struct {
    userManager interfaces.UserManager  // ✅ Abstração!
}

func NewUserHandler(userManager interfaces.UserManager) *UserHandler {
    return &UserHandler{userManager: userManager}
}
```

**Impacto:**
- ✅ Handlers 100% testáveis com mocks
- ✅ Reduz acoplamento entre camadas
- ✅ Consistência com API Gateway (que já usa interfaces)

**Arquivos a Criar:**
```
- services/admin-api/interfaces/repositories.go
- services/bot-manager/interfaces/orchestrator.go
```

**Arquivos a Modificar:**
```
- services/admin-api/handlers/users.go
- services/admin-api/handlers/tokens.go
- services/admin-api/handlers/recordings.go
- services/admin-api/main.go (injeção via interface)
- services/bot-manager/handlers/bots.go
- services/bot-manager/main.go (injeção via interface)
```

---

#### 1.3 Extrair Server Builder (SOLID - SRP)

**Problema:**
- `main()` tem 150+ linhas fazendo tudo: logging, audit, tracing, metrics, DB, Redis, health, CORS, middlewares, rotas, shutdown

**Solução:**

```go
// shared/server/builder.go
package server

import (
    "context"
    "github.com/gofiber/fiber/v2"
    "github.com/newar/insights/shared/config"
    "github.com/newar/insights/shared/logging"
    "github.com/newar/insights/shared/metrics"
    "github.com/newar/insights/shared/tracing"
    "github.com/newar/insights/shared/shutdown"
)

type ServerBuilder struct {
    app              *fiber.App
    cfg              *config.Config
    metricsCollector *metrics.Collector
    shutdownManager  *shutdown.Manager
}

func NewServerBuilder(serviceName string) (*ServerBuilder, error) {
    // 1. Config
    cfg, err := config.Load(context.Background(), "config")
    if err != nil {
        return nil, err
    }

    // 2. Logging
    logging.Setup(cfg.Logging.Level, cfg.Logging.Format, cfg.Logging.Output)

    // 3. Tracing
    if err := tracing.Initialize(serviceName, cfg.Observability.JaegerEndpoint); err != nil {
        return nil, err
    }

    // 4. Metrics
    metricsCollector := metrics.NewCollector(serviceName)

    // 5. Fiber app
    app := fiber.New(fiber.Config{
        DisableStartupMessage: true,
        ErrorHandler: func(c *fiber.Ctx, err error) error {
            code := fiber.StatusInternalServerError
            if e, ok := err.(*fiber.Error); ok {
                code = e.Code
            }
            return c.Status(code).JSON(fiber.Map{"error": err.Error()})
        },
    })

    // 6. Base middlewares
    app.Use(recover.New())
    app.Use(logger.New())
    app.Use(timeout.New(timeout.Config{Timeout: cfg.Server.Timeout}))

    // 7. CORS (condicional)
    if cfg.Features.EnableCORS {
        app.Use(cors.New(cors.Config{
            AllowOrigins:     cfg.Server.CORSAllowedOrigins,
            AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
            AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-API-Key,X-Admin-API-Key",
            AllowCredentials: true,
        }))
    }

    // 8. HTTP Metrics middleware
    app.Use(middleware.HTTPMetrics(metricsCollector))

    // 9. Shutdown manager
    shutdownManager := shutdown.NewManager()

    return &ServerBuilder{
        app:              app,
        cfg:              cfg,
        metricsCollector: metricsCollector,
        shutdownManager:  shutdownManager,
    }, nil
}

func (b *ServerBuilder) App() *fiber.App { return b.app }
func (b *ServerBuilder) Config() *config.Config { return b.cfg }
func (b *ServerBuilder) Metrics() *metrics.Collector { return b.metricsCollector }
func (b *ServerBuilder) Shutdown() *shutdown.Manager { return b.shutdownManager }

func (b *ServerBuilder) RegisterHealthEndpoints(db database.Database, redis *redis.Client) {
    health.RegisterHealthEndpoints(b.app, db, redis)
}

func (b *ServerBuilder) RegisterMetricsEndpoint() {
    b.app.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))
}

func (b *ServerBuilder) Start() error {
    addr := fmt.Sprintf(":%d", b.cfg.Server.Port)
    return b.app.Listen(addr)
}
```

**Uso Simplificado:**

```go
// services/api-gateway/main.go (DEPOIS)
func main() {
    // 1. Build server
    builder, err := server.NewServerBuilder("api-gateway")
    if err != nil {
        log.Fatal().Err(err).Msg("Failed to create server")
    }
    cfg := builder.Config()

    // 2. Database & Redis
    db, err := database.InitializeDatabase(context.Background(), cfg.Database)
    if err != nil {
        log.Fatal().Err(err).Msg("Failed to initialize database")
    }
    builder.Shutdown().RegisterCleanup("database", db.Close)

    redisClient := redis.NewClient(cfg.Redis.URL)
    builder.Shutdown().RegisterCleanup("redis", redisClient.Close)

    // 3. Health & Metrics
    builder.RegisterHealthEndpoints(db, redisClient)
    builder.RegisterMetricsEndpoint()

    // 4. Repositories (via interfaces)
    meetingRepo := database.NewMeetingRepository(db)
    userRepo := database.NewUserRepository(db)

    // 5. Handlers
    recordingHandler := handlers.NewRecordingHandler(meetingRepo, userRepo, cfg.BotManagerURL)

    // 6. Routes
    api := builder.App().Group("/api")
    api.Post("/recordings", recordingHandler.CreateRecording)
    // ... mais rotas

    // 7. Start
    log.Info().Int("port", cfg.Server.Port).Msg("Starting API Gateway")
    if err := builder.Start(); err != nil {
        log.Fatal().Err(err).Msg("Server error")
    }
}
```

**Impacto:**
- ✅ `main()` reduz de 150 → 40 linhas
- ✅ SRP: cada camada tem responsabilidade única
- ✅ Reutilização: 3 serviços usam mesmo builder

**Arquivos a Criar:**
```
- shared/server/builder.go
```

**Arquivos a Modificar:**
```
- services/api-gateway/main.go (simplificar)
- services/bot-manager/main.go (simplificar)
- services/admin-api/main.go (simplificar)
```

---

### FASE 2: TESTES CRÍTICOS - 40% COBERTURA (2 semanas) 🔴

**Objetivo:** Criar testes para código crítico identificado nas análises

#### 2.1 Testes de Repositórios (Semana 1)

**Prioridade Máxima:**

```go
// shared/database/repositories_test.go
package database_test

import (
    "context"
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "github.com/newar/insights/shared/database"
    "github.com/newar/insights/shared/types"
)

func TestMeetingRepository_Create(t *testing.T) {
    // ARRANGE
    db := setupTestDB(t)
    defer db.Close()
    repo := database.NewMeetingRepository(db)

    req := types.CreateRecordingRequest{
        Platform:  types.PlatformGoogleMeet,
        MeetingID: "abc-defg-hij",
        BotName:   "Test Bot",
    }

    // ACT
    meeting, err := repo.Create(context.Background(), 1, req, "https://meet.google.com/abc-defg-hij")

    // ASSERT
    require.NoError(t, err)
    assert.NotZero(t, meeting.ID)
    assert.Equal(t, types.PlatformGoogleMeet, meeting.Platform)
    assert.Equal(t, "abc-defg-hij", meeting.MeetingID)
    assert.Equal(t, types.StatusRequested, meeting.Status)
}

func TestMeetingRepository_UpdateStatus(t *testing.T) {
    // Table-driven test
    tests := []struct {
        name           string
        initialStatus  types.MeetingStatus
        newStatus      types.MeetingStatus
        recordingPath  *string
        expectError    bool
    }{
        {
            name:          "requested to joining",
            initialStatus: types.StatusRequested,
            newStatus:     types.StatusJoining,
            expectError:   false,
        },
        {
            name:          "active to completed with path",
            initialStatus: types.StatusActive,
            newStatus:     types.StatusCompleted,
            recordingPath: strPtr("final/user_1/recording.webm"),
            expectError:   false,
        },
        // Mais casos...
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // ARRANGE
            db := setupTestDB(t)
            defer db.Close()
            repo := database.NewMeetingRepository(db)

            meeting := createTestMeeting(t, repo, tt.initialStatus)

            // ACT
            err := repo.UpdateStatus(context.Background(), meeting.ID, tt.newStatus, tt.recordingPath, nil, nil)

            // ASSERT
            if tt.expectError {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                updated, _ := repo.Get(context.Background(), types.MeetingFilter{ID: &meeting.ID})
                assert.Equal(t, tt.newStatus, updated.Status)
            }
        })
    }
}

// Helper functions
func setupTestDB(t *testing.T) database.Database {
    db, err := database.NewSQLiteDatabase(":memory:")
    require.NoError(t, err)

    // Run migrations
    // ...

    return db
}

func createTestMeeting(t *testing.T, repo *database.MeetingRepository, status types.MeetingStatus) *types.Meeting {
    // ...
}

func strPtr(s string) *string { return &s }
```

**Arquivos de Teste a Criar:**
```
1. shared/database/repositories_test.go (UserRepository, TokenRepository, MeetingRepository)
2. shared/database/soft_delete_test.go (se soft delete for mantido)
```

**Meta:** 60% cobertura de `shared/database/`

---

#### 2.2 Testes de Handlers (Semana 1)

```go
// services/api-gateway/handlers/recordings_test.go (EXPANDIR)
package handlers_test

import (
    "bytes"
    "context"
    "encoding/json"
    "net/http/httptest"
    "testing"

    "github.com/gofiber/fiber/v2"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"

    "github.com/newar/insights/services/api-gateway/handlers"
    "github.com/newar/insights/shared/types"
)

// Mock MeetingCreator
type MockMeetingCreator struct {
    mock.Mock
}

func (m *MockMeetingCreator) Create(ctx context.Context, userID int64, req types.CreateRecordingRequest, url string) (*types.Meeting, error) {
    args := m.Called(ctx, userID, req, url)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*types.Meeting), args.Error(1)
}

func (m *MockMeetingCreator) Get(ctx context.Context, filter types.MeetingFilter) (*types.Meeting, error) {
    args := m.Called(ctx, filter)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*types.Meeting), args.Error(1)
}

// Mais métodos...

func TestCreateRecording_Success(t *testing.T) {
    // ARRANGE
    mockMeeting := &MockMeetingCreator{}
    mockUser := &MockUserValidator{}
    handler := handlers.NewRecordingHandler(mockMeeting, mockUser, "http://bot-manager:8082")

    app := fiber.New()
    app.Post("/recordings", func(c *fiber.Ctx) error {
        c.Locals("user_id", int64(1))  // Simula middleware de auth
        return handler.CreateRecording(c)
    })

    reqBody := types.CreateRecordingRequest{
        Platform:  types.PlatformGoogleMeet,
        MeetingID: "abc-defg-hij",
        BotName:   "Test Bot",
    }
    body, _ := json.Marshal(reqBody)

    mockMeeting.On("Create", mock.Anything, int64(1), mock.Anything, mock.Anything).
        Return(&types.Meeting{
            ID:        1,
            UserID:    1,
            Platform:  types.PlatformGoogleMeet,
            MeetingID: "abc-defg-hij",
            Status:    types.StatusRequested,
        }, nil)

    mockMeeting.On("CountActiveByUser", mock.Anything, int64(1)).Return(0, nil)

    // ACT
    req := httptest.NewRequest("POST", "/recordings", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    resp, _ := app.Test(req)

    // ASSERT
    assert.Equal(t, 201, resp.StatusCode)
    mockMeeting.AssertExpectations(t)
}

func TestCreateRecording_InvalidPlatform(t *testing.T) {
    // ARRANGE
    mockMeeting := &MockMeetingCreator{}
    mockUser := &MockUserValidator{}
    handler := handlers.NewRecordingHandler(mockMeeting, mockUser, "http://bot-manager:8082")

    app := fiber.New()
    app.Post("/recordings", func(c *fiber.Ctx) error {
        c.Locals("user_id", int64(1))
        return handler.CreateRecording(c)
    })

    reqBody := types.CreateRecordingRequest{
        Platform:  "unsupported_platform",
        MeetingID: "abc-defg-hij",
    }
    body, _ := json.Marshal(reqBody)

    // ACT
    req := httptest.NewRequest("POST", "/recordings", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    resp, _ := app.Test(req)

    // ASSERT
    assert.Equal(t, 400, resp.StatusCode)

    var respBody map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&respBody)
    assert.Contains(t, respBody["error"], "unsupported platform")
}
```

**Arquivos de Teste a Criar:**
```
1. services/api-gateway/handlers/recordings_test.go (expandir)
2. services/admin-api/handlers/users_test.go
3. services/admin-api/handlers/tokens_test.go
4. services/bot-manager/handlers/bots_test.go
```

**Meta:** 50% cobertura de handlers

---

#### 2.3 Testes Críticos de Orchestration (Semana 2)

**PRIORIDADE MÁXIMA - Bugs foram encontrados aqui!**

```go
// services/bot-manager/orchestrator/reconciler_test.go
package orchestrator_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"

    "github.com/newar/insights/services/bot-manager/orchestrator"
    "github.com/newar/insights/shared/types"
)

type MockMeetingRepository struct {
    mock.Mock
}

func (m *MockMeetingRepository) GetActiveRecordings(ctx context.Context) ([]*types.Meeting, error) {
    args := m.Called(ctx)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).([]*types.Meeting), args.Error(1)
}

type MockDockerClient struct {
    mock.Mock
    AttachedListeners int
}

func (m *MockDockerClient) ListContainersWithLabels(ctx context.Context, labels map[string]string) ([]string, error) {
    args := m.Called(ctx, labels)
    return args.Get(0).([]string), args.Error(1)
}

func TestReconcileActiveRecordings_Success(t *testing.T) {
    // ARRANGE
    mockDB := &MockMeetingRepository{}
    mockDocker := &MockDockerClient{}
    mockListener := &MockStatusListener{}

    reconciler := orchestrator.NewReconciler(mockDB, mockDocker, mockListener)

    activeRecordings := []*types.Meeting{
        {ID: 1, RecordingSessionID: "session-1", Status: types.StatusActive},
        {ID: 2, RecordingSessionID: "session-2", Status: types.StatusRecording},
        {ID: 3, RecordingSessionID: "session-3", Status: types.StatusJoining},
    }

    mockDB.On("GetActiveRecordings", mock.Anything).Return(activeRecordings, nil)
    mockDocker.On("ListContainersWithLabels", mock.Anything, mock.Anything).
        Return([]string{"container-1", "container-2", "container-3"}, nil)
    mockListener.On("StartListening", mock.Anything, mock.Anything).Return()

    // ACT
    err := reconciler.ReconcileActiveRecordings(context.Background())

    // ASSERT
    assert.NoError(t, err)
    assert.Equal(t, 3, mockListener.ActiveListeners)
    mockDB.AssertExpectations(t)
    mockDocker.AssertExpectations(t)
    mockListener.AssertCalled(t, "StartListening", "session-1", int64(1))
    mockListener.AssertCalled(t, "StartListening", "session-2", int64(2))
    mockListener.AssertCalled(t, "StartListening", "session-3", int64(3))
}

func TestReconcileActiveRecordings_MissingContainer(t *testing.T) {
    // ARRANGE
    mockDB := &MockMeetingRepository{}
    mockDocker := &MockDockerClient{}

    reconciler := orchestrator.NewReconciler(mockDB, mockDocker, nil)

    activeRecordings := []*types.Meeting{
        {ID: 1, RecordingSessionID: "session-1", Status: types.StatusActive},
    }

    mockDB.On("GetActiveRecordings", mock.Anything).Return(activeRecordings, nil)
    mockDocker.On("ListContainersWithLabels", mock.Anything, mock.Anything).
        Return([]string{}, nil)  // Nenhum container encontrado!

    mockDB.On("Update", mock.Anything, mock.Anything, mock.Anything).Return(nil)

    // ACT
    err := reconciler.ReconcileActiveRecordings(context.Background())

    // ASSERT
    assert.NoError(t, err)
    // Verifica que meeting foi marcada como "failed"
    mockDB.AssertCalled(t, "Update", mock.Anything, mock.MatchedBy(func(filter types.MeetingFilter) bool {
        return *filter.RecordingSessionID == "session-1"
    }), mock.MatchedBy(func(update types.MeetingUpdate) bool {
        return *update.Status == types.StatusFailed
    }))
}
```

**Arquivos de Teste a Criar:**
```
1. services/bot-manager/orchestrator/reconciler_test.go (CRÍTICO)
2. services/bot-manager/orchestrator/listener_test.go (goroutine leaks)
3. services/bot-manager/finalizer/concat_test.go (command injection)
4. services/bot-manager/orchestrator/docker_test.go
5. services/bot-manager/cleaner/cleaner_test.go
```

**Meta:** 70% cobertura de `services/bot-manager/`

---

#### 2.4 Testes de State Machine (Semana 2)

```go
// shared/types/state_machine_test.go
package types_test

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/newar/insights/shared/types"
)

func TestStateTransitions(t *testing.T) {
    tests := []struct {
        name  string
        from  types.MeetingStatus
        to    types.MeetingStatus
        valid bool
    }{
        // Valid transitions
        {"requested to joining", types.StatusRequested, types.StatusJoining, true},
        {"joining to active", types.StatusJoining, types.StatusActive, true},
        {"active to recording", types.StatusActive, types.StatusRecording, true},
        {"recording to finalizing", types.StatusRecording, types.StatusFinalizing, true},
        {"finalizing to completed", types.StatusFinalizing, types.StatusCompleted, true},

        // Any status to failed
        {"requested to failed", types.StatusRequested, types.StatusFailed, true},
        {"active to failed", types.StatusActive, types.StatusFailed, true},

        // Invalid transitions
        {"requested to completed", types.StatusRequested, types.StatusCompleted, false},
        {"active to requested", types.StatusActive, types.StatusRequested, false},
        {"completed to active", types.StatusCompleted, types.StatusActive, false},
        {"failed to active", types.StatusFailed, types.StatusActive, false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // ACT
            err := types.ValidateTransition(tt.from, tt.to)

            // ASSERT
            if tt.valid {
                assert.NoError(t, err, "Expected valid transition from %s to %s", tt.from, tt.to)
            } else {
                assert.Error(t, err, "Expected invalid transition from %s to %s", tt.from, tt.to)
            }
        })
    }
}
```

**Arquivos de Teste a Criar:**
```
1. shared/types/state_machine_test.go
```

---

#### 2.5 Testes de Middleware (Semana 2)

```go
// services/api-gateway/middleware/auth_test.go
package middleware_test

import (
    "net/http/httptest"
    "testing"

    "github.com/gofiber/fiber/v2"
    "github.com/stretchr/testify/assert"

    "github.com/newar/insights/services/api-gateway/middleware"
    "github.com/newar/insights/shared/database"
)

func TestAuthenticate_ValidToken(t *testing.T) {
    // ARRANGE
    db := setupTestDB(t)
    defer db.Close()

    // Criar usuário e token de teste
    userRepo := database.NewUserRepository(db)
    user, _ := userRepo.Create(context.Background(), types.CreateUserRequest{
        Email: "test@example.com",
        Name:  "Test User",
    })

    tokenRepo := database.NewTokenRepository(db)
    token, _ := tokenRepo.Create(context.Background(), user.ID, "vxa_live_test_token")

    app := fiber.New()
    app.Use(middleware.Authenticate(db))
    app.Get("/protected", func(c *fiber.Ctx) error {
        userID := c.Locals("user_id").(int64)
        return c.JSON(fiber.Map{"user_id": userID})
    })

    // ACT
    req := httptest.NewRequest("GET", "/protected", nil)
    req.Header.Set("X-API-Key", "vxa_live_test_token")
    resp, _ := app.Test(req)

    // ASSERT
    assert.Equal(t, 200, resp.StatusCode)
}

func TestAuthenticate_MissingToken(t *testing.T) {
    // ARRANGE
    db := setupTestDB(t)
    defer db.Close()

    app := fiber.New()
    app.Use(middleware.Authenticate(db))
    app.Get("/protected", func(c *fiber.Ctx) error {
        return c.SendString("OK")
    })

    // ACT
    req := httptest.NewRequest("GET", "/protected", nil)
    // Sem header X-API-Key
    resp, _ := app.Test(req)

    // ASSERT
    assert.Equal(t, 401, resp.StatusCode)
}
```

**Arquivos de Teste a Criar:**
```
1. services/api-gateway/middleware/auth_test.go
2. services/api-gateway/middleware/ratelimit_test.go
3. services/api-gateway/middleware/bot_ratelimit_test.go (ativar o .bak)
```

---

#### 2.6 Testes TypeScript - Recording Bot (Semana 2)

```typescript
// services/recording-bot/src/auto-cleanup.test.ts
import { AutoCleanup } from './auto-cleanup';
import { RedisClient } from './redis-client';
import { Recorder } from './recorder';

jest.mock('./redis-client');
jest.mock('./recorder');

describe('AutoCleanup', () => {
  let autoCleanup: AutoCleanup;
  let mockRedisClient: jest.Mocked<RedisClient>;
  let mockRecorder: jest.Mocked<Recorder>;

  beforeEach(() => {
    mockRedisClient = new RedisClient('redis://mock') as jest.Mocked<RedisClient>;
    mockRecorder = new Recorder() as jest.Mocked<Recorder>;
    autoCleanup = new AutoCleanup(mockRedisClient, mockRecorder, 'session-123');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkIfAlone', () => {
    it('should trigger cleanup when bot is alone for 30+ seconds', async () => {
      // ARRANGE
      const mockPage = {
        $eval: jest.fn().mockResolvedValue(1), // Only bot in meeting
      };
      mockRecorder.stopRecording = jest.fn();
      mockRedisClient.publishStatus = jest.fn();

      // ACT
      await autoCleanup.checkIfAlone(mockPage as any);

      // Wait 31 seconds
      jest.advanceTimersByTime(31000);

      // ASSERT
      expect(mockRecorder.stopRecording).toHaveBeenCalled();
      expect(mockRedisClient.publishStatus).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({ reason: 'alone' })
      );
    });

    it('should NOT trigger cleanup if participants join within 30 seconds', async () => {
      // ARRANGE
      const mockPage = {
        $eval: jest.fn()
          .mockResolvedValueOnce(1)  // Alone
          .mockResolvedValueOnce(3), // Participants joined
      };
      mockRecorder.stopRecording = jest.fn();

      // ACT
      await autoCleanup.checkIfAlone(mockPage as any);
      jest.advanceTimersByTime(15000);  // 15s
      await autoCleanup.checkIfAlone(mockPage as any);
      jest.advanceTimersByTime(16000);  // +16s = 31s total

      // ASSERT
      expect(mockRecorder.stopRecording).not.toHaveBeenCalled();
    });
  });

  describe('checkMeetingEnded', () => {
    it('should trigger cleanup when meeting ends', async () => {
      // ARRANGE
      const mockPage = {
        $: jest.fn().mockResolvedValue(null), // Meeting ended
      };
      mockRecorder.stopRecording = jest.fn();
      mockRedisClient.publishStatus = jest.fn();

      // ACT
      await autoCleanup.checkMeetingEnded(mockPage as any);

      // ASSERT
      expect(mockRecorder.stopRecording).toHaveBeenCalled();
      expect(mockRedisClient.publishStatus).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({ reason: 'meeting_ended' })
      );
    });
  });
});
```

```typescript
// services/recording-bot/src/redis-client.test.ts
import { RedisClient } from './redis-client';
import { createClient } from 'redis';

jest.mock('redis');

describe('RedisClient', () => {
  let redisClient: RedisClient;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      on: jest.fn(),
    };
    (createClient as jest.Mock).mockReturnValue(mockClient);

    redisClient = new RedisClient('redis://localhost:6379');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishStatus', () => {
    it('should publish status to correct Redis channel', async () => {
      // ARRANGE
      const sessionID = 'session-123';
      const status = {
        status: 'active',
        timestamp: Date.now(),
      };

      // ACT
      await redisClient.publishStatus(sessionID, status);

      // ASSERT
      expect(mockClient.publish).toHaveBeenCalledWith(
        `bot:status:${sessionID}`,
        JSON.stringify(status)
      );
    });

    it('should retry on failure', async () => {
      // ARRANGE
      mockClient.publish
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(1);  // Success on retry

      // ACT
      await redisClient.publishStatus('session-123', { status: 'active' });

      // ASSERT
      expect(mockClient.publish).toHaveBeenCalledTimes(2);
    });
  });
});
```

**Arquivos de Teste a Criar:**
```
1. services/recording-bot/src/auto-cleanup.test.ts
2. services/recording-bot/src/redis-client.test.ts
3. services/recording-bot/src/recorder.test.ts
4. services/recording-bot/src/uploader.test.ts
5. services/recording-bot/src/connection-monitor.test.ts
```

**Meta:** 60% cobertura de `services/recording-bot/src/`

---

### FASE 3: REFATORAÇÃO DDD E CAMADAS (1 semana) 🟡

**Objetivo:** Mover lógica de negócio para domain layer, implementar linguagem ubíqua

#### 3.1 Criar Domain Layer

```go
// shared/domain/recording.go
package domain

import (
    "errors"
    "time"
    "github.com/newar/insights/shared/types"
)

// Recording é a entidade raiz do agregado Recording
type Recording struct {
    id                  int64
    userID              int64
    platform            types.Platform
    meetingID           string
    meetingURL          string
    botName             string
    sessionID           string
    containerID         string
    status              types.MeetingStatus
    recordingPath       *string
    recordingURL        *string
    recordingDuration   *int
    errorMessage        *string
    createdAt           time.Time
    updatedAt           time.Time
    finalizedAt         *time.Time
}

// Constructor (factory method)
func NewRecording(userID int64, req types.CreateRecordingRequest, meetingURL string) (*Recording, error) {
    // Validação de negócio
    if req.Platform != types.PlatformGoogleMeet {
        return nil, errors.New("only Google Meet is currently supported")
    }

    if len(req.MeetingID) < 3 {
        return nil, errors.New("meeting ID must be at least 3 characters")
    }

    botName := req.BotName
    if botName == "" {
        botName = "Newar Recording Bot"
    }

    return &Recording{
        userID:     userID,
        platform:   req.Platform,
        meetingID:  req.MeetingID,
        meetingURL: meetingURL,
        botName:    botName,
        status:     types.StatusRequested,
        createdAt:  time.Now(),
        updatedAt:  time.Now(),
    }, nil
}

// Métodos de domínio (comportamento)

func (r *Recording) Start(sessionID, containerID string) error {
    if r.status != types.StatusRequested {
        return errors.New("recording can only start from 'requested' status")
    }

    r.sessionID = sessionID
    r.containerID = containerID
    r.status = types.StatusJoining
    r.updatedAt = time.Now()
    return nil
}

func (r *Recording) Activate() error {
    if r.status != types.StatusJoining {
        return errors.New("recording can only activate from 'joining' status")
    }

    r.status = types.StatusActive
    r.updatedAt = time.Now()
    return nil
}

func (r *Recording) StartRecording() error {
    if r.status != types.StatusActive {
        return errors.New("recording can only start from 'active' status")
    }

    r.status = types.StatusRecording
    r.updatedAt = time.Now()
    return nil
}

func (r *Recording) Finalize(recordingPath string, duration int) error {
    if r.status != types.StatusRecording && r.status != types.StatusActive {
        return errors.New("can only finalize from 'recording' or 'active' status")
    }

    r.status = types.StatusFinalizing
    r.recordingPath = &recordingPath
    r.recordingDuration = &duration
    r.updatedAt = time.Now()
    return nil
}

func (r *Recording) Complete(finalPath string) error {
    if r.status != types.StatusFinalizing {
        return errors.New("can only complete from 'finalizing' status")
    }

    r.status = types.StatusCompleted
    r.recordingPath = &finalPath
    now := time.Now()
    r.updatedAt = now
    r.finalizedAt = &now
    return nil
}

func (r *Recording) Fail(errorMsg string) error {
    // Pode falhar de qualquer status (exceto completed)
    if r.status == types.StatusCompleted {
        return errors.New("cannot fail a completed recording")
    }

    r.status = types.StatusFailed
    r.errorMessage = &errorMsg
    r.updatedAt = time.Now()
    return nil
}

// Invariants

func (r *Recording) CanTransitionTo(newStatus types.MeetingStatus) bool {
    return types.ValidateTransition(r.status, newStatus) == nil
}

func (r *Recording) IsActive() bool {
    return r.status == types.StatusActive || r.status == types.StatusRecording
}

func (r *Recording) IsFinished() bool {
    return r.status == types.StatusCompleted || r.status == types.StatusFailed
}

// Getters (encapsulamento)

func (r *Recording) ID() int64                        { return r.id }
func (r *Recording) UserID() int64                    { return r.userID }
func (r *Recording) Platform() types.Platform         { return r.platform }
func (r *Recording) MeetingID() string                { return r.meetingID }
func (r *Recording) MeetingURL() string               { return r.meetingURL }
func (r *Recording) BotName() string                  { return r.botName }
func (r *Recording) SessionID() string                { return r.sessionID }
func (r *Recording) ContainerID() string              { return r.containerID }
func (r *Recording) Status() types.MeetingStatus      { return r.status }
func (r *Recording) RecordingPath() *string           { return r.recordingPath }
func (r *Recording) RecordingDuration() *int          { return r.recordingDuration }
func (r *Recording) ErrorMessage() *string            { return r.errorMessage }
func (r *Recording) CreatedAt() time.Time             { return r.createdAt }
func (r *Recording) UpdatedAt() time.Time             { return r.updatedAt }
func (r *Recording) FinalizedAt() *time.Time          { return r.finalizedAt }

// ToDTO para camada de aplicação/apresentação
func (r *Recording) ToDTO() *types.Meeting {
    return &types.Meeting{
        ID:                r.id,
        UserID:            r.userID,
        Platform:          r.platform,
        MeetingID:         r.meetingID,
        MeetingURL:        r.meetingURL,
        BotName:           r.botName,
        RecordingSessionID: r.sessionID,
        BotContainerID:    r.containerID,
        Status:            r.status,
        RecordingPath:     r.recordingPath,
        RecordingURL:      r.recordingURL,
        RecordingDuration: r.recordingDuration,
        ErrorMessage:      r.errorMessage,
        CreatedAt:         r.createdAt,
        UpdatedAt:         r.updatedAt,
        FinalizedAt:       r.finalizedAt,
    }
}
```

**Uso em Handlers:**

```go
// services/api-gateway/handlers/recordings.go (DEPOIS)
func (h *RecordingHandler) CreateRecording(c *fiber.Ctx) error {
    userID := c.Locals("user_id").(int64)

    var req types.CreateRecordingRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
    }

    // ✅ Domain layer faz validação
    recording, err := domain.NewRecording(userID, req, utils.BuildMeetingURL(req))
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    // Salvar via repository (que aceita *domain.Recording ou converte ToDTO())
    saved, err := h.meetingCreator.Create(ctx, recording.ToDTO())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Failed to create recording"})
    }

    return c.Status(201).JSON(saved)
}
```

**Impacto:**
- ✅ Regras de negócio encapsuladas
- ✅ Invariantes garantidos
- ✅ Testabilidade máxima (domínio puro, sem infraestrutura)
- ✅ Linguagem ubíqua: "Recording" (não "Meeting")

**Arquivos a Criar:**
```
- shared/domain/recording.go
- shared/domain/recording_test.go (testes puros de domínio)
- shared/domain/user.go (Value Objects: Email, Name)
- shared/domain/session.go (Value Object: SessionID)
```

**Arquivos a Modificar:**
```
- services/api-gateway/handlers/recordings.go (usar domain.NewRecording)
- services/bot-manager/orchestrator/docker.go (usar recording.Start())
- shared/database/repositories.go (aceitar domain.Recording ou DTO)
```

---

#### 3.2 Padronizar Linguagem Ubíqua

**Decisão:**
- ✅ **"Recording"** é o termo correto (não "Meeting")
- ✅ Renomear tabela `meetings` → `recordings`
- ✅ Renomear `MeetingRepository` → `RecordingRepository`
- ✅ Atualizar toda documentação

**Migration:**

```sql
-- migrations/008_rename_meetings_to_recordings.sql
ALTER TABLE meetings RENAME TO recordings;

-- Indexes já existem, apenas renomear se necessário
-- CREATE INDEX idx_recordings_status ON recordings(status);
-- CREATE INDEX idx_recordings_user_status ON recordings(user_id, status);
```

**Impacto:**
- ✅ Código reflete domínio real
- ✅ Consistência na comunicação com stakeholders
- ⚠️ Breaking change (requer coordenação de deploy)

**Arquivos a Modificar:**
```
- migrations/008_rename_meetings_to_recordings.sql (CRIAR)
- shared/database/repositories.go (MeetingRepository → RecordingRepository)
- services/api-gateway/interfaces/repositories.go (MeetingCreator → RecordingCreator)
- Todos os handlers e documentação
```

---

### FASE 4: REMOVER OVER-ENGINEERING (YAGNI) (1 semana) 🟡

**Objetivo:** Reduzir complexidade desnecessária, focar no essencial

#### 4.1 Remover Pacotes Não Utilizados

**Análise de Uso Real:**

```
✅ MANTER (em uso ativo):
- shared/config/          ✅ Viper config carregado em main()
- shared/health/          ✅ Health endpoints ativos
- shared/logging/         ✅ Zerolog configurado
- shared/metrics/         ✅ Prometheus metrics coletados
- shared/shutdown/        ✅ Graceful shutdown implementado
- shared/tracing/         ✅ OpenTelemetry configurado
- shared/database/        ✅ Core do sistema
- shared/redis/           ✅ Pub/sub essencial
- shared/types/           ✅ Tipos compartilhados
- shared/constants/       ✅ Constantes usadas
- shared/utils/           ✅ Utilitários ativos

❌ REMOVER (não usados ou prematuros):
- shared/audit/           ❌ Não há requisito de compliance/auditoria
- shared/retention/       ❌ Não há LGPD implementada
- shared/secrets/         ❌ Apenas 1 secret = over-engineering
- shared/validation/      ❌ Duplica shared/validators/
- shared/middleware/circuit_breaker.go ❌ Apenas 1 chamada HTTP externa
- shared/middleware/retry.go          ❌ Não usado (Redis tem retry próprio)

⚠️ SIMPLIFICAR:
- shared/features/        ⚠️ Usado, mas apenas 1 feature flag (CORS)
```

**Plano de Remoção:**

```bash
# 1. Remover pacotes não utilizados
rm -rf shared/audit/
rm -rf shared/retention/
rm -rf shared/secrets/
rm -rf shared/validation/
rm shared/middleware/circuit_breaker.go
rm shared/middleware/retry.go

# 2. Consolidar validators
# Mover shared/validation/* → shared/validators/ (se houver diferenças)

# 3. Simplificar features
# Se apenas CORS, mover para config direto (sem feature flag abstraction)
```

**Antes (main.go):**
```go
// ❌ Over-engineering
featureFlags := features.NewManager()
if featureFlags.IsEnabled("cors") {
    // Configure CORS
}
```

**Depois (main.go):**
```go
// ✅ Simples
if cfg.Server.EnableCORS {
    app.Use(cors.New(cors.Config{...}))
}
```

**Impacto:**
- ✅ Reduz ~5000 LOC → ~2000 LOC ativos
- ✅ Menos abstrações = mais fácil de entender
- ✅ Build mais rápido

**Arquivos a Remover:**
```
- shared/audit/
- shared/retention/
- shared/secrets/
- shared/validation/
- shared/middleware/circuit_breaker.go
- shared/middleware/retry.go
```

**Arquivos a Modificar:**
```
- services/api-gateway/main.go (remover imports não usados)
- services/bot-manager/main.go (remover imports não usados)
- services/admin-api/main.go (remover imports não usados)
- go.mod (go mod tidy para limpar dependências)
```

---

#### 4.2 Remover Soft Delete Não Implementado

**Análise:**
```
- shared/database/soft_delete.go existe
- Migrations NÃO têm coluna deleted_at
- UI NÃO tem funcionalidade "restaurar"
- Conclusão: YAGNI violation
```

**Ação:**
```bash
rm shared/database/soft_delete.go
```

**Quando reintroduzir:**
- Quando houver requisito de "restaurar registros deletados"
- Quando houver UI para listar itens deletados
- Quando houver compliance requirement para manter histórico

---

#### 4.3 Aplicar State Machine Validation

**Problema:**
- `shared/types/state_machine.go` implementado mas NÃO usado

**Solução:**

```go
// shared/database/repositories.go (ANTES)
func (r *MeetingRepository) UpdateStatus(ctx context.Context, id int64, status types.MeetingStatus, ...) error {
    // ❌ Sem validação de transição
    query := `UPDATE meetings SET status = ?, updated_at = ? WHERE id = ?`
    _, err := r.db.Exec(ctx, query, status, time.Now(), id)
    return err
}
```

```go
// shared/database/repositories.go (DEPOIS)
func (r *MeetingRepository) UpdateStatus(ctx context.Context, id int64, newStatus types.MeetingStatus, ...) error {
    // 1. Buscar status atual
    current, err := r.Get(ctx, types.MeetingFilter{ID: &id})
    if err != nil {
        return err
    }

    // 2. ✅ Validar transição
    if err := types.ValidateTransition(current.Status, newStatus); err != nil {
        return fmt.Errorf("invalid state transition: %w", err)
    }

    // 3. Atualizar
    query := `UPDATE meetings SET status = ?, updated_at = ? WHERE id = ?`
    _, err = r.db.Exec(ctx, query, newStatus, time.Now(), id)
    return err
}
```

**Impacto:**
- ✅ Previne transições inválidas
- ✅ Garante integridade do estado
- ✅ Usa código já implementado (não é YAGNI, é ativar funcionalidade)

---

### FASE 5: TESTES AVANÇADOS - 80% COBERTURA (2 semanas) 🟡

**Objetivo:** Atingir meta de 80% cobertura com testes de integração e edge cases

#### 5.1 Testes de Integração (Semana 1)

```go
// tests/integration/recording_flow_test.go
package integration_test

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"

    "github.com/newar/insights/shared/database"
    "github.com/newar/insights/shared/types"
    "github.com/newar/insights/services/bot-manager/orchestrator"
    "github.com/newar/insights/services/bot-manager/finalizer"
)

func TestFullRecordingFlow_Success(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test")
    }

    // ARRANGE
    env := SetupIntegrationEnvironment(t)
    defer env.Teardown()

    // 1. Create user
    userRepo := database.NewUserRepository(env.DB)
    user, err := userRepo.Create(context.Background(), types.CreateUserRequest{
        Email: "test@example.com",
        Name:  "Test User",
    })
    require.NoError(t, err)

    // 2. Create recording
    recordingRepo := database.NewMeetingRepository(env.DB)
    recording, err := recordingRepo.Create(context.Background(), user.ID, types.CreateRecordingRequest{
        Platform:  types.PlatformGoogleMeet,
        MeetingID: "test-meeting-123",
        BotName:   "Test Bot",
    }, "https://meet.google.com/test-meeting-123")
    require.NoError(t, err)

    // ACT - Simulate bot lifecycle

    // 3. Bot spawns
    docker := orchestrator.NewDockerOrchestrator(env.DockerClient, recordingRepo, env.Redis)
    err = docker.SpawnBot(context.Background(), recording, user)
    require.NoError(t, err)

    // Wait for container to start
    time.Sleep(2 * time.Second)

    // 4. Bot joins meeting
    err = recordingRepo.UpdateStatus(context.Background(), recording.ID, types.StatusJoining, nil, nil, nil)
    require.NoError(t, err)

    // 5. Bot becomes active
    err = recordingRepo.UpdateStatus(context.Background(), recording.ID, types.StatusActive, nil, nil, nil)
    require.NoError(t, err)

    // 6. Bot starts recording
    err = recordingRepo.UpdateStatus(context.Background(), recording.ID, types.StatusRecording, nil, nil, nil)
    require.NoError(t, err)

    // 7. Simulate chunks being uploaded
    chunkDir := fmt.Sprintf("storage/recordings/temp/user_%d/recording_%d", user.ID, recording.ID)
    os.MkdirAll(chunkDir, 0755)
    for i := 0; i < 5; i++ {
        chunkPath := filepath.Join(chunkDir, fmt.Sprintf("chunk_%03d.webm", i))
        os.WriteFile(chunkPath, []byte("fake audio data"), 0644)
    }

    // 8. Recording ends (finalizing)
    path := fmt.Sprintf("temp/user_%d/recording_%d", user.ID, recording.ID)
    err = recordingRepo.UpdateStatus(context.Background(), recording.ID, types.StatusFinalizing, &path, nil, nil)
    require.NoError(t, err)

    // 9. Finalize recording (concat chunks)
    fin := finalizer.NewConcatenator(recordingRepo)
    err = fin.FinalizeRecording(context.Background(), recording.ID)
    require.NoError(t, err)

    // ASSERT
    finalized, err := recordingRepo.Get(context.Background(), types.MeetingFilter{ID: &recording.ID})
    require.NoError(t, err)

    assert.Equal(t, types.StatusCompleted, finalized.Status)
    assert.NotNil(t, finalized.RecordingPath)
    assert.Contains(t, *finalized.RecordingPath, "final/")
    assert.NotNil(t, finalized.FinalizedAt)

    // Check file exists
    finalPath := filepath.Join("storage/recordings", *finalized.RecordingPath)
    _, err = os.Stat(finalPath)
    assert.NoError(t, err, "Final recording file should exist")
}

func TestRecordingFlow_BotCrashDuringRecording(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test")
    }

    // ARRANGE
    env := SetupIntegrationEnvironment(t)
    defer env.Teardown()

    // Create user and recording
    // ...

    // ACT
    // 1. Spawn bot
    // 2. Bot starts recording
    // 3. Simulate bot crash (kill container)
    docker := orchestrator.NewDockerOrchestrator(env.DockerClient, recordingRepo, env.Redis)
    err := docker.StopBot(context.Background(), recording.RecordingSessionID)
    require.NoError(t, err)

    // 4. Reconciliation detects crashed bot
    reconciler := orchestrator.NewReconciler(recordingRepo, env.DockerClient, nil)
    err = reconciler.ReconcileOrphanChunks(context.Background())
    require.NoError(t, err)

    // ASSERT
    updated, _ := recordingRepo.Get(context.Background(), types.MeetingFilter{ID: &recording.ID})
    assert.Equal(t, types.StatusFailed, updated.Status)
    assert.NotNil(t, updated.ErrorMessage)
    assert.Contains(t, *updated.ErrorMessage, "bot crashed")
}
```

**Arquivos de Teste a Criar:**
```
1. tests/integration/recording_flow_test.go (fluxo completo)
2. tests/integration/reconciliation_test.go (recovery scenarios)
3. tests/integration/finalizer_test.go (FFmpeg concatenation)
4. tests/integration/redis_pubsub_test.go (Redis messaging)
```

---

#### 5.2 Edge Cases e Stress Tests (Semana 2)

```go
// shared/database/repositories_stress_test.go
func TestConcurrentRecordingCreation(t *testing.T) {
    // ARRANGE
    db := setupTestDB(t)
    defer db.Close()
    repo := database.NewMeetingRepository(db)

    const numGoroutines = 50
    const recordingsPerGoroutine = 10

    // ACT - Create recordings concurrently
    var wg sync.WaitGroup
    errors := make(chan error, numGoroutines*recordingsPerGoroutine)

    for i := 0; i < numGoroutines; i++ {
        wg.Add(1)
        go func(userID int64) {
            defer wg.Done()
            for j := 0; j < recordingsPerGoroutine; j++ {
                _, err := repo.Create(context.Background(), userID, types.CreateRecordingRequest{
                    Platform:  types.PlatformGoogleMeet,
                    MeetingID: fmt.Sprintf("meeting-%d-%d", userID, j),
                }, "https://meet.google.com/test")
                if err != nil {
                    errors <- err
                }
            }
        }(int64(i))
    }

    wg.Wait()
    close(errors)

    // ASSERT
    errorCount := 0
    for err := range errors {
        t.Logf("Error: %v", err)
        errorCount++
    }

    assert.Equal(t, 0, errorCount, "Should have no errors during concurrent creation")

    // Verify all recordings created
    recordings, err := repo.ListAll(context.Background())
    require.NoError(t, err)
    assert.Equal(t, numGoroutines*recordingsPerGoroutine, len(recordings))
}

func TestStateTransitionRaceCondition(t *testing.T) {
    // ARRANGE
    db := setupTestDB(t)
    defer db.Close()
    repo := database.NewMeetingRepository(db)

    recording, _ := repo.Create(context.Background(), 1, types.CreateRecordingRequest{
        Platform:  types.PlatformGoogleMeet,
        MeetingID: "race-test",
    }, "https://meet.google.com/test")

    // ACT - Multiple goroutines trying to update status
    var wg sync.WaitGroup
    transitions := []types.MeetingStatus{
        types.StatusJoining,
        types.StatusActive,
        types.StatusRecording,
    }

    for _, status := range transitions {
        wg.Add(1)
        go func(s types.MeetingStatus) {
            defer wg.Done()
            repo.UpdateStatus(context.Background(), recording.ID, s, nil, nil, nil)
        }(status)
    }

    wg.Wait()

    // ASSERT
    final, _ := repo.Get(context.Background(), types.MeetingFilter{ID: &recording.ID})
    // Final status should be one of the valid transitions
    assert.Contains(t, transitions, final.Status)
}
```

**Arquivos de Teste a Criar:**
```
1. shared/database/repositories_stress_test.go (concurrency)
2. services/bot-manager/orchestrator/docker_stress_test.go (múltiplos bots)
3. services/api-gateway/handlers/recordings_edge_cases_test.go
```

---

### FASE 6: VALIDAÇÃO E DOCUMENTAÇÃO FINAL (1 semana) 🟢

**Objetivo:** Garantir 100% funcionalidade, documentar decisões, atingir nível MADURO

#### 6.1 Validação de Cobertura e Qualidade

**Checklist:**

```bash
# 1. Executar testes com cobertura
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html

# Verificar cobertura atingiu 80%+
go tool cover -func=coverage.out | grep total

# 2. Executar análise de código
golangci-lint run --timeout 10m

# 3. Executar testes de integração
go test ./tests/integration/... -v -timeout 30m

# 4. Executar E2E tests
make test-e2e

# 5. Executar script de análise
./scripts/analyze-architecture.sh
./scripts/analyze-code.sh
```

**Metas:**
- ✅ Cobertura de testes: 80%+
- ✅ Golangci-lint: 0 erros críticos
- ✅ E2E tests: 100% pass rate
- ✅ Architecture score: 9.5/10

---

#### 6.2 Documentação de Decisões (ADRs)

```markdown
# docs/architecture/ADR-001-use-interfaces-for-DIP.md

# ADR 001: Use Interfaces for Dependency Inversion

**Status:** Accepted (2025-11-01)

## Context

Handlers in admin-api and bot-manager were depending on concrete implementations (*UserRepository, *DockerOrchestrator), making them impossible to mock for testing and violating DIP.

## Decision

Create service-specific interfaces in `services/*/interfaces/` and update handlers to depend on abstractions.

## Consequences

**Positive:**
- Handlers are now 100% testable with mocks
- Reduced coupling between layers
- Consistent with api-gateway architecture

**Negative:**
- More files to maintain (3 new interface files)
- Slight increase in boilerplate

**Implementation:**
- `services/admin-api/interfaces/repositories.go`
- `services/bot-manager/interfaces/orchestrator.go`
```

```markdown
# docs/architecture/ADR-002-remove-unused-packages-yagni.md

# ADR 002: Remove Unused Production Packages (YAGNI)

**Status:** Accepted (2025-11-01)

## Context

Phase 9 introduced 32 shared packages for production readiness. Analysis showed ~40% were unused:
- audit/ (no compliance requirement)
- retention/ (no LGPD)
- secrets/ (only 1 secret)
- circuit_breaker.go (only 1 HTTP call)

## Decision

Remove unused packages to reduce complexity.

**Kept:**
- config, health, logging, metrics, shutdown, tracing (active)

**Removed:**
- audit, retention, secrets, validation (duplicate), circuit_breaker, retry

## Consequences

**Positive:**
- ~5000 LOC → ~2000 LOC
- Simpler codebase
- Faster builds

**Negative:**
- Need to reintroduce if requirements change

**When to Reintroduce:**
- Audit: When compliance required
- Retention: When LGPD implemented
- Secrets: When 3+ backends needed
```

**Arquivos a Criar:**
```
- docs/architecture/ADR-001-use-interfaces-for-DIP.md
- docs/architecture/ADR-002-remove-unused-packages-yagni.md
- docs/architecture/ADR-003-rename-meeting-to-recording.md
- docs/architecture/ADR-004-domain-layer-introduction.md
```

---

#### 6.3 Atualizar CLAUDE.md Final

```markdown
# CLAUDE.md (ATUALIZAÇÃO FINAL)

## Status

**Versão:** 3.0.0
**Status:** 🟢 MADURO - Production-Ready
**Architecture Health Score:** 9.5/10 ⬆️⬆️ (was 8.5/10)
**Test Coverage:** 85% ⬆️⬆️⬆️ (was 10%)
**SOLID Adherence:** 9.0/10 ⬆️ (was 7.5/10)

**Completed Phases:**
- ✅ Phase 1-8: Critical stability (Score: 4.4 → 8.5)
- ✅ Phase 9: Production readiness (Score: 8.5 → 9.0)
- ✅ Phase 10: Quality improvements (Score: 9.0 → 9.5)

## Key Improvements

**Architecture:**
- ✅ Dependency Inversion implemented (interfaces everywhere)
- ✅ Domain layer with rich entities and invariants
- ✅ Linguagem ubíqua: "Recording" (não "Meeting")
- ✅ Server builder elimina duplicação

**Testing:**
- ✅ 85% test coverage (was 10%)
- ✅ Unit tests: handlers, repositories, domain
- ✅ Integration tests: full recording flow, reconciliation
- ✅ Stress tests: concurrent creation, race conditions

**Quality:**
- ✅ DRY: middlewares centralizados, health endpoints compartilhados
- ✅ YAGNI: pacotes não usados removidos (~5000 LOC)
- ✅ KISS: server builder simplifica main() de 150 → 40 linhas

## Test Commands

```bash
# Unit tests
make test-unit  # 85% coverage

# Integration tests
make test-integration

# E2E tests
make test-e2e

# Coverage report
make test-coverage

# Architecture analysis
./scripts/analyze-architecture.sh  # Score: 9.5/10
```

## Development Status

**Production Ready:** ✅ YES
**Next Steps:** Deploy to staging, monitor metrics, prepare rollout plan
```

---

## 📈 MÉTRICAS DE PROGRESSO

### Scorecard de Aderência

| Fase | Antes | Meta | Entrega Esperada |
|------|-------|------|------------------|
| **Fase 1** | DRY: 6.5/10, DIP: 7.0/10, SRP: 7.5/10 | DRY: 9.0, DIP: 9.0, SRP: 9.0 | Middlewares centralizados, interfaces criadas, server builder |
| **Fase 2** | TDD: 3.0/10 (10% cov) | TDD: 6.0 (40% cov) | Testes de repositories, handlers, orchestration |
| **Fase 3** | DDD: 6.0/10 | DDD: 8.5/10 | Domain layer, linguagem ubíqua |
| **Fase 4** | YAGNI: 5.0/10 | YAGNI: 8.0/10 | Pacotes removidos, state machine ativado |
| **Fase 5** | TDD: 6.0/10 (40% cov) | TDD: 8.0 (80% cov) | Integration tests, stress tests |
| **Fase 6** | Overall: 6.8/10 | Overall: 9.5/10 | ADRs, documentação, validação final |

### Timeline Visual

```
Semana 1: [████████] Fase 1 - DRY/SOLID (8d)
Semana 2: [████████████] Fase 2.1 - Testes Críticos (5d)
Semana 3: [███████] Fase 2.2 - Testes Orchestration (5d)
Semana 4: [████████] Fase 3 - DDD (5d)
Semana 5: [████████] Fase 4 - YAGNI (5d)
Semana 6: [████████████] Fase 5.1 - Integration Tests (5d)
Semana 7: [███████] Fase 5.2 - Stress Tests (5d)
Semana 8: [████████] Fase 6 - Validação (5d)

Total: 8 semanas = 40 dias úteis
```

---

## 🚨 RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Quebra de compatibilidade ao renomear Meeting→Recording | Média | Alto | Migration cuidadosa, deploy coordenado, rollback plan |
| Testes de integração lentos | Alta | Médio | Usar testcontainers, paralelização, CI cache |
| Resistência à refatoração DDD | Baixa | Médio | Demonstrar benefícios, refatoração incremental |
| Cobertura de 80% muito ambiciosa | Média | Médio | Priorizar código crítico, aceitar 75% se necessário |
| Over-engineering ao criar domain layer | Baixa | Médio | Manter simplicidade, evitar abstrações prematuras |

---

## ✅ CRITÉRIOS DE ACEITAÇÃO

### Fase 1 - DRY/SOLID
- [ ] `shared/middleware/http_metrics.go` criado e usado em 3 serviços
- [ ] `shared/health/fiber_handlers.go` criado e usado em 3 serviços
- [ ] `shared/utils/env.go` criado e usado
- [ ] Interfaces criadas em `services/admin-api/interfaces/`
- [ ] Interfaces criadas em `services/bot-manager/interfaces/`
- [ ] Handlers dependem de interfaces (não concretos)
- [ ] `shared/server/builder.go` criado
- [ ] `main.go` dos 3 serviços reduzidos para <50 linhas

### Fase 2 - Testes Críticos
- [ ] `shared/database/repositories_test.go` com 10+ casos
- [ ] `services/api-gateway/handlers/recordings_test.go` expandido
- [ ] `services/admin-api/handlers/users_test.go` criado
- [ ] `services/bot-manager/orchestrator/reconciler_test.go` criado
- [ ] `services/bot-manager/finalizer/concat_test.go` criado
- [ ] `shared/types/state_machine_test.go` criado
- [ ] `services/recording-bot/src/auto-cleanup.test.ts` criado
- [ ] Cobertura ≥40%

### Fase 3 - DDD
- [ ] `shared/domain/recording.go` criado
- [ ] `shared/domain/recording_test.go` com 15+ testes
- [ ] Handlers usam `domain.NewRecording()`
- [ ] Migration `008_rename_meetings_to_recordings.sql` criada
- [ ] Todos os arquivos renomeados (Meeting → Recording)

### Fase 4 - YAGNI
- [ ] `shared/audit/` removido
- [ ] `shared/retention/` removido
- [ ] `shared/secrets/` removido
- [ ] `shared/validation/` removido
- [ ] `shared/middleware/circuit_breaker.go` removido
- [ ] `shared/database/soft_delete.go` removido
- [ ] State machine validation ativada em repositories

### Fase 5 - Testes Avançados
- [ ] `tests/integration/recording_flow_test.go` criado
- [ ] `tests/integration/reconciliation_test.go` criado
- [ ] `shared/database/repositories_stress_test.go` criado
- [ ] Cobertura ≥80%

### Fase 6 - Validação Final
- [ ] ADRs criados (4 documentos)
- [ ] CLAUDE.md atualizado
- [ ] `./scripts/analyze-architecture.sh` retorna ≥9.0/10
- [ ] `make test-e2e` passa 100%
- [ ] `golangci-lint run` 0 erros críticos

---

## 📞 PONTOS DE DECISÃO

### Decisão 1: Renomear Meeting → Recording?
**Recomendação:** SIM
**Justificativa:** Linguagem ubíqua, consistência
**Risco:** Breaking change
**Mitigação:** Migration coordenada, deploy planejado

### Decisão 2: Remover audit/retention/secrets?
**Recomendação:** SIM
**Justificativa:** YAGNI, reduzir complexidade
**Risco:** Precisar reintroduzir
**Mitigação:** ADR documenta quando reintroduzir

### Decisão 3: Meta de 80% cobertura ou 70%?
**Recomendação:** 80%
**Justificativa:** Sistema crítico, bugs já encontrados
**Risco:** Muito tempo
**Mitigação:** Priorizar código crítico, aceitar 75% se atrasar

---

## 🎯 RESULTADO ESPERADO

### Antes (Score: 6.8/10)
```
❌ 10% test coverage
❌ Handlers dependem de concretos
❌ 300+ linhas duplicadas
❌ main() com 150 linhas
❌ Lógica de negócio nos handlers
❌ 32 pacotes (40% não usados)
```

### Depois (Score: 9.5/10)
```
✅ 85% test coverage
✅ Handlers dependem de interfaces
✅ 0 duplicação crítica
✅ main() com 40 linhas
✅ Lógica no domain layer
✅ 18 pacotes (100% usados)
✅ ADRs documentados
✅ Production-ready
```

---

**Próximo Passo:** Iniciar Fase 1 - Correções Críticas de SOLID/DRY

**Aprovação Necessária:**
- [ ] Product Owner: Renomear Meeting → Recording
- [ ] Tech Lead: Remover pacotes não usados
- [ ] DevOps: Timeline de 8 semanas aceitável
