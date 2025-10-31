import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger, LogLevel, logInfo, logError, logWarn, logDebug } from './logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    // Clear console mocks
    vi.clearAllMocks();
  });

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      logger.debug('Test debug message');
      
      expect(consoleSpy).toHaveBeenCalled();
      const logs = logger.exportLogs();
      expect(logs).toContain('Test debug message');
      expect(logs).toContain('DEBUG');
    });

    it('should log info messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      logger.info('Test info message');
      
      expect(consoleSpy).toHaveBeenCalled();
      const logs = logger.exportLogs();
      expect(logs).toContain('Test info message');
      expect(logs).toContain('INFO');
    });

    it('should log warn messages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logger.warn('Test warning message');
      
      expect(consoleSpy).toHaveBeenCalled();
      const logs = logger.exportLogs();
      expect(logs).toContain('Test warning message');
      expect(logs).toContain('WARN');
    });

    it('should log error messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      logger.error('Test error message');
      
      expect(consoleSpy).toHaveBeenCalled();
      const logs = logger.exportLogs();
      expect(logs).toContain('Test error message');
      expect(logs).toContain('ERROR');
    });

    it('should log fatal messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      logger.fatal('Test fatal message');
      
      expect(consoleSpy).toHaveBeenCalled();
      const logs = logger.exportLogs();
      expect(logs).toContain('Test fatal message');
      expect(logs).toContain('FATAL');
    });
  });

  describe('Context Logging', () => {
    it('should log with context object', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      logger.info('User action', { userId: 123, action: 'login' });
      
      expect(consoleSpy).toHaveBeenCalled();
      const logs = logger.exportLogs();
      expect(logs).toContain('userId');
      expect(logs).toContain('123');
      expect(logs).toContain('login');
    });

    it('should log with error object', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('Test error');
      
      logger.error('Operation failed', testError);
      
      expect(consoleSpy).toHaveBeenCalled();
      const logs = logger.exportLogs();
      expect(logs).toContain('Test error');
      expect(logs).toContain('stack');
    });

    it('should log with both error and context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const testError = new Error('API error');
      
      logger.error('API call failed', testError, { endpoint: '/api/users' });
      
      expect(consoleSpy).toHaveBeenCalled();
      const logs = logger.exportLogs();
      expect(logs).toContain('API error');
      expect(logs).toContain('endpoint');
      expect(logs).toContain('/api/users');
    });
  });

  describe('Session Tracking', () => {
    it('should generate unique session ID', () => {
      const logger1 = new Logger();
      const logger2 = new Logger();
      
      // Session IDs should be different
      logger1.info('Logger 1');
      logger2.info('Logger 2');
      
      const logs1 = logger1.exportLogs();
      const logs2 = logger2.exportLogs();
      
      expect(logs1).not.toEqual(logs2);
    });

    it('should set and include user ID in logs', () => {
      logger.setUserId('user-123');
      logger.info('User action');
      
      const logs = logger.exportLogs();
      expect(logs).toContain('user-123');
    });
  });

  describe('Log Management', () => {
    it('should respect max log limit', () => {
      // Logger has maxLogs = 1000
      // Let's log 1100 messages
      for (let i = 0; i < 1100; i++) {
        logger.info(`Message ${i}`);
      }
      
      const logs = logger.exportLogs();
      // Should only contain last 1000 messages
      expect(logs).toContain('Message 1099');
      expect(logs).not.toContain('Message 0');
    });

    it('should export logs in JSON format', () => {
      logger.info('Test message', { key: 'value' });
      
      const logs = logger.exportLogs();
      expect(() => JSON.parse(logs)).not.toThrow();
    });

    it('should clear logs', () => {
      logger.info('Message 1');
      logger.info('Message 2');
      
      logger.clear();
      
      const logs = logger.exportLogs();
      expect(logs).toBe('[]');
    });
  });

  describe('Helper Functions', () => {
    it('logInfo should work as shorthand', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      logInfo('Test info');
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('logError should work as shorthand', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      logError('Test error');
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('logWarn should work as shorthand', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      logWarn('Test warning');
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('logDebug should work as shorthand', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      
      logDebug('Test debug');
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency logging', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages', () => {
      expect(() => logger.info('')).not.toThrow();
    });

    it('should handle undefined context', () => {
      expect(() => logger.info('Test', undefined)).not.toThrow();
    });

    it('should handle null in context', () => {
      expect(() => logger.info('Test', { value: null })).not.toThrow();
    });

    it('should handle circular references in context', () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      
      // Should not throw on circular reference
      expect(() => logger.info('Test', circular)).not.toThrow();
    });

    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      expect(() => logger.info(longMessage)).not.toThrow();
    });
  });
});
