/**
 * Testes de Integração - API Client
 * 
 * Para rodar: npm test
 * Para testar manualmente: node tests/manual-api-test.js
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { apiClient } from '../lib/api-client';

// Configuração de teste
const TEST_CONFIG = {
  ADMIN_API_URL: process.env.VITE_ADMIN_API_URL || 'http://localhost:8081',
  API_GATEWAY_URL: process.env.VITE_API_GATEWAY_URL || 'http://localhost:8080',
  ADMIN_API_KEY: process.env.VITE_ADMIN_API_KEY || 'dev-admin-key',
};

describe('API Client - Admin API', () => {
  let testUserId: number;
  let testApiKey: string;

  describe('createUser', () => {
    it('deve criar um novo usuário', async () => {
      const request = {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      };

      const response = await apiClient.createUser(request);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.email).toBe(request.email);
      expect(response.name).toBe(request.name);
      expect(response.created_at).toBeDefined();

      testUserId = response.id;
    }, 10000);

    it('deve falhar com email inválido', async () => {
      const request = {
        email: 'invalid-email',
        name: 'Test User',
      };

      await expect(apiClient.createUser(request)).rejects.toThrow();
    });

    it('deve falhar com email duplicado', async () => {
      const request = {
        email: 'duplicate@example.com',
        name: 'Test User',
      };

      // Criar primeira vez
      await apiClient.createUser(request);

      // Tentar criar novamente
      await expect(apiClient.createUser(request)).rejects.toThrow();
    });
  });

  describe('generateToken', () => {
    it('deve gerar token para usuário existente', async () => {
      const response = await apiClient.generateToken(testUserId);

      expect(response).toBeDefined();
      expect(response.token).toBeDefined();
      expect(typeof response.token).toBe('string');
      expect(response.token.length).toBeGreaterThan(10);

      testApiKey = response.token;
    });

    it('deve falhar com usuário inexistente', async () => {
      await expect(apiClient.generateToken(999999)).rejects.toThrow();
    });
  });
});

describe('API Client - API Gateway', () => {
  let testApiKey: string;
  let testMeetingId: string;

  beforeAll(async () => {
    // Criar usuário de teste e obter API key
    const user = await apiClient.createUser({
      email: `gateway-test-${Date.now()}@example.com`,
      name: 'Gateway Test User',
    });
    const token = await apiClient.generateToken(user.id);
    testApiKey = token.token;
    testMeetingId = 'abc-defg-hij';
  });

  describe('createRecording', () => {
    it('deve criar uma nova gravação', async () => {
      const request = {
        platform: 'google_meet' as const,
        meeting_id: testMeetingId,
        bot_name: 'Test Bot',
      };

      const response = await apiClient.createRecording(testApiKey, request);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.meeting_id).toBe(testMeetingId);
      expect(response.platform).toBe('google_meet');
      expect(response.status).toBe('requested');
      expect(response.started_at).toBeDefined();
    }, 15000);

    it('deve falhar sem API key', async () => {
      const request = {
        platform: 'google_meet' as const,
        meeting_id: 'xyz-uvwx-klm',
        bot_name: 'Test Bot',
      };

      await expect(
        apiClient.createRecording('', request)
      ).rejects.toThrow();
    });

    it('deve falhar com API key inválida', async () => {
      const request = {
        platform: 'google_meet' as const,
        meeting_id: 'xyz-uvwx-klm',
        bot_name: 'Test Bot',
      };

      await expect(
        apiClient.createRecording('invalid-key', request)
      ).rejects.toThrow();
    });
  });

  describe('getRecordingStatus', () => {
    it('deve retornar status da gravação', async () => {
      const response = await apiClient.getRecordingStatus(
        testApiKey,
        testMeetingId
      );

      expect(response).toBeDefined();
      expect(response.meeting_id).toBe(testMeetingId);
      expect(response.status).toBeDefined();
      expect(['requested', 'starting', 'recording', 'stopping', 'completed', 'failed']).toContain(response.status);
    });

    it('deve falhar com meeting_id inexistente', async () => {
      await expect(
        apiClient.getRecordingStatus(testApiKey, 'nonexistent-meeting')
      ).rejects.toThrow();
    });
  });

  describe('listRecordings', () => {
    it('deve listar gravações do usuário', async () => {
      const response = await apiClient.listRecordings(testApiKey, 10, 0);

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      expect(response.total).toBeGreaterThanOrEqual(0);
      expect(response.limit).toBe(10);
      expect(response.offset).toBe(0);
    });

    it('deve respeitar limit e offset', async () => {
      const response1 = await apiClient.listRecordings(testApiKey, 5, 0);
      const response2 = await apiClient.listRecordings(testApiKey, 5, 5);

      expect(response1.data.length).toBeLessThanOrEqual(5);
      expect(response2.data.length).toBeLessThanOrEqual(5);
      
      // IDs devem ser diferentes
      if (response1.data.length > 0 && response2.data.length > 0) {
        expect(response1.data[0].id).not.toBe(response2.data[0].id);
      }
    });
  });

  describe('stopRecording', () => {
    it('deve parar uma gravação ativa', async () => {
      const response = await apiClient.stopRecording(
        testApiKey,
        testMeetingId
      );

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });

    it('deve falhar ao parar gravação inexistente', async () => {
      await expect(
        apiClient.stopRecording(testApiKey, 'nonexistent-meeting')
      ).rejects.toThrow();
    });
  });

  describe('downloadRecording', () => {
    it('deve baixar gravação completa', async () => {
      // Esperar gravação completar (pode levar tempo)
      // Este teste pode precisar de ajuste dependendo do tempo de processamento
      
      const blob = await apiClient.downloadRecording(
        testApiKey,
        testMeetingId
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    }, 30000);

    it('deve falhar ao baixar gravação não completa', async () => {
      // Criar nova gravação que ainda não completou
      const newMeeting = `test-${Date.now()}`;
      await apiClient.createRecording(testApiKey, {
        platform: 'google_meet',
        meeting_id: newMeeting,
        bot_name: 'Test Bot',
      });

      await expect(
        apiClient.downloadRecording(testApiKey, newMeeting)
      ).rejects.toThrow();
    });
  });
});

describe('API Client - Error Handling', () => {
  it('deve tratar timeout corretamente', async () => {
    // Simular timeout (servidor lento)
    const slowApiKey = 'slow-key';
    
    await expect(
      apiClient.getRecordingStatus(slowApiKey, 'any-meeting')
    ).rejects.toThrow(/demorou para responder|Timeout/i);
  }, 35000);

  it('deve tratar erro de rede', async () => {
    // Usar URL inválida para simular erro de rede
    const originalUrl = process.env.VITE_API_GATEWAY_URL;
    process.env.VITE_API_GATEWAY_URL = 'http://invalid-url:9999';

    await expect(
      apiClient.listRecordings('any-key', 10, 0)
    ).rejects.toThrow(/indisponível|conexão/i);

    // Restaurar URL
    process.env.VITE_API_GATEWAY_URL = originalUrl;
  });

  it('deve tratar erro HTTP 500', async () => {
    // Dependendo da implementação do servidor
    await expect(
      apiClient.createRecording('test-key', {
        platform: 'google_meet',
        meeting_id: 'trigger-500-error',
        bot_name: 'Test',
      })
    ).rejects.toThrow();
  });
});

describe('API Client - Performance', () => {
  let testApiKey: string;

  beforeAll(async () => {
    const user = await apiClient.createUser({
      email: `perf-test-${Date.now()}@example.com`,
      name: 'Performance Test',
    });
    const token = await apiClient.generateToken(user.id);
    testApiKey = token.token;
  });

  it('deve completar requisição em menos de 5 segundos', async () => {
    const start = Date.now();
    
    await apiClient.listRecordings(testApiKey, 10, 0);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  it('deve suportar requisições paralelas', async () => {
    const promises = [
      apiClient.listRecordings(testApiKey, 10, 0),
      apiClient.listRecordings(testApiKey, 10, 10),
      apiClient.listRecordings(testApiKey, 10, 20),
    ];

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.data).toBeInstanceOf(Array);
    });
  });
});
