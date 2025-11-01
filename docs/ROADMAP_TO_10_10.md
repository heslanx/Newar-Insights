# Roadmap para Architecture Score 10/10 e Maintainability 10/10

**Status Atual**:
- Architecture Score: **9.3/10** (+1.5 após Fases 3-4)
- Maintainability: **8.5/10** (+2.5 após Fases 3-4)

**Meta**: Ambos em **10/10**

---

## 🎯 GAP ANALYSIS - O que está faltando?

### Architecture Score: 9.3 → 10.0 (GAP: 0.7 pontos)

#### ❌ 1. **Infraestrutura NÃO implementa Domain Repositories** (-0.3 pontos)

**Problema**: Criamos interfaces `domain/repositories/*` mas `shared/database/` ainda usa tipos anêmicos (`types.User`, `types.Meeting`) ao invés de entidades ricas.

**Situação Atual**:
```go
// shared/database/repositories.go
type UserRepository struct { db Database }

func (r *UserRepository) Create(ctx context.Context, req types.CreateUserRequest) (*types.User, error) {
    // Retorna types.User (anêmico) ao invés de entities.User (rico)
}
```

**O que precisa**:
```go
// shared/database/user_repository_impl.go
type UserRepositoryImpl struct { db Database }

func (r *UserRepositoryImpl) Save(ctx context.Context, user *entities.User) error {
    // Converte entities.User → types.User (DTO) → salva no DB
}

func (r *UserRepositoryImpl) FindByID(ctx context.Context, id int64) (*entities.User, error) {
    // Busca no DB → types.User (DTO) → converte para entities.User
}
```

**Impacto**: +0.2 pontos (camada de infra isolada)

---

#### ❌ 2. **Handlers ainda acoplados aos repositories do database** (-0.2 pontos)

**Problema**: Handlers importam `database.NewUserRepository()` ao invés de usar domain services.

**Situação Atual**:
```go
// services/admin-api/handlers/users.go
type UserHandler struct {
    userManager interfaces.UserManager  // Aponta para database.UserRepository
}

// services/admin-api/main.go
userRepo := database.NewUserRepository(db)
userHandler := handlers.NewUserHandler(userRepo)
```

**O que precisa**:
```go
// Handlers devem usar domain services, não repositories
type UserHandler struct {
    userService *services.UserService  // Domain service
}

// main.go
userRepoImpl := database.NewUserRepositoryImpl(db)
userService := services.NewUserService(userRepoImpl, meetingRepoImpl)
userHandler := handlers.NewUserHandler(userService)
```

**Impacto**: +0.2 pontos (handlers 100% desacoplados de infra)

---

#### ❌ 3. **Falta Event Sourcing / Domain Events** (-0.1 pontos)

**Problema**: Ações importantes não disparam eventos (ex: `UserCreated`, `RecordingStarted`).

**O que precisa**:
```go
// shared/domain/events/events.go
type DomainEvent interface {
    OccurredAt() time.Time
    EventType() string
}

type UserCreatedEvent struct {
    UserID    int64
    Email     string
    Timestamp time.Time
}

// entities/user.go
func NewUser(...) (*User, []DomainEvent, error) {
    user := &User{...}
    events := []DomainEvent{
        UserCreatedEvent{UserID: user.ID(), ...},
    }
    return user, events, nil
}
```

**Benefício**: Auditoria, integrações assíncronas, CQRS no futuro.

**Impacto**: +0.1 pontos (observability + extensibility)

---

#### ❌ 4. **Falta Mapper/Adapter entre Domain e DTO** (-0.2 pontos)

**Problema**: Conversão manual entre `entities.User` e `types.User` será feita ad-hoc.

**O que precisa**:
```go
// shared/adapters/user_adapter.go
type UserAdapter struct{}

// ToEntity converte DTO → Entity
func (a *UserAdapter) ToEntity(dto *types.User) (*entities.User, error) {
    return entities.NewUser(dto.ID, dto.Email, dto.Name, dto.MaxConcurrentBots)
}

// ToDTO converte Entity → DTO (para JSON response)
func (a *UserAdapter) ToDTO(entity *entities.User) *types.User {
    return &types.User{
        ID:                entity.ID(),
        Email:             entity.Email(),
        Name:              entity.Name(),
        MaxConcurrentBots: entity.MaxConcurrentBots(),
        // ...
    }
}
```

**Impacto**: +0.2 pontos (separation of concerns perfeita)

