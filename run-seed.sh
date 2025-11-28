#!/bin/bash

# Script para rodar seed e testar

echo ""
echo "🌱 SEED DO PROJETO GAC"
echo "═════════════════════════════════════"
echo ""

# Verificar se está na raiz do projeto
if [ ! -f "seed.js" ]; then
    echo "❌ Erro: seed.js não encontrado!"
    echo "Execute este script da raiz do projeto:"
    echo "   cd gac_system"
    echo "   bash run-seed.sh"
    exit 1
fi

# Verificar se backend/.env existe
if [ ! -f "backend/.env" ]; then
    echo "❌ Erro: backend/.env não encontrado!"
    echo "Crie o arquivo com as variáveis:"
    echo "   DATABASE_URL=..."
    echo "   JWT_SECRET=..."
    exit 1
fi

# Verificar DATABASE_URL
if ! grep -q "DATABASE_URL" backend/.env; then
    echo "❌ Erro: DATABASE_URL não está em backend/.env"
    exit 1
fi

echo "✅ Verificações OK"
echo ""

# Rodar seed
echo "🌱 Executando seed.js..."
echo ""

node seed.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✨ Seed concluído com sucesso!"
    echo ""
    echo "📝 Próximas etapas:"
    echo "   1. Terminal 1: cd backend && npm run dev"
    echo "   2. Terminal 2: cd frontend && npm run dev"
    echo "   3. Navegador: http://localhost:5173"
    echo "   4. Login: admin@gac.com / Admin@2025"
    echo ""
else
    echo ""
    echo "❌ Erro ao executar seed!"
    echo "Verifique:"
    echo "   • DATABASE_URL está correto?"
    echo "   • Supabase está acessível?"
    echo "   • Node modules instalados?"
    exit 1
fi
