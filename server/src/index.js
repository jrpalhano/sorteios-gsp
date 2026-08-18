require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const path         = require('path');

const inscricoesRouter = require('./routes/inscricoes');
const adminRouter      = require('./routes/admin');
const lojasRouter      = require('./routes/lojas');
const consultaRouter   = require('./routes/consulta');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Segurança: headers HTTP ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", 'https://www.google.com', 'https://www.gstatic.com'],
      frameSrc:   ["'self'", 'https://www.google.com'],
      imgSrc:     ["'self'", 'data:'],
      styleSrc:   ["'self'", "'unsafe-inline'"],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://sorteios.gruposuperpopular.com.br',
  'https://sorteios-gsp.vercel.app',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS bloqueado: ' + origin));
  },
  credentials: true,
}));

// ── Parsers ───────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Arquivos estáticos (HTML, imagens) ───────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../frontend')));

// ── Config pública (chaves seguras para o frontend) ───────────────────────────
app.get('/api/config', (req, res) => {
  res.json({ recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || null });
});

// ── Rota por loja — serve o formulário com slug na URL ────────────────────────
app.get('/loja/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/wireframe.html'));
});

// ── Painel admin ──────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/admin.html'));
});

// ── Rotas da API ──────────────────────────────────────────────────────────────
app.use('/api/inscricoes', inscricoesRouter);
app.use('/api/admin',      adminRouter);
app.use('/api/lojas',      lojasRouter);
app.use('/api/consulta',   consultaRouter);

// ── 404 para rotas desconhecidas da API ───────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// ── Iniciar servidor ──────────────────────────────────────────────────────────
const db = require('./db/connection');

app.listen(PORT, async () => {
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│     Sorteio Kit Verão — API Server      │');
  console.log('└─────────────────────────────────────────┘');
  console.log(`  Ambiente : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Endereço : http://localhost:${PORT}`);

  try {
    await db.query('SELECT 1');
    console.log('  Banco    : ✔ PostgreSQL conectado');
  } catch (err) {
    console.error('  Banco    : ✘ Falha na conexão —', err.message);
  }

  console.log('');
});
