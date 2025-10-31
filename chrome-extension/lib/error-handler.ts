/**
 * Error handling utilities
 * Centralized error handling and user-friendly messages
 */

export interface ErrorContext {
  operation: string;
  details?: Record<string, any>;
}

/**
 * Parse API error and return user-friendly message
 */
export function parseApiError(error: unknown, context?: ErrorContext): string {
  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  
  // Network errors
  if (errorMessage.includes('indisponível') || errorMessage.includes('conexão') || errorMessage.includes('NetworkError')) {
    return 'Servidor indisponível. Verifique se o backend está rodando.';
  }
  
  // Authentication errors
  if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden')) {
    return 'API Key inválida ou sem permissão. Verifique se a chave está correta.';
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('demorou')) {
    return 'Servidor demorou para responder. Tente novamente.';
  }
  
  // Not found errors
  if (errorMessage.includes('404') || errorMessage.includes('Not found')) {
    return 'Recurso não encontrado.';
  }
  
  // Validation errors
  if (errorMessage.includes('inválid') || errorMessage.includes('obrigatório')) {
    return errorMessage; // Keep validation messages as-is
  }
  
  // Generic error with context
  if (context) {
    return `Erro ao ${context.operation}: ${errorMessage}`;
  }
  
  return errorMessage;
}

/**
 * Log error with context
 */
export function logError(error: unknown, context: ErrorContext): void {
  console.error(`[Newar Error] ${context.operation}:`, error);
  if (context.details) {
    console.error('[Newar Error] Details:', context.details);
  }
}

/**
 * Handle async operation with error handling
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    logError(error, context);
    return { success: false, error: parseApiError(error, context) };
  }
}
