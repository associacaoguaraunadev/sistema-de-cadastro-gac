export const manipuladorErro = (err, req, res, next) => {
  console.error('Erro:', err);
  
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(400).json({ erro: 'Registro duplicado' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ erro: 'Registro não encontrado' });
    }
  }

  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor'
  });
};

export const manipuladorAssincrono = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
