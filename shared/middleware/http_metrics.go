package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/newar/insights/shared/metrics"
)

// HTTPMetrics creates a Fiber middleware that records HTTP metrics
// for Prometheus. This middleware tracks:
// - Request duration (histogram)
// - Request size (histogram)
// - Response size (histogram)
// - HTTP status codes
//
// Usage:
//
//	app := fiber.New()
//	metricsCollector := metrics.NewCollector("my-service")
//	app.Use(middleware.HTTPMetrics(metricsCollector))
func HTTPMetrics(collector *metrics.Collector) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		// Record metrics after request completes
		duration := time.Since(start).Seconds()
		status := c.Response().StatusCode()
		method := c.Method()
		path := c.Route().Path

		// If path is empty (route not found), use the actual path
		if path == "" {
			path = c.Path()
		}

		// Record metrics
		collector.RecordHTTPRequest(method, path, status, duration)
		collector.RecordHTTPRequestSize(float64(len(c.Body())))
		collector.RecordHTTPResponseSize(float64(len(c.Response().Body())))

		return err
	}
}
