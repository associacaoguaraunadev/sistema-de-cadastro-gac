#!/bin/bash

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testando Setup Vercel + Supabase"
echo ""

# Check Node version
echo "1️⃣  Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js $NODE_VERSION"
else
    echo "❌ Node.js não instalado"
    exit 1
fi

# Check .env
echo ""
echo "2️⃣  Verificando .env..."
if [ -f "backend/.env" ]; then
    echo "✅ backend/.env existe"
    
    if grep -q "DATABASE_URL" backend/.env; then
        echo "✅ DATABASE_URL configurado"
    else
        echo "❌ DATABASE_URL faltando"
    fi
    
    if grep -q "JWT_SECRET" backend/.env; then
        echo "✅ JWT_SECRET configurado"
    else
        echo "❌ JWT_SECRET faltando"
    fi
else
    echo "❌ backend/.env não existe"
    echo "   Copie .env.example para backend/.env"
fi

# Check dependencies
echo ""
echo "3️⃣  Verificando dependências..."
if [ -d "api/node_modules" ]; then
    echo "✅ API dependencies instalados"
else
    echo "⚠️  API dependencies não instalados"
    echo "   Execute: cd api && npm install"
fi

if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies instalados"
else
    echo "⚠️  Frontend dependencies não instalados"
    echo "   Execute: cd frontend && npm install"
fi

# Check Prisma
echo ""
echo "4️⃣  Verificando Prisma..."
if [ -f "backend/prisma/schema.prisma" ]; then
    echo "✅ schema.prisma existe"
    
    if grep -q "postgresql" backend/prisma/schema.prisma; then
        echo "✅ Schema configurado para PostgreSQL (Supabase)"
    else
        echo "❌ Schema ainda usa SQLite"
    fi
else
    echo "❌ schema.prisma não encontrado"
fi

# Summary
echo ""
echo "════════════════════════════════════════"
echo "📋 PRÓXIMOS PASSOS:"
echo "════════════════════════════════════════"
echo ""
echo "1. Crie conta no Supabase.com"
echo "2. Crie um novo projeto PostgreSQL"
echo "3. Copie a DATABASE_URL"
echo "4. Configure backend/.env:"
echo "   - DATABASE_URL=..."
echo "   - JWT_SECRET=..."
echo "5. Execute:"
echo "   cd backend"
echo "   npm run prisma-migrate"
echo "6. Teste localmente:"
echo "   npm run dev (backend)"
echo "   npm run dev (frontend)"
echo ""
echo "Para deploy:"
echo "1. Push seu código no GitHub"
echo "2. Conecte repo no Vercel"
echo "3. Configure as mesmas variáveis"
echo "4. Vercel faz deploy automaticamente"
echo ""
