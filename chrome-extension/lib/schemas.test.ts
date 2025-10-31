import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  apiKeySchema,
  meetingIdSchema,
  meetingUrlSchema,
  botNameSchema,
  validateEmail,
  validateApiKey,
  validateMeetingId,
  validateMeetingUrl,
  validateBotName,
  sanitizeInput,
  sanitizeUrl,
  sanitizeFileName,
} from './schemas';

describe('Email Schema', () => {
  describe('Valid Emails', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'test123@test-domain.com',
        'a@b.c',
      ];

      validEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).not.toThrow();
        expect(validateEmail(email).valid).toBe(true);
      });
    });
  });

  describe('Invalid Emails', () => {
    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'test@',
        'test @example.com',
        'test@example',
        '',
      ];

      invalidEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).toThrow();
        expect(validateEmail(email).valid).toBe(false);
      });
    });
  });
});

describe('API Key Schema', () => {
  describe('Valid API Keys', () => {
    it('should accept valid API key format', () => {
      const validKey = 'vxa_live_' + 'a'.repeat(40);
      
      expect(() => apiKeySchema.parse(validKey)).not.toThrow();
      expect(validateApiKey(validKey).valid).toBe(true);
    });

    it('should accept keys with alphanumeric characters', () => {
      const validKey = 'vxa_live_abcdefghijklmnopqrstuvwxyz01234567890ABC';
      
      expect(() => apiKeySchema.parse(validKey)).not.toThrow();
    });
  });

  describe('Invalid API Keys', () => {
    it('should reject keys without proper prefix', () => {
      const invalidKeys = [
        'invalid_' + 'a'.repeat(40),
        'vxa_test_' + 'a'.repeat(40),
        'a'.repeat(49),
      ];

      invalidKeys.forEach(key => {
        expect(() => apiKeySchema.parse(key)).toThrow();
        expect(validateApiKey(key).valid).toBe(false);
      });
    });

    it('should reject keys with wrong length', () => {
      const tooShort = 'vxa_live_' + 'a'.repeat(39);
      const tooLong = 'vxa_live_' + 'a'.repeat(41);
      
      expect(() => apiKeySchema.parse(tooShort)).toThrow();
      expect(() => apiKeySchema.parse(tooLong)).toThrow();
    });

    it('should reject keys with special characters', () => {
      const invalidKey = 'vxa_live_' + 'a'.repeat(38) + '@#';
      
      expect(() => apiKeySchema.parse(invalidKey)).toThrow();
    });
  });
});

describe('Meeting ID Schema', () => {
  describe('Valid Meeting IDs', () => {
    it('should accept Google Meet format', () => {
      const validIds = [
        'abc-defg-hij',
        'xyz-mnop-qrs',
        'aaa-bbbb-ccc',
      ];

      validIds.forEach(id => {
        expect(() => meetingIdSchema.parse(id)).not.toThrow();
        expect(validateMeetingId(id).valid).toBe(true);
      });
    });
  });

  describe('Invalid Meeting IDs', () => {
    it('should reject invalid formats', () => {
      const invalidIds = [
        'abc',
        'abc-def',
        'abc_def_ghi',
        'abc-defg-hij-klm',
        '',
      ];

      invalidIds.forEach(id => {
        expect(() => meetingIdSchema.parse(id)).toThrow();
        expect(validateMeetingId(id).valid).toBe(false);
      });
    });
  });
});

describe('Meeting URL Schema', () => {
  describe('Valid Meeting URLs', () => {
    it('should accept Google Meet URLs', () => {
      const validUrls = [
        'https://meet.google.com/abc-defg-hij',
        'https://meet.google.com/xyz-mnop-qrs?authuser=0',
        'meet.google.com/abc-defg-hij',
      ];

      validUrls.forEach(url => {
        expect(() => meetingUrlSchema.parse(url)).not.toThrow();
        expect(validateMeetingUrl(url).valid).toBe(true);
      });
    });

    it('should extract meeting ID from URL', () => {
      const url = 'https://meet.google.com/abc-defg-hij?authuser=0';
      const result = meetingUrlSchema.parse(url);
      
      expect(result.meetingId).toBe('abc-defg-hij');
    });
  });

  describe('Invalid Meeting URLs', () => {
    it('should reject non-Google Meet URLs', () => {
      const invalidUrls = [
        'https://example.com/meeting',
        'https://zoom.us/j/123456',
        'not-a-url',
        '',
      ];

      invalidUrls.forEach(url => {
        expect(() => meetingUrlSchema.parse(url)).toThrow();
        expect(validateMeetingUrl(url).valid).toBe(false);
      });
    });

    it('should reject URLs without meeting ID', () => {
      const invalidUrl = 'https://meet.google.com/';
      
      expect(() => meetingUrlSchema.parse(invalidUrl)).toThrow();
    });
  });
});

