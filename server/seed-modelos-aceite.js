import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const modelos = [ /* seed content omitted for brevity - original templates preserved in repo */ ];

async function main() {
  try {
    for (const m of modelos) {
      const existente = await prisma.modeloTermoAceite.findFirst({ where: { tipo: m.tipo } });
      if (existente) {
        await prisma.modeloTermoAceite.update({ where: { id: existente.id }, data: { titulo: m.titulo, conteudoHTML: m.conteudoHTML, ativo: true } });
        console.log(`Atualizado modelo: ${m.tipo}`);
      } else {
        await prisma.modeloTermoAceite.create({ data: { tipo: m.tipo, titulo: m.titulo, conteudoHTML: m.conteudoHTML, ativo: true, criadoPorId: null } });
        console.log(`Criado modelo: ${m.tipo}`);
      }
    }
    console.log('Seed de modelos de termo concluída.');
  } catch (err) { console.error('Erro no seed:', err); process.exitCode = 1; } finally { await prisma.$disconnect(); }
}

main();
