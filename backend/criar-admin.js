import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function criarAdmin() {
  const email = 'admin@gac.com';
  const senha = 'Admin123!';
  const nome = 'Administrador GAC';

  try {
    console.log('\n🔐 Criando usuário admin...\n');

    // Verificar se já existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      console.log('⚠️  Usuário já existe:', email);
      console.log('   ID:', usuarioExistente.id);
      console.log('   Nome:', usuarioExistente.nome);
      console.log('   Função:', usuarioExistente.funcao);
      process.exit(0);
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar usuário
    const novoUsuario = await prisma.usuario.create({
      data: {
        email,
        nome,
        senha: senhaHash,
        funcao: 'admin',
        ativo: true
      }
    });

    console.log('✅ Usuário admin criado com sucesso!\n');
    console.log('📧 Email:', novoUsuario.email);
    console.log('🔑 Senha:', senha);
    console.log('👤 Nome:', novoUsuario.nome);
    console.log('🎯 Função:', novoUsuario.funcao);
    console.log('🆔 ID:', novoUsuario.id);
    console.log('\n💾 Dados salvos no banco de dados!\n');
    console.log('🔗 Próximos passos:');
    console.log('1. Acesse: http://localhost:3000/login');
    console.log('2. Email:', email);
    console.log('3. Senha:', senha);
    console.log('4. Clique em "Entrar"\n');

  } catch (erro) {
    console.error('❌ Erro ao criar usuário:', erro.message);
  } finally {
    await prisma.$disconnect();
  }
}

criarAdmin();
