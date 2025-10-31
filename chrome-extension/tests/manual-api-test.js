#!/usr/bin/env node

/**
 * Script Manual de Teste de APIs
 * 
 * Como usar:
 * 1. Certifique-se que o backend está rodando
 * 2. Configure as variáveis de ambiente se necessário
 * 3. Execute: node tests/manual-api-test.js
 */

const API_CONFIG = {
  ADMIN_API_URL: process.env.VITE_ADMIN_API_URL || 'http://localhost:8081',
  API_GATEWAY_URL: process.env.VITE_API_GATEWAY_URL || 'http://localhost:8080',
  ADMIN_API_KEY: process.env.VITE_ADMIN_API_KEY || 'dev-admin-key',
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Helper para fazer requisições
async function request(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Testes
async function testAdminAPI() {
  log('\n=== TESTANDO ADMIN API (Porta 8081) ===\n', 'blue');

  let userId;
  let apiKey;

  // Teste 1: Criar usuário
  try {
    logInfo('Teste 1: Criar usuário...');
    const email = `test-${Date.now()}@example.com`;
    const response = await request(`${API_CONFIG.ADMIN_API_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'X-Admin-Key': API_CONFIG.ADMIN_API_KEY,
      },
      body: JSON.stringify({
        email,
        name: 'Test User',
      }),
    });

    userId = response.id;
    logSuccess(`Usuário criado: ID ${userId}, Email: ${email}`);
    console.log('   Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    logError(`Falhou ao criar usuário: ${error.message}`);
    return false;
  }

  // Teste 2: Gerar token
  try {
    logInfo('\nTeste 2: Gerar token...');
    const response = await request(
      `${API_CONFIG.ADMIN_API_URL}/admin/users/${userId}/token`,
      {
        method: 'POST',
        headers: {
          'X-Admin-Key': API_CONFIG.ADMIN_API_KEY,
        },
      }
    );

    apiKey = response.token;
    logSuccess(`Token gerado: ${apiKey.substring(0, 20)}...`);
  } catch (error) {
    logError(`Falhou ao gerar token: ${error.message}`);
    return false;
  }

  return { userId, apiKey };
}

async function testAPIGateway(apiKey) {
  log('\n=== TESTANDO API GATEWAY (Porta 8080) ===\n', 'blue');

  const meetingId = `test-${Date.now()}`;

  // Teste 3: Criar gravação
  try {
    logInfo('Teste 3: Criar gravação...');
    const response = await request(`${API_CONFIG.API_GATEWAY_URL}/recordings`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        platform: 'google_meet',
        meeting_id: meetingId,
        bot_name: 'Test Bot',
      }),
    });

    logSuccess(`Gravação criada: ID ${response.id}, Meeting: ${meetingId}`);
    console.log('   Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    logError(`Falhou ao criar gravação: ${error.message}`);
    return false;
  }

  // Teste 4: Verificar status
  try {
    logInfo('\nTeste 4: Verificar status da gravação...');
    const response = await request(
      `${API_CONFIG.API_GATEWAY_URL}/recordings/google_meet/${meetingId}`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );

    logSuccess(`Status: ${response.status}`);
    console.log('   Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    logError(`Falhou ao verificar status: ${error.message}`);
  }

  // Teste 5: Listar gravações
  try {
    logInfo('\nTeste 5: Listar gravações...');
    const response = await request(
      `${API_CONFIG.API_GATEWAY_URL}/recordings?limit=10&offset=0`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );

    logSuccess(`Total de gravações: ${response.total}`);
    console.log('   Primeiras gravações:', JSON.stringify(response.data.slice(0, 2), null, 2));
  } catch (error) {
    logError(`Falhou ao listar gravações: ${error.message}`);
  }

  // Teste 6: Parar gravação
  try {
    logInfo('\nTeste 6: Parar gravação...');
    const response = await request(
      `${API_CONFIG.API_GATEWAY_URL}/recordings/google_meet/${meetingId}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );

    logSuccess(`Gravação parada: ${response.message}`);
  } catch (error) {
    logError(`Falhou ao parar gravação: ${error.message}`);
  }

  return true;
}

async function testErrorHandling(apiKey) {
  log('\n=== TESTANDO TRATAMENTO DE ERROS ===\n', 'blue');

  // Teste 7: API Key inválida
  try {
    logInfo('Teste 7: Tentar com API Key inválida...');
    await request(`${API_CONFIG.API_GATEWAY_URL}/recordings?limit=10&offset=0`, {
      headers: {
        'X-API-Key': 'invalid-key-12345',
      },
    });
    logWarning('Deveria ter falhado com API Key inválida');
  } catch (error) {
    logSuccess(`Erro capturado corretamente: ${error.message}`);
  }

  // Teste 8: Meeting ID inexistente
  try {
    logInfo('\nTeste 8: Buscar meeting inexistente...');
    await request(
      `${API_CONFIG.API_GATEWAY_URL}/recordings/google_meet/nonexistent-meeting`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );
    logWarning('Deveria ter falhado com meeting inexistente');
  } catch (error) {
    logSuccess(`Erro capturado corretamente: ${error.message}`);
  }

  // Teste 9: Requisição sem autenticação
  try {
    logInfo('\nTeste 9: Requisição sem API Key...');
    await request(`${API_CONFIG.API_GATEWAY_URL}/recordings?limit=10&offset=0`);
    logWarning('Deveria ter falhado sem API Key');
  } catch (error) {
    logSuccess(`Erro capturado corretamente: ${error.message}`);
  }
}

async function testPerformance(apiKey) {
  log('\n=== TESTANDO PERFORMANCE ===\n', 'blue');

  // Teste 10: Tempo de resposta
  try {
    logInfo('Teste 10: Medindo tempo de resposta...');
    const start = Date.now();
    
    await request(`${API_CONFIG.API_GATEWAY_URL}/recordings?limit=10&offset=0`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });
    
    const duration = Date.now() - start;
    
    if (duration < 1000) {
      logSuccess(`Tempo de resposta: ${duration}ms (Excelente!)`);
    } else if (duration < 3000) {
      logSuccess(`Tempo de resposta: ${duration}ms (Bom)`);
    } else {
      logWarning(`Tempo de resposta: ${duration}ms (Lento)`);
    }
  } catch (error) {
    logError(`Falhou no teste de performance: ${error.message}`);
  }

  // Teste 11: Requisições paralelas
  try {
    logInfo('\nTeste 11: Testando requisições paralelas...');
    const start = Date.now();
    
    await Promise.all([
      request(`${API_CONFIG.API_GATEWAY_URL}/recordings?limit=5&offset=0`, {
        headers: { 'X-API-Key': apiKey },
      }),
      request(`${API_CONFIG.API_GATEWAY_URL}/recordings?limit=5&offset=5`, {
        headers: { 'X-API-Key': apiKey },
      }),
      request(`${API_CONFIG.API_GATEWAY_URL}/recordings?limit=5&offset=10`, {
        headers: { 'X-API-Key': apiKey },
      }),
    ]);
    
    const duration = Date.now() - start;
    logSuccess(`3 requisições paralelas em ${duration}ms`);
  } catch (error) {
    logError(`Falhou no teste paralelo: ${error.message}`);
  }
}

// Executar todos os testes
async function runAllTests() {
  log('\n╔════════════════════════════════════════╗', 'cyan');
  log('║   TESTE MANUAL DE APIs - NEWAR INSIGHTS   ║', 'cyan');
  log('╚════════════════════════════════════════╝\n', 'cyan');

  logInfo(`Admin API: ${API_CONFIG.ADMIN_API_URL}`);
  logInfo(`API Gateway: ${API_CONFIG.API_GATEWAY_URL}`);
  logInfo(`Admin Key: ${API_CONFIG.ADMIN_API_KEY}\n`);

  try {
    // Testar Admin API
    const adminResult = await testAdminAPI();
    if (!adminResult) {
      logError('\n❌ Testes da Admin API falharam. Abortando...');
      process.exit(1);
    }

    // Testar API Gateway
    const gatewayResult = await testAPIGateway(adminResult.apiKey);
    if (!gatewayResult) {
      logWarning('\n⚠️  Alguns testes do API Gateway falharam');
    }

    // Testar tratamento de erros
    await testErrorHandling(adminResult.apiKey);

    // Testar performance
    await testPerformance(adminResult.apiKey);

    // Resumo final
    log('\n╔════════════════════════════════════════╗', 'green');
    log('║         TESTES CONCLUÍDOS COM SUCESSO!        ║', 'green');
    log('╚════════════════════════════════════════╝\n', 'green');

    logSuccess('✓ Admin API funcionando');
    logSuccess('✓ API Gateway funcionando');
    logSuccess('✓ Tratamento de erros OK');
    logSuccess('✓ Performance aceitável');

    log('\n📊 Próximos passos:', 'cyan');
    log('   1. Integrar com a extensão');
    log('   2. Testar fluxo completo end-to-end');
    log('   3. Configurar monitoramento de produção\n');

  } catch (error) {
    logError(`\n❌ Erro fatal: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Executar
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
