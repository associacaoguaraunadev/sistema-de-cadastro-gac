#!/usr/bin/env node

/**
 * Script de Diagnóstico - Verifica o status de um usuário no banco de dados
 * Uso: node diagnostico-usuario.js seu@email.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosticar() {
  const emailBuscado = process.argv[2];

  if (!emailBuscado) {
    console.log('\n❌ Erro: Forneça um email como argumento');
    console.log('Uso: node diagnostico-usuario.js seu@email.com\n');
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Diagnosticando usuário: ${emailBuscado}\n`);

    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email: emailBuscado },
      include: {
        pessoas: {
          select: { id: true, nome: true, cpf: true, status: true }
        }
      }
    });

    if (!usuario) {
      console.log('❌ Usuário NÃO encontrado no banco de dados\n');
      process.exit(1);
    }

    console.log('✅ Usuário ENCONTRADO:');
    console.log(`   ID: ${usuario.id}`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   Nome: ${usuario.nome}`);
    console.log(`   Função: ${usuario.funcao}`);
    console.log(`   Ativo: ${usuario.ativo ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   Data Criação: ${usuario.dataCriacao}`);
    console.log(`   Data Atualização: ${usuario.dataAtualizacao}`);

    // Verificar pessoas associadas
    const totalPessoas = usuario.pessoas.length;
    console.log(`\n📋 Pessoas Associadas: ${totalPessoas}`);

    if (totalPessoas > 0) {
      console.log('   Primeiras 5 pessoas:');
      usuario.pessoas.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.nome} (CPF: ${p.cpf}, Status: ${p.status})`);
      });
      if (totalPessoas > 5) {
        console.log(`   ... e mais ${totalPessoas - 5} pessoas`);
      }
    } else {
      console.log('   ⚠️ Nenhuma pessoa cadastrada para este usuário');
    }

    // Verificar se há problemas
    console.log('\n🔍 VERIFICAÇÕES:');
    
    if (!usuario.ativo) {
      console.log('❌ PROBLEMA: Usuário está INATIVO');
      console.log('   Solução: Ativar usuário no banco de dados');
    } else {
      console.log('✅ Usuário está ativo');
    }

    if (totalPessoas === 0) {
      console.log('⚠️ AVISO: Usuário não tem nenhuma pessoa cadastrada');
      console.log('   (Isso é normal se é um novo usuário)');
    } else {
      console.log(`✅ Usuário tem ${totalPessoas} pessoas cadastradas`);
    }

    // Verificar se há outros usuários para comparação
    const totalUsuarios = await prisma.usuario.count();
    console.log(`\n👥 Total de Usuários no Sistema: ${totalUsuarios}`);

    console.log('\n✅ Diagnóstico concluído!\n');

  } catch (erro) {
    console.error('\n❌ Erro ao diagnosticar:');
    console.error(erro.message);
    console.error();
  } finally {
    await prisma.$disconnect();
  }
}

diagnosticar();
