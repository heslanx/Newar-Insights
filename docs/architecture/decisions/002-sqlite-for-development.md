# ADR-002: Use SQLite for Development Database

**Status**: Accepted
**Date**: 2025-10-31
**Authors**: Development Team

## Context

The Newar Insights system needs a database for:
- User management (users, API tokens)
- Recording metadata (meetings, status, paths)
- Bot tracking (container IDs, session IDs)

Requirements:
- **Development**: Fast iteration, zero infrastructure setup
- **Production**: Horizontal scaling, high availability

Initial implementation supported both SQLite (dev) and Supabase (prod).

## Decision

Use **SQLite for development** with these principles:

1. **Single File Database**: `storage/database/newar.db`
2. **Zero Setup**: No Docker container, no network calls
3. **SQL-First**: Write migrations in standard SQL
4. **Repository Abstraction**: Infrastructure implements domain interfaces

**Production**: Keep door open for PostgreSQL/Supabase via repository pattern.

## Consequences

### Positive

✅ **Instant Start**: `make dev` starts everything in <5s
✅ **No Network Latency**: All queries are local file I/O
✅ **Portable**: Entire DB is a single file (easy backups, testing)
✅ **Standard SQL**: Migrations work on SQLite & PostgreSQL with minor tweaks

### Negative

❌ **Not Production-Ready**: SQLite doesn't scale horizontally
❌ **No Concurrent Writes**: Single writer at a time
❌ **Limited JSON Support**: JSONB queries less powerful than PostgreSQL

### Neutral

⚖️ **Migration Path Exists**: Repository pattern allows swapping DB
⚖️ **Testing Simplicity**: Integration tests use real SQLite (not mocks)

## Implementation

**Database Layer** (`shared/database/`):
```go
type Config struct {
    Type         string  // "sqlite" or "supabase"
    SQLitePath   string
    SupabaseURL  string
    SupabaseKey  string
}

func NewDatabase(cfg Config) (Database, error) {
    switch cfg.Type {
    case "sqlite":
        return NewSQLiteDatabase(cfg.SQLitePath)
    case "supabase":
        return NewSupabaseDatabase(cfg.SupabaseURL, cfg.SupabaseKey)
    }
}
```

**Connection Pooling**:
- SQLite: `MaxOpenConns=1` (single writer)
- PostgreSQL: `MaxOpenConns=25`, `MaxIdleConns=5`

## Alternatives Considered

### 1. PostgreSQL from Day 1
- **Rejected**: Requires Docker Compose, network latency in dev
- Overkill for MVP development
- Migration path still exists via repository pattern

### 2. In-Memory SQLite (`:memory:`)
- **Rejected**: Data lost on restart
- Can't inspect DB with external tools during development

### 3. MySQL
- **Rejected**: Less Go ecosystem support than PostgreSQL
- Supabase uses PostgreSQL, easier migration path

## Migration Strategy (Future)

When moving to production:

1. **Keep Repository Interface Unchanged**: Domain code sees `UserRepository`, not "SQLite" or "Postgres"
2. **Write PostgreSQL Implementation**: `NewPostgreSQLDatabase()`
3. **Migrate Data**: SQL dump from SQLite → import to PostgreSQL
4. **Update Config**: Change `DATABASE_TYPE=supabase`

**Estimated Effort**: 1-2 days (repository pattern makes this easy)

## References

- [SQLite Is Production Ready](https://sqlite.org/whentouse.html)
- [SQLite vs PostgreSQL Performance](https://www.sqlite.org/speed.html)
- [Repository Pattern in Go](https://threedots.tech/post/repository-pattern-in-go/)
