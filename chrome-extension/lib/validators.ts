/**
 * Validation utilities
 * Centralized validation logic for reuse across the application
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  if (!email || !email.trim()) {
    throw new ValidationError('Email é obrigatório');
  }
  
  if (!email.includes('@') || !email.includes('.')) {
    throw new ValidationError('Email inválido');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Formato de email inválido');
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): void {
  if (!password || !password.trim()) {
    throw new ValidationError('Senha é obrigatória');
  }
  
  if (password.length < 6) {
    throw new ValidationError('Senha deve ter pelo menos 6 caracteres');
  }
}

/**
 * Validate API key format
 */
export function validateApiKeyFormat(apiKey: string): void {
  if (!apiKey || !apiKey.trim()) {
    throw new ValidationError('API Key é obrigatória');
  }
  
  if (apiKey.length < 10) {
    throw new ValidationError('API Key inválida (muito curta)');
  }
  
  // Validate vxa_live_ prefix (correct prefix used by backend)
  if (!apiKey.startsWith('vxa_live_')) {
    throw new ValidationError('API Key deve começar com "vxa_live_"');
  }
}

/**
 * Validate name
 */
export function validateName(name: string): void {
  if (!name || !name.trim()) {
    throw new ValidationError('Nome é obrigatório');
  }
  
  if (name.trim().length < 2) {
    throw new ValidationError('Nome deve ter pelo menos 2 caracteres');
  }
}

/**
 * Validate meeting ID format
 */
export function validateMeetingId(meetingId: string): boolean {
  const meetingIdRegex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
  return meetingIdRegex.test(meetingId);
}
