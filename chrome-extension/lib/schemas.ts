/**
 * Zod Validation Schemas
 *
 * Runtime validation + TypeScript type inference
 *
 * Install: npm install zod
 */

// Note: Zod not yet installed, this file is ready for when it is
// Uncomment imports when zod is installed:
// import { z } from 'zod';

/**
 * Example schemas (ready to use after npm install zod)
 */

// Email validation
export const emailSchema = {
  // z.string().email('Email inválido').min(1, 'Email é obrigatório')
  parse: (email: string) => {
    // Temporary validation until zod is installed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Email inválido');
    }
    return email;
  }
};

// API Key validation (vxa_live_ prefix)
export const apiKeySchema = {
  // z.string().regex(/^vxa_live_[A-Za-z0-9]{40}$/, 'API Key inválida')
  parse: (key: string) => {
    const keyRegex = /^vxa_live_[A-Za-z0-9]{40}$/;
    if (!keyRegex.test(key)) {
      throw new Error('API Key inválida. Deve começar com vxa_live_ seguido de 40 caracteres');
    }
    return key;
  }
};

// Meeting ID validation (Google Meet format)
export const meetingIdSchema = {
  // z.string().regex(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/, 'ID de reunião inválido')
  parse: (id: string) => {
    const meetingRegex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
    if (!meetingRegex.test(id)) {
      throw new Error('ID de reunião inválido. Formato esperado: abc-defg-hij');
    }
    return id;
  }
};

// Meeting URL validation
export const meetingUrlSchema = {
  parse: (url: string) => {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.includes('meet.google.com')) {
        throw new Error('URL deve ser do Google Meet');
      }
      return url;
    } catch {
      throw new Error('URL inválida');
    }
  }
};

// Bot name validation
export const botNameSchema = {
  parse: (name: string) => {
    if (!name || name.trim().length === 0) {
      throw new Error('Nome do bot é obrigatório');
    }
    if (name.length > 50) {
      throw new Error('Nome do bot deve ter no máximo 50 caracteres');
    }
    return name.trim();
  }
};

/**
 * Full Zod implementation (uncomment after npm install zod)
 */

/*
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  max_concurrent_bots: z.number().int().min(1).max(100).default(3),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type User = z.infer<typeof userSchema>;

// Recording schema
export const recordingSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  platform: z.enum(['google_meet', 'teams']),
  meeting_id: z.string().regex(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/),
  bot_container_id: z.string().nullable(),
  status: z.enum([
    'requested',
    'joining',
    'active',
    'recording',
    'reconnecting',
    'finalizing',
    'completed',
    'failed'
  ]),
  meeting_url: z.string().url(),
  recording_path: z.string().nullable(),
  started_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  chunk_count: z.number().int().min(0).default(0)
});

export type Recording = z.infer<typeof recordingSchema>;

// Create recording request schema
export const createRecordingRequestSchema = z.object({
  meeting_url: z.string().url('URL inválida'),
  platform: z.enum(['google_meet', 'teams']).default('google_meet'),
  bot_name: z.string().min(1).max(50).default('Newar Bot')
});

export type CreateRecordingRequest = z.infer<typeof createRecordingRequestSchema>;

// Settings schema
export const settingsSchema = z.object({
  notifications: z.boolean().default(true),
  autoAdmit: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  defaultBotName: z.string().min(1).max(50).default('Newar Bot'),
  language: z.enum(['en', 'pt']).default('pt')
});

export type Settings = z.infer<typeof settingsSchema>;

// API Error schema
export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.record(z.any()).optional()
});

export type APIError = z.infer<typeof apiErrorSchema>;

// Helper function to safely parse
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errors };
  }
}
*/

/**
 * Validation helpers (work without zod)
 */

export function validateEmail(email: string): { valid: boolean; error?: string } {
  try {
    emailSchema.parse(email);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

export function validateApiKey(key: string): { valid: boolean; error?: string } {
  try {
    apiKeySchema.parse(key);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

export function validateMeetingUrl(url: string): { valid: boolean; error?: string } {
  try {
    meetingUrlSchema.parse(url);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

export function validateBotName(name: string): { valid: boolean; error?: string } {
  try {
    botNameSchema.parse(name);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

/**
 * Sanitization helpers
 */

export function sanitizeInput(input: string): string {
  // Remove HTML tags
  return input.replace(/<[^>]*>/g, '');
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow https and http
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new Error('Protocol not allowed');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
}

export function sanitizeFilename(filename: string): string {
  // Remove invalid filename characters
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}
