#!/usr/bin/env node

/**
 * Gerador de API Key - Newar Insights
 * 
 * Gera uma API Key segura no formato:
 * newar_[32 caracteres aleatórios]
 * 
 * Uso:
 * node utils/generate-api-key.js
 */

import crypto from 'crypto';

function generateApiKey() {
  // Gerar 24 bytes aleatórios (resultará em 32 caracteres em base64url)
  const randomBytes = crypto.randomBytes(24);
  
  // Converter para base64url (sem +, / e =)
  const base64url = randomBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Formato: newar_[32 chars]
  return `newar_${base64url}`;
}

function generateMultipleKeys(count = 1) {
  const keys = [];
  for (let i = 0; i < count; i++) {
    keys.push(generateApiKey());
  }
  return keys;
}

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Executar se chamado diretamente
const args = process.argv.slice(2);
const count = parseInt(args[0]) || 1;

  log('\n╔════════════════════════════════════════╗', 'cyan');
  log('║     GERADOR DE API KEY - NEWAR INSIGHTS    ║', 'cyan');
  log('╚════════════════════════════════════════╝\n', 'cyan');

  if (count === 1) {
    const apiKey = generateApiKey();
    
    log('✓ API Key gerada com sucesso!\n', 'green');
    log('Sua API Key:', 'bold');
    log(`${apiKey}\n`, 'yellow');
    
    log('📋 Informações:', 'cyan');
    log(`   Comprimento: ${apiKey.length} caracteres`);
    log(`   Formato: newar_[32 chars]`);
    log(`   Segurança: 192 bits de entropia\n`);
    
    log('💡 Como usar:', 'cyan');
    log('   1. Copie a chave acima');
    log('   2. Cole na extensão (opção "Tenho uma API Key")');
    log('   3. Ou use no header: X-API-Key: ' + apiKey.substring(0, 20) + '...\n');
    
    log('⚠️  Importante:', 'yellow');
    log('   - Guarde esta chave em local seguro');
    log('   - Não compartilhe publicamente');
    log('   - Não commite no Git\n');
  } else {
    const keys = generateMultipleKeys(count);
    
    log(`✓ ${count} API Keys geradas com sucesso!\n`, 'green');
    
    keys.forEach((key, index) => {
      log(`${index + 1}. ${key}`, 'yellow');
    });
    
    log('');
  }

export { generateApiKey, generateMultipleKeys };