describe('Bot Name Schema', () => {
  describe('Valid Bot Names', () => {
    it('should accept valid bot names', () => {
      const validNames = [
        'Newar Bot',
        'Meeting Recorder',
        'Test Bot 123',
        'Bot-Name_Test',
      ];

      validNames.forEach(name => {
        expect(() => botNameSchema.parse(name)).not.toThrow();
        expect(validateBotName(name).valid).toBe(true);
      });
    });
  });

  describe('Invalid Bot Names', () => {
    it('should reject names that are too short', () => {
      const shortName = 'a';
      
      expect(() => botNameSchema.parse(shortName)).toThrow();
      expect(validateBotName(shortName).valid).toBe(false);
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(101);
      
      expect(() => botNameSchema.parse(longName)).toThrow();
      expect(validateBotName(longName).valid).toBe(false);
    });

    it('should reject empty names', () => {
      expect(() => botNameSchema.parse('')).toThrow();
      expect(validateBotName('').valid).toBe(false);
    });
  });
});

describe('Sanitization', () => {
  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe('Hello');
    });

    it('should handle multiple tags', () => {
      const input = '<div><span>Text</span></div>';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe('Text');
    });

    it('should preserve safe text', () => {
      const input = 'Hello World 123';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe(input);
    });

    it('should handle empty input', () => {
      const sanitized = sanitizeInput('');
      
      expect(sanitized).toBe('');
    });

    it('should handle malicious scripts', () => {
      const inputs = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)">',
      ];

      inputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('<svg');
        expect(sanitized).not.toContain('<iframe');
      });
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept HTTPS URLs', () => {
      const url = 'https://example.com/path';
      const sanitized = sanitizeUrl(url);
      
      expect(sanitized).toBe(url);
    });

    it('should accept HTTP URLs', () => {
      const url = 'http://example.com/path';
      const sanitized = sanitizeUrl(url);
      
      expect(sanitized).toBe(url);
    });

    it('should reject javascript: protocol', () => {
      const url = 'javascript:alert(1)';
      
      expect(() => sanitizeUrl(url)).toThrow();
    });

    it('should reject data: protocol', () => {
      const url = 'data:text/html,<script>alert(1)</script>';
      
      expect(() => sanitizeUrl(url)).toThrow();
    });

    it('should reject file: protocol', () => {
      const url = 'file:///etc/passwd';
      
      expect(() => sanitizeUrl(url)).toThrow();
    });

    it('should handle malformed URLs', () => {
      const invalidUrls = [
        'not a url',
        '://invalid',
        '',
      ];

      invalidUrls.forEach(url => {
        expect(() => sanitizeUrl(url)).toThrow();
      });
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove dangerous characters', () => {
      const fileName = 'test/../../../etc/passwd';
      const sanitized = sanitizeFileName(fileName);
      
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });

    it('should preserve safe characters', () => {
      const fileName = 'meeting_2025-01-01_recording.webm';
      const sanitized = sanitizeFileName(fileName);
      
      expect(sanitized).toBe(fileName);
    });

    it('should handle special characters', () => {
      const fileName = 'file:name*with?special<>chars|.txt';
      const sanitized = sanitizeFileName(fileName);
      
      expect(sanitized).not.toContain(':');
      expect(sanitized).not.toContain('*');
      expect(sanitized).not.toContain('?');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('|');
    });

    it('should handle empty input', () => {
      const sanitized = sanitizeFileName('');
      
      expect(sanitized).toBe('');
    });
  });
});

describe('Edge Cases', () => {
  it('should handle null and undefined gracefully', () => {
    expect(validateEmail(null as any).valid).toBe(false);
    expect(validateEmail(undefined as any).valid).toBe(false);
  });

  it('should handle very long inputs', () => {
    const longInput = 'a'.repeat(10000);
    
    expect(() => sanitizeInput(longInput)).not.toThrow();
  });

  it('should handle unicode characters', () => {
    const unicodeInput = 'Hello 世界 🌍';
    const sanitized = sanitizeInput(unicodeInput);
    
    expect(sanitized).toBe(unicodeInput);
  });

  it('should handle whitespace', () => {
    const input = '   test   ';
    const sanitized = sanitizeInput(input);
    
    expect(sanitized).toBe(input);
  });
});
