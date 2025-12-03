import jwt from 'jsonwebtoken';

/**
 * Middleware para verificar token JWT
 * Retorna o objeto decodificado do token se válido, senão envia resposta de erro 401
 */
export function verificarToken(req, res) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ 
      erro: 'Token não fornecido',
      statusCode: 401
    });
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    return decoded; // Retorna o objeto decodificado (id, funcao, etc)
  } catch (erro) {
    console.error('❌ Erro ao verificar JWT:', erro.message);
    res.status(401).json({ 
      erro: 'Token inválido ou expirado',
      statusCode: 401
    });
    return null;
  }
}

