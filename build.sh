#!/bin/bash
set -e

echo "📦 Instalando dependências do frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

echo "📦 Instalando dependências da API..."
cd api
npm install
cd ..

echo "✅ Build completo!"
