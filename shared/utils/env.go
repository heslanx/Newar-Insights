package utils

import (
	"os"
	"strconv"
)

// GetEnvOrDefault returns the value of an environment variable,
// or a default value if the variable is not set or empty.
//
// Usage:
//
//	port := utils.GetEnvOrDefault("PORT", "8080")
//	dbURL := utils.GetEnvOrDefault("DATABASE_URL", "sqlite://./data.db")
func GetEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// GetEnvOrDefaultInt returns the value of an environment variable as an integer,
// or a default value if the variable is not set, empty, or cannot be parsed.
//
// Usage:
//
//	port := utils.GetEnvOrDefaultInt("PORT", 8080)
//	timeout := utils.GetEnvOrDefaultInt("TIMEOUT_SECONDS", 30)
func GetEnvOrDefaultInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}

	return value
}

// GetEnvOrDefaultBool returns the value of an environment variable as a boolean,
// or a default value if the variable is not set, empty, or cannot be parsed.
//
// Accepts: "true", "1", "yes", "on" for true (case insensitive)
// Accepts: "false", "0", "no", "off" for false (case insensitive)
//
// Usage:
//
//	debug := utils.GetEnvOrDefaultBool("DEBUG", false)
//	enableCORS := utils.GetEnvOrDefaultBool("ENABLE_CORS", true)
func GetEnvOrDefaultBool(key string, defaultValue bool) bool {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}

	switch valueStr {
	case "true", "1", "yes", "on", "TRUE", "YES", "ON":
		return true
	case "false", "0", "no", "off", "FALSE", "NO", "OFF":
		return false
	default:
		return defaultValue
	}
}
