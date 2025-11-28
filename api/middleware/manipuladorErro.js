export const tratarErroAssincrono = (erro) => {
  console.error('Erro:', erro);
  
  if (erro.name === 'PrismaClientKnownRequestError') {
    if (erro.code === 'P2002') {
      return { status: 400, erro: 'Registro duplicado' };
    }
    if (erro.code === 'P2025') {
      return { status: 404, erro: 'Registro não encontrado' };
    }
  }

  if (erro.message && erro.message.includes('Unique constraint')) {
    return { status: 400, erro: 'Registro duplicado' };
  }

  return {
    status: erro.status || 500,
    erro: erro.message || 'Erro interno do servidor'
  };
};
