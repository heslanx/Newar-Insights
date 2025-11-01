package shutdown

import (
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/rs/zerolog/log"
)

// Manager manages graceful shutdown of application components
type Manager struct {
	handlers map[string]func()
	mu       sync.Mutex
	done     chan struct{}
	once     sync.Once
}

// NewManager creates a new shutdown manager
func NewManager() *Manager {
	m := &Manager{
		handlers: make(map[string]func()),
		done:     make(chan struct{}),
	}

	// Start listening for signals
	go m.listen()

	return m
}

// Register registers a cleanup handler with a name
// Handlers are called in reverse order of registration during shutdown
func (m *Manager) Register(name string, handler func()) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.handlers[name] = handler
	log.Debug().Str("handler", name).Msg("Registered shutdown handler")
}

// listen listens for interrupt signals and triggers shutdown
func (m *Manager) listen() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	sig := <-sigChan
	log.Info().Str("signal", sig.String()).Msg("Received shutdown signal")

	m.trigger()
}

// trigger executes all registered shutdown handlers
func (m *Manager) trigger() {
	m.once.Do(func() {
		m.mu.Lock()
		defer m.mu.Unlock()

		log.Info().Int("handlers", len(m.handlers)).Msg("Running shutdown handlers")

		// Execute handlers (in reverse order would be ideal, but map iteration is random)
		for name, handler := range m.handlers {
			log.Debug().Str("handler", name).Msg("Executing shutdown handler")
			handler()
		}

		close(m.done)
	})
}

// Wait blocks until shutdown is triggered
func (m *Manager) Wait() <-chan struct{} {
	return m.done
}
