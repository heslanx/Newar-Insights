/**
 * Authentication service
 * Centralized authentication logic
 */

import { apiClient } from './api-client';
import { storage } from './storage';
import { validateApiKeyFormat, validateEmail, validatePassword, validateName, ValidationError } from './validators';
import { parseApiError, logError } from './error-handler';
import type { UserSession } from './types';

export interface AuthResult {
  success: boolean;
  error?: string;
  session?: UserSession;
}

/**
 * Validate and save API key
 */
export async function validateAndSaveApiKey(apiKey: string): Promise<AuthResult> {
  try {
    // 1. Validate format
    validateApiKeyFormat(apiKey);
    
    console.log('[Newar Auth] Validating API Key...');
    
    // 2. Validate with backend
    try {
      const response = await apiClient.listRecordings(apiKey, 1, 0);
      console.log('[Newar Auth] API Key válida!', response);
      
      // 3. Create session
      const session: UserSession = {
        user: {
          id: 1,
          name: 'API User',
          email: 'api@example.com',
          max_concurrent_bots: 3,
        },
        api_key: apiKey,
        logged_in_at: new Date().toISOString(),
      };
      
      // 4. Save session
      await storage.setUserSession(session);
      await storage.completeOnboarding();
      
      console.log('[Newar Auth] Session saved successfully');
      
      return { success: true, session };
    } catch (apiError) {
      logError(apiError, { operation: 'validate API key' });
      return { success: false, error: parseApiError(apiError) };
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    logError(error, { operation: 'validate API key format' });
    return { success: false, error: 'Erro ao validar API Key' };
  }
}

/**
 * Create new account
 */
export async function createAccount(
  name: string,
  email: string
): Promise<AuthResult> {
  try {
    // 1. Validate inputs
    validateName(name);
    validateEmail(email);
    
    console.log('[Newar Auth] Creating account...');
    
    // 2. Create user
    const user = await apiClient.createUser({ name, email });
    console.log('[Newar Auth] User created:', user);
    
    // 3. Generate token
    const tokenResponse = await apiClient.generateToken(user.id);
    console.log('[Newar Auth] Token generated');
    
    // 4. Create session
    const session: UserSession = {
      user,
      api_key: tokenResponse.token,
      logged_in_at: new Date().toISOString(),
    };
    
    // 5. Save session
    await storage.setUserSession(session);
    await storage.completeOnboarding();
    
    console.log('[Newar Auth] Account created successfully');
    
    return { success: true, session };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    logError(error, { operation: 'create account', details: { name, email } });
    return { success: false, error: parseApiError(error, { operation: 'criar conta' }) };
  }
}

/**
 * Login with email and password
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    // 1. Validate inputs
    validateEmail(email);
    validatePassword(password);
    
    console.log('[Newar Auth] Logging in...');
    
    // TODO: Implement actual login API call
    // For now, simulate login
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser = {
      id: 1,
      name: email.split('@')[0],
      email,
      max_concurrent_bots: 3,
    };
    
    const mockToken = 'mock-api-key-' + Date.now();
    
    const session: UserSession = {
      user: mockUser,
      api_key: mockToken,
      logged_in_at: new Date().toISOString(),
    };
    
    await storage.setUserSession(session);
    await storage.completeOnboarding();
    
    console.log('[Newar Auth] Login successful');
    
    return { success: true, session };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    logError(error, { operation: 'login', details: { email } });
    return { success: false, error: parseApiError(error, { operation: 'fazer login' }) };
  }
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  try {
    await storage.clearUserSession();
    console.log('[Newar Auth] Logout successful');
  } catch (error) {
    logError(error, { operation: 'logout' });
    throw error;
  }
}

/**
 * Update API key
 */
export async function updateApiKey(
  currentSession: UserSession,
  newApiKey: string
): Promise<AuthResult> {
  try {
    // 1. Validate format
    validateApiKeyFormat(newApiKey);
    
    console.log('[Newar Auth] Validating new API Key...');
    
    // 2. Validate with backend
    try {
      const response = await apiClient.listRecordings(newApiKey, 1, 0);
      console.log('[Newar Auth] New API Key válida!', response);
      
      // 3. Update session
      const updatedSession: UserSession = {
        ...currentSession,
        api_key: newApiKey,
      };
      
      await storage.setUserSession(updatedSession);
      
      console.log('[Newar Auth] API Key updated successfully');
      
      return { success: true, session: updatedSession };
    } catch (apiError) {
      logError(apiError, { operation: 'validate new API key' });
      return { success: false, error: parseApiError(apiError) };
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    logError(error, { operation: 'update API key' });
    return { success: false, error: 'Erro ao atualizar API Key' };
  }
}
