
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { manipuladorErro } from './middleware/manipuladorErro.js';
import rotasAutenticacao from './rotas/autenticacao.js';
import rotasPessoas from './rotas/pessoas.js';

dotenv.config();

const app = express();
const PORTA = process.env.PORT || 3001;

app.use(helmet());

const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limitador);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/autenticacao', rotasAutenticacao);
app.use('/api/pessoas', rotasPessoas);

app.get('/api/saude', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(manipuladorErro);

app.listen(PORTA, () => {
  console.log(`🚀 Servidor GAC iniciado na porta ${PORTA}`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV}`);
});
