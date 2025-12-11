import { PrismaClient } from '@prisma/client';

// Script para marcar matrículas antigas como CONCLUIDA
// Uso: node api/scripts/cron-marcar-matriculas-concluidas.js

const prisma = new PrismaClient();

async function run() {
  try {
    const anoAtual = new Date().getFullYear();
    const res = await prisma.matricula.updateMany({
      where: { ano: { lt: anoAtual }, status: { not: 'CONCLUIDA' } },
      data: { status: 'CONCLUIDA' }
    });
    console.log(`✅ Matrículas atualizadas: ${res.count} (ano < ${anoAtual})`);
  } catch (err) {
    console.error('❌ Erro ao atualizar matrículas:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
