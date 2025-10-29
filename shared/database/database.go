package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3" // SQLite driver
	"github.com/rs/zerolog/log"
)

// Database interface abstracts the underlying database implementation
// This allows easy switching between SQLite (development) and PostgreSQL/Supabase (production)
type Database interface {
	// Connection management
	Ping(ctx context.Context) error
	Close() error

	// Query execution
	Query(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	QueryRow(ctx context.Context, query string, args ...interface{}) *sql.Row
	Exec(ctx context.Context, query string, args ...interface{}) (sql.Result, error)

	// Transaction support
	BeginTx(ctx context.Context) (*sql.Tx, error)

	// Get underlying connection (for advanced usage)
	DB() *sql.DB
}

// Config holds database configuration
type Config struct {
	Type           string // "sqlite" or "supabase"
	SQLitePath     string // Path to SQLite file
	SupabaseURL    string // Supabase URL (for future use)
	SupabaseKey    string // Supabase API key (for future use)
	MaxOpenConns   int
	MaxIdleConns   int
	ConnMaxLife    time.Duration
	ConnMaxIdle    time.Duration
}

// SQLiteDB implements Database interface for SQLite
type SQLiteDB struct {
	db *sql.DB
}

// NewDatabase creates a new database connection based on config
func NewDatabase(cfg Config) (Database, error) {
	switch cfg.Type {
	case "sqlite":
		return NewSQLite(cfg)
	case "supabase":
		// Future implementation
		return nil, fmt.Errorf("supabase connector not implemented yet")
	default:
		return nil, fmt.Errorf("unsupported database type: %s", cfg.Type)
	}
}

// NewSQLite creates a new SQLite connection
func NewSQLite(cfg Config) (*SQLiteDB, error) {
	if cfg.SQLitePath == "" {
		return nil, fmt.Errorf("sqlite_path is required")
	}

	// Open SQLite connection
	db, err := sql.Open("sqlite3", cfg.SQLitePath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite: %w", err)
	}

	// Configure connection pool
	if cfg.MaxOpenConns > 0 {
		db.SetMaxOpenConns(cfg.MaxOpenConns)
	}
	if cfg.MaxIdleConns > 0 {
		db.SetMaxIdleConns(cfg.MaxIdleConns)
	}
	if cfg.ConnMaxLife > 0 {
		db.SetConnMaxLifetime(cfg.ConnMaxLife)
	}
	if cfg.ConnMaxIdle > 0 {
		db.SetConnMaxIdleTime(cfg.ConnMaxIdle)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping sqlite: %w", err)
	}

	log.Info().Str("path", cfg.SQLitePath).Msg("Connected to SQLite database")

	return &SQLiteDB{db: db}, nil
}

// Ping checks if the database is reachable
func (s *SQLiteDB) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

// Close closes the database connection
func (s *SQLiteDB) Close() error {
	log.Info().Msg("Closing SQLite connection")
	return s.db.Close()
}

// Query executes a query that returns rows
func (s *SQLiteDB) Query(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	start := time.Now()
	rows, err := s.db.QueryContext(ctx, query, args...)

	log.Debug().
		Str("query", query).
		Int64("duration_ms", time.Since(start).Milliseconds()).
		Err(err).
		Msg("Database query executed")

	return rows, err
}

// QueryRow executes a query that returns a single row
func (s *SQLiteDB) QueryRow(ctx context.Context, query string, args ...interface{}) *sql.Row {
	start := time.Now()
	row := s.db.QueryRowContext(ctx, query, args...)

	log.Debug().
		Str("query", query).
		Int64("duration_ms", time.Since(start).Milliseconds()).
		Msg("Database query row executed")

	return row
}

// Exec executes a query that doesn't return rows
func (s *SQLiteDB) Exec(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	start := time.Now()
	result, err := s.db.ExecContext(ctx, query, args...)

	log.Debug().
		Str("query", query).
		Int64("duration_ms", time.Since(start).Milliseconds()).
		Err(err).
		Msg("Database exec executed")

	return result, err
}

// BeginTx starts a new transaction
func (s *SQLiteDB) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return s.db.BeginTx(ctx, nil)
}

// DB returns the underlying *sql.DB for advanced usage
func (s *SQLiteDB) DB() *sql.DB {
	return s.db
}

// =====================================================
// MIGRATION HELPER
// =====================================================

// RunMigration executes a SQL migration file
func RunMigration(db Database, migrationSQL string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := db.Exec(ctx, migrationSQL)
	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	log.Info().Msg("Database migration completed successfully")
	return nil
}

// =====================================================
// HEALTH CHECK HELPER
// =====================================================

// HealthCheck performs a database health check
func HealthCheck(db Database) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Simple ping
	if err := db.Ping(ctx); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	// Try a simple query
	var result int
	row := db.QueryRow(ctx, "SELECT 1")
	if err := row.Scan(&result); err != nil {
		return fmt.Errorf("database query failed: %w", err)
	}

	if result != 1 {
		return fmt.Errorf("unexpected query result: %d", result)
	}

	return nil
}
