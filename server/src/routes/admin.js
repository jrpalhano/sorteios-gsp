const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const ExcelJS  = require('exceljs');
const db       = require('../db/connection');
const auth     = require('../middleware/auth');
const cpfUtil  = require('../utils/cpf');
const { loginLimiter } = require('../middleware/rateLimiter');

// ── Login ─────────────────────────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Preencha e-mail e senha' });

  try {
    const { rows } = await db.query(
      'SELECT id, nome, nome_completo, email, senha_hash, ativo FROM administradores WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Mesma mensagem para email inexistente e senha errada — evita enumeração
    const admin = rows[0];
    const senhaValida = admin ? await bcrypt.compare(senha, admin.senha_hash) : false;

    if (!admin || !senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    if (!admin.ativo) {
      return res.status(403).json({ erro: 'Conta desativada. Entre em contato com o responsável.' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, nome: admin.nome },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const prod = process.env.NODE_ENV === 'production';
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure:   prod,
      sameSite: prod ? 'None' : 'Strict',
      maxAge:   8 * 60 * 60 * 1000,
      path:     '/api/admin',
    });

    res.json({ mensagem: 'Login realizado com sucesso', nome: admin.nome });
  } catch {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', { path: '/api/admin' });
  res.json({ mensagem: 'Logout realizado' });
});

// ── Sessão atual ──────────────────────────────────────────────────────────────

router.get('/me', auth, (req, res) => {
  const { id, nome, nome_completo, email } = req.admin;
  res.json({ id, nome, nome_completo, email });
});

// ── Cadastro de novo admin (protegido) ────────────────────────────────────────

router.post('/admins', auth, async (req, res) => {
  const { nome, nome_completo, email, senha } = req.body;

  if (!nome || !nome_completo || !email || !senha) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
  }
  if (senha.length < 8) {
    return res.status(400).json({ erro: 'A senha deve ter no mínimo 8 caracteres' });
  }

  try {
    const emailNorm  = email.toLowerCase().trim();
    const senha_hash = await bcrypt.hash(senha, 12);

    await db.query(
      `INSERT INTO administradores (nome, nome_completo, email, senha_hash)
       VALUES ($1, $2, $3, $4)`,
      [nome.trim(), nome_completo.trim(), emailNorm, senha_hash]
    );

    res.status(201).json({ mensagem: 'Administrador cadastrado com sucesso' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado' });
    }
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Listar admins ─────────────────────────────────────────────────────────────

router.get('/admins', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, nome_completo, email, ativo, criado_em FROM administradores ORDER BY criado_em ASC'
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Ativar / desativar admin ──────────────────────────────────────────────────

router.patch('/admins/:id/ativo', auth, async (req, res) => {
  const alvoId = Number(req.params.id);

  if (alvoId === req.admin.id) {
    return res.status(400).json({ erro: 'Você não pode desativar sua própria conta' });
  }

  const { ativo } = req.body;
  if (typeof ativo !== 'boolean') {
    return res.status(400).json({ erro: 'Campo ativo deve ser true ou false' });
  }

  try {
    const { rowCount } = await db.query(
      'UPDATE administradores SET ativo = $1 WHERE id = $2',
      [ativo, alvoId]
    );
    if (rowCount === 0) return res.status(404).json({ erro: 'Admin não encontrado' });
    res.json({ mensagem: `Conta ${ativo ? 'ativada' : 'desativada'} com sucesso` });
  } catch {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Stats por loja ────────────────────────────────────────────────────────────

router.get('/stats', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.nome, l.slug, COUNT(i.id)::int AS total
      FROM lojas l
      LEFT JOIN inscricoes i ON i.loja_id = l.id
      GROUP BY l.id, l.nome, l.slug
      ORDER BY l.nome
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Listagem de inscrições ────────────────────────────────────────────────────

router.get('/inscricoes', auth, async (req, res) => {
  const { loja_id, busca, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const params = [];
  const where  = [];

  if (loja_id) { params.push(Number(loja_id)); where.push(`i.loja_id = $${params.length}`); }
  if (busca)   { params.push(`%${busca}%`);    where.push(`(i.nome ILIKE $${params.length} OR i.telefone ILIKE $${params.length} OR i.numero_cupom ILIKE $${params.length})`); }

  const clausula = where.length ? `WHERE ${where.join(' AND ')}` : '';

  params.push(Number(limit));
  params.push(offset);

  try {
    const { rows } = await db.query(`
      SELECT i.id, l.nome AS loja, i.nome, i.telefone,
             i.cpf_enc, i.cpf_iv, i.cpf_tag,
             i.numero_cupom, i.data_cupom,
             i.comprou_influencer, i.influencer_nome, i.criado_em
      FROM inscricoes i
      JOIN lojas l ON l.id = i.loja_id
      ${clausula}
      ORDER BY i.criado_em DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*)::int AS total FROM inscricoes i ${clausula}`,
      params.slice(0, params.length - 2)
    );

    const resultado = rows.map(r => ({
      id:                 r.id,
      loja:               r.loja,
      nome:               r.nome,
      telefone:           r.telefone,
      cpf:                cpfUtil.mask(cpfUtil.decrypt(r.cpf_enc, r.cpf_iv, r.cpf_tag)),
      numero_cupom:       r.numero_cupom,
      data_cupom:         r.data_cupom,
      comprou_influencer: r.comprou_influencer,
      influencer_nome:    r.influencer_nome,
      criado_em:          r.criado_em,
    }));

    res.json({ data: resultado, total: countRows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── Exportação Excel ──────────────────────────────────────────────────────────

router.get('/export', auth, async (req, res) => {
  const { loja_id } = req.query;
  const params = [];
  let clausula = '';
  if (loja_id) { params.push(Number(loja_id)); clausula = 'WHERE i.loja_id = $1'; }

  try {
    const { rows } = await db.query(`
      SELECT i.id, l.nome AS loja, i.nome, i.telefone,
             i.cpf_enc, i.cpf_iv, i.cpf_tag,
             i.numero_cupom, i.data_cupom,
             i.comprou_influencer, i.influencer_nome, i.criado_em
      FROM inscricoes i JOIN lojas l ON l.id = i.loja_id
      ${clausula}
      ORDER BY i.criado_em DESC
    `, params);

    const workbook = new ExcelJS.Workbook();
    const sheet    = workbook.addWorksheet('Inscrições');

    sheet.columns = [
      { header: 'ID',          key: 'id',              width: 8  },
      { header: 'Loja',        key: 'loja',            width: 15 },
      { header: 'Nome',        key: 'nome',            width: 30 },
      { header: 'Telefone',    key: 'telefone',        width: 18 },
      { header: 'CPF',         key: 'cpf',             width: 18 },
      { header: 'Cupom',       key: 'numero_cupom',    width: 15 },
      { header: 'Data Cupom',  key: 'data_cupom',      width: 14 },
      { header: 'Influencer',  key: 'influencer_nome', width: 25 },
      { header: 'Cadastrado',  key: 'criado_em',       width: 22 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003D90' } };

    rows.forEach(r => {
      sheet.addRow({
        ...r,
        cpf:        cpfUtil.mask(cpfUtil.decrypt(r.cpf_enc, r.cpf_iv, r.cpf_tag)),
        data_cupom: new Date(r.data_cupom).toLocaleDateString('pt-BR'),
        criado_em:  new Date(r.criado_em).toLocaleString('pt-BR'),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="inscricoes.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar exportação' });
  }
});

module.exports = router;
