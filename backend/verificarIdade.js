import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarSchema() {
  try {
    // Buscar uma pessoa para ver os campos
    const pessoas = await prisma.pessoa.findMany({
      take: 1
    });

    if (pessoas.length > 0) {
      console.log('✅ Dados de uma pessoa:');
      console.log(JSON.stringify(pessoas[0], null, 2));
    } else {
      console.log('⚠️ Nenhuma pessoa encontrada no banco');
    }

    // Tentar criar uma pessoa com idade
    console.log('\n📝 Testando criação com idade...');
    const novaPessoa = await prisma.pessoa.create({
      data: {
        nome: 'Teste Idade',
        cpf: '12345678901',
        endereco: 'Rua Teste',
        tipoBeneficio: 'Cesta Básica',
        idade: 25,
        usuarioId: 1
      }
    });

    console.log('✅ Pessoa criada com idade:');
    console.log(JSON.stringify(novaPessoa, null, 2));

  } catch (erro) {
    console.error('❌ Erro:', erro.message);
  } finally {
    await prisma.$disconnect();
  }
}

verificarSchema();
