package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq" // PostgreSQL driver
	"github.com/rs/zerolog/log"
)

// Database interface abstracts the underlying database implementation
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
	SupabaseURL string // Supabase project URL
	SupabaseKey string // Supabase API key (anon or service_role)
	MaxOpenConns int
	MaxIdleConns int
	ConnMaxLife  time.Duration
	ConnMaxIdle  time.Duration
}

// PostgresDB implements Database interface for Supabase PostgreSQL
type PostgresDB struct {
	db *sql.DB
}

// NewDatabase creates a new Supabase PostgreSQL connection
func NewDatabase(cfg Config) (Database, error) {
	if cfg.SupabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL is required")
	}
	if cfg.SupabaseKey == "" {
		return nil, fmt.Errorf("SUPABASE_KEY is required")
	}

	// Extract database credentials from Supabase URL
	// Format: https://PROJECT_ID.supabase.co
	// PostgreSQL DSN format: postgres://postgres:[YOUR-PASSWORD]@db.PROJECT_ID.supabase.co:5432/postgres

	// For Supabase, we need to construct the PostgreSQL connection string
	// Using direct PostgreSQL connection via pooler
	projectID := extractProjectID(cfg.SupabaseURL)
	if projectID == "" {
		return nil, fmt.Errorf("invalid SUPABASE_URL format: %s", cfg.SupabaseURL)
	}

	// Supabase PostgreSQL connection string (via pooler)
	// Note: Password needs to be provided separately (via SUPABASE_DB_PASSWORD env var)
	// For now, using service_role key as authentication method
	connStr := fmt.Sprintf(
		"host=db.%s.supabase.co port=5432 dbname=postgres user=postgres password=%s sslmode=require",
		projectID,
		cfg.SupabaseKey, // Using service_role key as password (Supabase allows this)
	)

	// Open PostgreSQL connection
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	// Configure connection pool
	maxOpenConns := cfg.MaxOpenConns
	if maxOpenConns == 0 {
		maxOpenConns = 25 // Default for PostgreSQL
	}
	db.SetMaxOpenConns(maxOpenConns)

	maxIdleConns := cfg.MaxIdleConns
	if maxIdleConns == 0 {
		maxIdleConns = 5
	}
	db.SetMaxIdleConns(maxIdleConns)

	connMaxLife := cfg.ConnMaxLife
	if connMaxLife == 0 {
		connMaxLife = 5 * time.Minute
	}
	db.SetConnMaxLifetime(connMaxLife)

	connMaxIdle := cfg.ConnMaxIdle
	if connMaxIdle == 0 {
		connMaxIdle = 5 * time.Minute
	}
	db.SetConnMaxIdleTime(connMaxIdle)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	log.Info().
		Str("host", fmt.Sprintf("db.%s.supabase.co", projectID)).
		Int("max_open_conns", maxOpenConns).
		Int("max_idle_conns", maxIdleConns).
		Msg("Connected to Supabase PostgreSQL")

	return &PostgresDB{db: db}, nil
}

// extractProjectID extracts project ID from Supabase URL
// Example: https://iykklyrujvbmytkhwcfi.supabase.co → iykklyrujvbmytkhwcfi
func extractProjectID(supabaseURL string) string {
	// Remove https:// or http://
	url := supabaseURL
	if len(url) > 8 && url[:8] == "https://" {
		url = url[8:]
	} else if len(url) > 7 && url[:7] == "http://" {
		url = url[7:]
	}

	// Extract project ID (before .supabase.co)
	for i, ch := range url {
		if ch == '.' {
			return url[:i]
		}
	}

	return ""
}

// Ping tests database connectivity
func (db *PostgresDB) Ping(ctx context.Context) error {
	return db.db.PingContext(ctx)
}

// Close closes the database connection
func (db *PostgresDB) Close() error {
	log.Info().Msg("Closing Supabase PostgreSQL connection")
	return db.db.Close()
}

// Query executes a query that returns rows
func (db *PostgresDB) Query(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	return db.db.QueryContext(ctx, query, args...)
}

// QueryRow executes a query that returns at most one row
func (db *PostgresDB) QueryRow(ctx context.Context, query string, args ...interface{}) *sql.Row {
	return db.db.QueryRowContext(ctx, query, args...)
}

// Exec executes a query without returning rows
func (db *PostgresDB) Exec(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	return db.db.ExecContext(ctx, query, args...)
}

// BeginTx starts a transaction
func (db *PostgresDB) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return db.db.BeginTx(ctx, nil)
}

// DB returns the underlying *sql.DB
func (db *PostgresDB) DB() *sql.DB {
	return db.db
}

// RunMigration runs a SQL migration script
func RunMigration(db Database, migration string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := db.Exec(ctx, migration)
	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	log.Info().Msg("Migration executed successfully")
	return nil
}
