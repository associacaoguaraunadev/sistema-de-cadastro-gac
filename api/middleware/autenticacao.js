import jwt from 'jsonwebtoken';

export const autenticarToken = (req, res, next) => {
  const cabecalhoAuth = req.headers['authorization'];
  const token = cabecalhoAuth && cabecalhoAuth.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token de acesso necessário' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ erro: 'Token inválido ou expirado' });
    }
    req.usuario = usuario;
    next();
  });
};

export const autorizarFuncao = (funcoes) => {
  return (req, res, next) => {
    if (!req.usuario || !funcoes.includes(req.usuario.funcao)) {
      return res.status(403).json({ erro: 'Acesso negado' });
    }
    next();
  };
};

// Wrapper para serverless
export const comAutenticacao = (handler) => {
  return async (req, res) => {
    const cabecalhoAuth = req.headers['authorization'];
    const token = cabecalhoAuth && cabecalhoAuth.split(' ')[1];

    if (!token) {
      return res.status(401).json({ erro: 'Token de acesso necessário' });
    }

    try {
      req.usuario = jwt.verify(token, process.env.JWT_SECRET);
      return handler(req, res);
    } catch (err) {
      return res.status(403).json({ erro: 'Token inválido ou expirado' });
    }
  };
};
