import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// Pool de conexão Prisma singleton
let prismaInstance = null;

function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn']
    });
  }
  return prismaInstance;
}

// CORS Header
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

// Log utility
function log(msg) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
}

// Verify JWT
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch (error) {
    log(`❌ JWT verification failed: ${error.message}`);
    return null;
  }
}

// ============ AUTENTICAÇÃO ============

async function handleLogin(req, res) {
  const prisma = getPrisma();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Method not allowed' });
  }

  try {
    const { email, senha } = req.body;
    log(`🔐 Login attempt: ${email}`);

    if (!email || !senha) {
      log(`❌ Missing credentials for: ${email}`);
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const usuario = await prisma.usuario.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        nome: true,
        funcao: true,
        ativo: true,
        senha: true
      }
    });

    if (!usuario) {
      log(`❌ User not found: ${email}`);
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    if (!usuario.ativo) {
      log(`❌ User inactive: ${email}`);
      return res.status(401).json({ erro: 'Usuário desativado' });
    }

    // Compare password
    log(`🔑 Comparing password for: ${email}`);
    const passwordMatch = await bcrypt.compare(senha, usuario.senha);

    if (!passwordMatch) {
      log(`❌ Password mismatch for: ${email}`);
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    // Generate token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, funcao: usuario.funcao },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    log(`✅ Login success: ${email}`);
    
    const { senha: _, ...usuarioSafe } = usuario;
    
    return res.status(200).json({
      token,
      usuario: usuarioSafe
    });
  } catch (error) {
    log(`❌ Login error: ${error.message}`);
    return res.status(500).json({ erro: 'Erro ao fazer login' });
  }
}

async function handleRegister(req, res) {
  const prisma = getPrisma();

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Method not allowed' });
  }

  try {
    const { email, senha, nome, codigoConvite } = req.body;
    log(`📝 Register attempt: ${email}`);

    // Validate
    if (!email || !senha || !nome || !codigoConvite) {
      log(`❌ Missing fields`);
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ erro: 'Senha deve ter no mínimo 6 caracteres' });
    }

    // Check if user exists
    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      log(`❌ Email already exists: ${email}`);
      return res.status(409).json({ erro: 'Email já registrado' });
    }

    const isToken = codigoConvite.startsWith('GAC-TOKEN-');
    let userRole = 'usuario';
    let codeFound = null;

    if (isToken) {
      // Validate token
      log(`🔑 Validating TOKEN`);
      codeFound = await prisma.tokenGeracao.findUnique({ 
        where: { token: codigoConvite } 
      });

      if (!codeFound) {
        return res.status(401).json({ erro: 'Token inválido' });
      }
      if (codeFound.usado) {
        return res.status(401).json({ erro: 'Token já foi utilizado' });
      }
      if (new Date() > new Date(codeFound.dataExpiracao)) {
        return res.status(401).json({ erro: 'Token expirado' });
      }
      if (codeFound.email !== email) {
        return res.status(401).json({ erro: 'Este token é para outro email' });
      }
      userRole = 'funcionario';
    } else {
      // Validate invite code
      log(`📧 Validating INVITE CODE`);
      codeFound = await prisma.codigoConvite.findUnique({ 
        where: { codigo: codigoConvite } 
      });

      if (!codeFound) {
        return res.status(401).json({ erro: 'Código de convite inválido' });
      }
      if (codeFound.usado) {
        return res.status(401).json({ erro: 'Código de convite já foi utilizado' });
      }
      if (codeFound.dataExpiracao && new Date() > new Date(codeFound.dataExpiracao)) {
        return res.status(401).json({ erro: 'Código de convite expirado' });
      }
      if (codeFound.email !== email) {
        return res.status(401).json({ erro: 'Este código de convite é para outro email' });
      }
      userRole = 'usuario';
    }

    // Hash password
    log(`🔑 Hashing password`);
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Create user
    const newUser = await prisma.usuario.create({
      data: {
        email,
        senha: hashedPassword,
        nome,
        funcao: userRole,
        ativo: true
      },
      select: {
        id: true,
        email: true,
        nome: true,
        funcao: true
      }
    });

    // Mark code as used
    if (isToken) {
      await prisma.tokenGeracao.update({
        where: { token: codigoConvite },
        data: {
          usado: true,
          usadoPor: email,
          usadoEm: new Date()
        }
      });
    } else {
      await prisma.codigoConvite.update({
        where: { codigo: codigoConvite },
        data: {
          usado: true,
          usadoPorId: newUser.id,
          usadoEm: new Date()
        }
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, funcao: newUser.funcao },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    log(`✅ Register success: ${email}`);

    return res.status(201).json({
      token,
      usuario: newUser
    });
  } catch (error) {
    log(`❌ Register error: ${error.message}`);
    return res.status(500).json({ erro: 'Erro ao registrar' });
  }
}

async function handleMe(req, res) {
  const prisma = getPrisma();

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Method not allowed' });
  }

  try {
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const usuarioBd = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        nome: true,
        funcao: true
      }
    });

    if (!usuarioBd) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    return res.status(200).json(usuarioBd);
  } catch (error) {
    log(`❌ Me error: ${error.message}`);
    return res.status(500).json({ erro: 'Erro ao obter usuário' });
  }
}

// ============ MAIN HANDLER ============

export default async function handler(req, res) {
  handleCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse the route
  const { slug } = req.query;
  const route = Array.isArray(slug) ? slug.join('/') : slug || '';

  log(`📨 ${req.method} ${route}`);

  // Route handling
  if (route === 'autenticacao/entrar') {
    return handleLogin(req, res);
  }

  if (route === 'autenticacao/registrar') {
    return handleRegister(req, res);
  }

  if (route === 'autenticacao/eu') {
    return handleMe(req, res);
  }

  // Health check
  if (route === 'health') {
    try {
      const prisma = getPrisma();
      await prisma.$queryRaw`SELECT 1`;
      return res.status(200).json({ status: 'OK', database: 'connected' });
    } catch (error) {
      return res.status(500).json({ status: 'ERROR', database: 'disconnected' });
    }
  }

  return res.status(404).json({ erro: 'Rota não encontrada', route });
}