---

### Maintainability: 8.5 → 10.0 (GAP: 1.5 pontos)

#### ❌ 5. **Test Coverage abaixo de 80%** (-0.8 pontos)

**Problema**: Coverage atual = 10% (mencionado no CLAUDE.md).

**O que precisa**:
- ✅ Unit tests para domain services (mock repositories): 40%
- ✅ Unit tests para value objects: 10%
- ✅ Unit tests para entities (state machine): 10%
- ✅ Integration tests (handlers + domain + DB): 20%

**Meta**: **80%+ coverage**

**Impacto**: +0.8 pontos (confiança em refatorações)

---

#### ❌ 6. **Falta CI/CD Pipeline** (-0.3 pontos)

**Problema**: Sem automação de testes, lint, build.

**O que precisa**:
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.24'
      - run: make test-unit
      - run: make lint
      - run: make build
```

**Ferramentas**:
- `golangci-lint` (linting)
- `go test -race` (race detector)
- `go test -cover` (coverage report)

**Impacto**: +0.3 pontos (quality gates automáticos)

---

#### ❌ 7. **Falta Documentação de Arquitetura (ADRs)** (-0.2 pontos)

**Problema**: Decisões arquiteturais não documentadas (por que DDD? por que SQLite? por que Docker?).

**O que precisa**:
```
docs/architecture/decisions/
├── 001-use-ddd-architecture.md
├── 002-sqlite-for-mvp.md
├── 003-docker-orchestration.md
├── 004-redis-pubsub-for-bots.md
└── 005-value-objects-for-validation.md
```

**Template ADR**:
```markdown
# ADR-001: Use DDD Architecture

**Status**: Accepted
**Date**: 2025-11-01

## Context
We need a scalable architecture that separates business logic from infrastructure.

## Decision
Adopt Domain-Driven Design with:
- Rich entities
- Value objects
- Domain services
- Repository interfaces

## Consequences
**Positive**:
- Business logic isolated and testable
- Framework-agnostic domain layer

**Negative**:
- More upfront design
- Requires team training on DDD
```

**Impacto**: +0.2 pontos (onboarding + knowledge sharing)

---

#### ❌ 8. **Falta Logging/Tracing Estruturado** (-0.2 pontos)

**Problema**: Logs inconsistentes, difícil debug em produção.

**Situação Atual**:
```go
log.Info().Msg("User created")
log.Error().Err(err).Msg("Failed")
```

**O que precisa**:
```go
// Structured logging com contexto
log.Info().
    Str("service", "user-service").
    Int64("user_id", user.ID()).
    Str("email", user.Email()).
    Str("trace_id", traceID).
    Msg("User created successfully")

