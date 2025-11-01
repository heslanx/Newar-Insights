package metrics

// Collector holds Prometheus metrics for a service
// DISABLED: Dependencies removed for development mode
type Collector struct {
	serviceName string
}

// NewCollector creates a new metrics collector for a service
// DISABLED: Dependencies removed for development mode
func NewCollector(serviceName string) *Collector {
	return &Collector{
		serviceName: serviceName,
	}
}

// RecordHTTPRequest records an HTTP request metric (no-op in dev mode)
func (c *Collector) RecordHTTPRequest(method, path string, status int, duration float64) {
	// No-op in development mode
}

// RecordHTTPRequestSize records HTTP request size (no-op in dev mode)
func (c *Collector) RecordHTTPRequestSize(size float64) {
	// No-op in development mode
}

// RecordHTTPResponseSize records HTTP response size (no-op in dev mode)
func (c *Collector) RecordHTTPResponseSize(size float64) {
	// No-op in development mode
}

// IncrementCounter increments a custom counter (no-op in dev mode)
func (c *Collector) IncrementCounter(name string, labels map[string]string) {
	// No-op in development mode
}

// SetGauge sets a custom gauge value (no-op in dev mode)
func (c *Collector) SetGauge(name string, value float64, labels map[string]string) {
	// No-op in development mode
}

// ObserveHistogram observes a custom histogram value (no-op in dev mode)
func (c *Collector) ObserveHistogram(name string, value float64, labels map[string]string) {
	// No-op in development mode
}
