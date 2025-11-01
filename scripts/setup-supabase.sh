#!/bin/bash

# Newar Insights - Setup Supabase
# Este script configura o ambiente para usar Supabase

set -e

echo "🚀 Newar Insights - Setup Supabase"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verificar .env
echo "📋 Passo 1: Verificando configuração..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env não encontrado. Criando...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env criado com credenciais Supabase${NC}"
else
    echo -e "${GREEN}✅ .env encontrado${NC}"
fi

# Verificar se credenciais estão configuradas
if grep -q "SUPABASE_URL=https://iykklyrujvbmytkhwcfi.supabase.co" .env; then
    echo -e "${GREEN}✅ Credenciais Supabase configuradas${NC}"
else
    echo -e "${RED}❌ Credenciais Supabase não encontradas em .env${NC}"
    exit 1
fi

echo ""

# Step 2: Instruções para Supabase
echo "📊 Passo 2: Setup Supabase (manual)"
echo "===================================="
echo ""
echo -e "${YELLOW}⚠️  Você precisa executar 2 passos no Supabase Dashboard:${NC}"
echo ""
echo "2.1 Criar Schema PostgreSQL:"
echo "    1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/editor"
echo "    2. Copie o conteúdo de: migrations/postgres/001_initial_schema_supabase.sql"
echo "    3. Cole no SQL Editor e clique em 'Run'"
echo "    4. Confirme que aparece: ✅ Schema criado com sucesso!"
echo ""
echo "2.2 Criar Bucket Storage:"
echo "    1. Acesse: https://supabase.com/dashboard/project/iykklyrujvbmytkhwcfi/storage/buckets"
echo "    2. Clique em 'New bucket'"
echo "    3. Nome: insights"
echo "    4. Public bucket: ✅ YES"
echo "    5. Clique em 'Create bucket'"
echo ""
read -p "Pressione ENTER quando tiver completado os 2 passos acima..."
echo ""

# Step 3: Build services
echo "🏗️  Passo 3: Building services..."
echo "===================================="
echo ""

echo "Building Go services..."
make build

echo ""
echo "Building recording bot..."
make build-bot

echo ""
echo -e "${GREEN}✅ Build completo${NC}"
echo ""

# Step 4: Start services
echo "🚀 Passo 4: Starting services..."
echo "===================================="
echo ""

make start

echo ""
echo "⏳ Aguardando services ficarem healthy (30s)..."
sleep 30

echo ""
echo "🏥 Passo 5: Verificando health..."
echo "===================================="
echo ""

make health

echo ""
echo -e "${GREEN}✅ Setup completo!${NC}"
echo ""
echo "📝 Próximos passos:"
echo "==================="
echo ""
echo "1. Criar usuário teste:"
echo "   curl -X POST http://localhost:8081/admin/users \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-Admin-API-Key: admin_secret_change_me_in_production' \\"
echo "     -d '{\"email\": \"test@example.com\", \"name\": \"Test User\", \"max_concurrent_bots\": 10}'"
echo ""
echo "2. Gerar token:"
echo "   curl -X POST http://localhost:8081/admin/users/1/tokens \\"
echo "     -H 'X-Admin-API-Key: admin_secret_change_me_in_production'"
echo ""
echo "3. Testar gravação:"
echo "   export API_TOKEN=\"vxa_live_SEU_TOKEN\""
echo "   curl -X POST http://localhost:8080/recordings \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H \"X-API-Key: \$API_TOKEN\" \\"
echo "     -d '{\"platform\": \"google_meet\", \"meeting_id\": \"test-abc\", \"bot_name\": \"Test Bot\"}'"
echo ""
echo -e "${GREEN}🎉 Sistema rodando com Supabase!${NC}"