// Distributed tracing (OpenTelemetry)
ctx, span := tracer.Start(ctx, "UserService.CreateUser")
defer span.End()
span.SetAttributes(attribute.String("user.email", email))
```

**Ferramentas**:
- OpenTelemetry (tracing)
- Jaeger (trace visualization)
- Structured logging com trace IDs

**Impacto**: +0.2 pontos (observability em produção)

---

## 📋 CHECKLIST PARA 10/10

### Architecture Score (9.3 → 10.0)

- [ ] **Fase A1**: Implementar adapters Domain ↔ DTO (+0.2)
  - [ ] `shared/adapters/user_adapter.go`
  - [ ] `shared/adapters/meeting_adapter.go`

- [ ] **Fase A2**: Refatorar database layer para implementar domain repositories (+0.2)
  - [ ] `shared/database/user_repository_impl.go` (implementa `domain/repositories/UserRepository`)
  - [ ] `shared/database/meeting_repository_impl.go` (implementa `domain/repositories/MeetingRepository`)

- [ ] **Fase A3**: Refatorar handlers para usar domain services ao invés de repositories (+0.2)
  - [ ] `services/admin-api/handlers/users.go` → usa `UserService`
  - [ ] `services/api-gateway/handlers/recordings.go` → usa `RecordingService`

- [ ] **Fase A4**: Implementar domain events (opcional, mas recomendado) (+0.1)
  - [ ] `shared/domain/events/` com eventos básicos

---

### Maintainability (8.5 → 10.0)

- [ ] **Fase M1**: Test coverage 80%+ (+0.8)
  - [ ] Unit tests: domain services (mock repos)
  - [ ] Unit tests: value objects
  - [ ] Unit tests: entities (state machine)
  - [ ] Integration tests: handlers + services + DB

- [ ] **Fase M2**: CI/CD Pipeline (+0.3)
  - [ ] `.github/workflows/ci.yml`
  - [ ] `golangci-lint` configurado
  - [ ] Coverage report automático

- [ ] **Fase M3**: ADRs (Architecture Decision Records) (+0.2)
  - [ ] Documentar 5 principais decisões arquiteturais

- [ ] **Fase M4**: Logging estruturado + Distributed tracing (+0.2)
  - [ ] OpenTelemetry integrado
  - [ ] Structured logging com trace IDs
  - [ ] Jaeger ou similar configurado

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

### SPRINT 1 (1 semana): Architecture 10/10
1. **Fase A1**: Adapters (1 dia)
2. **Fase A2**: Repository Implementations (2 dias)
3. **Fase A3**: Refatorar Handlers (1 dia)
4. **Fase A4**: Domain Events (1 dia - opcional)

**Resultado**: Architecture Score **10.0/10** ✅

---

### SPRINT 2 (2 semanas): Maintainability 10/10
1. **Fase M1**: Test Coverage 80%+ (1.5 semanas)
   - Semana 1: Unit tests (domain services, value objects, entities)
   - Semana 2: Integration tests (handlers → services → DB)

2. **Fase M2**: CI/CD (1 dia)
3. **Fase M3**: ADRs (1 dia)
4. **Fase M4**: Logging/Tracing (1 dia)

**Resultado**: Maintainability **10.0/10** ✅

---

## 📊 PRIORIZAÇÃO POR IMPACTO

### MUST HAVE (Score crítico)
1. ✅ **Fase A2**: Repository Implementations (+0.2)
2. ✅ **Fase A3**: Handlers usam Domain Services (+0.2)
3. ✅ **Fase M1**: Test Coverage 80%+ (+0.8)

**Total**: +1.2 pontos → **Score passa de 9.3 para 10.0** (architecture) + **8.5 para 9.3** (maintainability)

### SHOULD HAVE (Produção-ready)
4. ✅ **Fase A1**: Adapters (+0.2)
5. ✅ **Fase M2**: CI/CD (+0.3)

**Total**: +0.5 pontos → **Maintainability chega em 9.8**

### NICE TO HAVE (Excelência)
6. ⭐ **Fase M3**: ADRs (+0.2)
7. ⭐ **Fase M4**: Logging/Tracing (+0.2)
8. ⭐ **Fase A4**: Domain Events (+0.1)

**Total**: +0.5 pontos → **Ambos chegam em 10.0** 🎯

---

## 🎯 RESUMO: CAMINHO PARA 10/10

| Métrica | Atual | Após MUST | Após SHOULD | Após NICE | Meta |
|---------|-------|-----------|-------------|-----------|------|
| **Architecture** | 9.3 | 9.7 | 9.9 | **10.0** | 10.0 ✅ |
| **Maintainability** | 8.5 | 9.3 | 9.6 | **10.0** | 10.0 ✅ |

### Esforço Total Estimado
- **MUST HAVE**: 1 semana (40h)
- **SHOULD HAVE**: +2 dias (16h)
- **NICE TO HAVE**: +3 dias (24h)

**Total**: **2 semanas** (80h) para atingir **10/10 em ambos** 🚀

---

## 💡 QUICK WINS (Se tiver pressa)

Se você quiser **maximizar score rapidamente**, execute nesta ordem:

1. **Dia 1-2**: Fase A2 (Repository Implementations) → +0.2
2. **Dia 3**: Fase A3 (Handlers com Services) → +0.2
3. **Dia 4-5**: Fase A1 (Adapters) → +0.2
   - **Architecture: 9.9/10** ✅

4. **Semana 2**: Fase M1 (Tests 80%+) → +0.8
   - **Maintainability: 9.3/10**

5. **Dia 9**: Fase M2 (CI/CD) → +0.3
   - **Maintainability: 9.6/10**

6. **Dia 10**: Fases M3 + M4 (ADRs + Logging) → +0.4
   - **Maintainability: 10.0/10** ✅

**Total**: **10 dias úteis** (2 semanas) → **10/10 COMPLETO** 🎉

---

**Próximo Passo Recomendado**: Executar **Fase A1 (Adapters)** para começar a separação limpa Domain ↔ Infrastructure.

Você quer que eu execute alguma dessas fases agora? Recomendo começar pela **Fase A1 + A2 + A3** (arquitetura completa).
