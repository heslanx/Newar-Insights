package tracing

import (
	"context"
)

// Initialize sets up OpenTelemetry tracing with Jaeger exporter
// DISABLED: Dependencies removed for development mode
func Initialize(serviceName, jaegerEndpoint string) error {
	// Tracing disabled in development mode
	return nil
}

// Shutdown gracefully shuts down the tracer provider
// DISABLED: Dependencies removed for development mode
func Shutdown(ctx context.Context) error {
	return nil
}
