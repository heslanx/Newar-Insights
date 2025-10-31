import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateApiKeyFormat,
  validateName,
  ValidationError,
} from '../validators';

describe('validators', () => {
  describe('validateEmail', () => {
    it('deve aceitar email válido', () => {
      expect(() => validateEmail('user@example.com')).not.toThrow();
      expect(() => validateEmail('test.user+tag@domain.co.uk')).not.toThrow();
    });

    it('deve rejeitar email inválido', () => {
      expect(() => validateEmail('invalid')).toThrow(ValidationError);
      expect(() => validateEmail('invalid@')).toThrow(ValidationError);
      expect(() => validateEmail('@example.com')).toThrow(ValidationError);
      expect(() => validateEmail('user@')).toThrow(ValidationError);
    });

    it('deve rejeitar email vazio', () => {
      expect(() => validateEmail('')).toThrow('Email é obrigatório');
      expect(() => validateEmail('   ')).toThrow('Email é obrigatório');
    });
  });

  describe('validatePassword', () => {
    it('deve aceitar senha válida', () => {
      expect(() => validatePassword('123456')).not.toThrow();
      expect(() => validatePassword('password123')).not.toThrow();
    });

    it('deve rejeitar senha muito curta', () => {
      expect(() => validatePassword('12345')).toThrow('pelo menos 6 caracteres');
    });

    it('deve rejeitar senha vazia', () => {
      expect(() => validatePassword('')).toThrow('Senha é obrigatória');
    });
  });

  describe('validateApiKeyFormat', () => {
    it('deve aceitar API key válida', () => {
      expect(() => validateApiKeyFormat('vxa_live_abc123def456')).not.toThrow();
      expect(() => validateApiKeyFormat('vxa_live_fhMiVM8Rcbu7l3YHz9mWH56hmKZcsfTC')).not.toThrow();
    });

    it('deve rejeitar API key sem prefixo', () => {
      expect(() => validateApiKeyFormat('abc123def456')).toThrow('deve começar com "vxa_live_"');
    });

    it('deve rejeitar API key muito curta', () => {
      expect(() => validateApiKeyFormat('vxa_live_ab')).toThrow('muito curta');
    });

    it('deve rejeitar API key vazia', () => {
      expect(() => validateApiKeyFormat('')).toThrow('API Key é obrigatória');
    });
  });

  describe('validateName', () => {
    it('deve aceitar nome válido', () => {
      expect(() => validateName('John Doe')).not.toThrow();
      expect(() => validateName('João Silva')).not.toThrow();
    });

    it('deve rejeitar nome muito curto', () => {
      expect(() => validateName('A')).toThrow('pelo menos 2 caracteres');
    });

    it('deve rejeitar nome vazio', () => {
      expect(() => validateName('')).toThrow('Nome é obrigatório');
    });
  });
});
