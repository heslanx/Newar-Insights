# ADR-001: Adopt Domain-Driven Design Architecture

**Status**: Accepted
**Date**: 2025-11-01
**Authors**: Claude + Development Team

## Context

The Newar Insights system needed a scalable, maintainable architecture that:
- Separates business logic from infrastructure concerns
- Makes the codebase testable without dependencies on frameworks
- Allows easy evolution of business rules without touching infrastructure
- Provides clear boundaries between layers

Initial implementation had anemic domain models (DTOs everywhere) with business logic scattered across handlers and repositories.

## Decision

We will adopt **Domain-Driven Design (DDD)** with the following layers:

### 1. Domain Layer (`shared/domain/`)
- **Entities**: Rich objects with behavior and validation
  - `entities.User` - User management with business rules
  - `entities.Meeting` - Recording sessions with state machine
- **Value Objects**: Immutable, validated data types
  - `Email`, `MeetingURL`, `Platform`
- **Domain Services**: Business logic orchestration
  - `UserService`, `RecordingService`
- **Repository Interfaces**: Define what infrastructure must provide
  - `UserRepository`, `MeetingRepository`

### 2. Application Layer (`services/*/handlers/`)
- HTTP handlers
- Request/response DTOs
- Thin coordination layer (delegates to domain services)

### 3. Infrastructure Layer (`shared/database/`, `shared/adapters/`)
- Repository implementations (`*RepositoryImpl`)
- Adapters for Entity ↔ DTO conversion
- Database, Redis, external APIs

## Consequences

### Positive

✅ **Testability**: Domain logic 100% testable without DB/HTTP
✅ **Framework Independence**: Can swap Fiber for Gin without touching domain
✅ **Business Rules Centralized**: No more scattered validation
✅ **State Machine Enforcement**: Invalid transitions impossible
✅ **Refactoring Safety**: Changes to domain don't break handlers

### Negative

❌ **More Upfront Design**: Requires thinking about entities/VOs before coding
❌ **Learning Curve**: Team needs to understand DDD concepts
❌ **More Files**: Separation adds file count (+10-15 files)

### Neutral

⚖️ **Adapter Layer Needed**: Must convert Entity ↔ DTO at boundaries
⚖️ **Repository Duplication**: Domain interfaces + infrastructure implementations

## Implementation

**Files Created**:
- `shared/domain/entities/{user,meeting}.go` (370 lines)
- `shared/domain/valueobjects/{email,meeting_url,platform}.go` (180 lines)
- `shared/domain/repositories/{user,meeting}_repository.go` (90 lines)
- `shared/domain/services/{user,recording}_service.go` (320 lines)
- `shared/adapters/{user,meeting}_adapter.go` (200 lines)
- `shared/database/{user,meeting}_repository_impl.go` (400 lines)

**Total**: +1.560 lines of clean, testable domain logic

## Alternatives Considered

### 1. Continue with Anemic Domain Model
- **Rejected**: Business logic would remain scattered
- Validation duplicated across handlers
- Hard to test without mocking DB

### 2. Active Record Pattern
- **Rejected**: Couples domain entities to ORM
- Can't test business rules without database
- Framework lock-in

### 3. Hexagonal Architecture (Ports & Adapters)
- **Considered**: Very similar to DDD
- DDD chosen for richer domain modeling support

## References

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing DDD by Vaughn Vernon](https://vaughnvernon.com/implementing-domain-driven-design/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
