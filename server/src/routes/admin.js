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
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.status(400).json({ erro: 'Preencha usuário e senha' });
  if (usuario !== process.env.ADMIN_USER) return res.status(401).json({ erro: 'Credenciais inválidas' });

  const senhaValida = await bcrypt.compare(senha, process.env.ADMIN_PASS_HASH);
  if (!senhaValida) return res.status(401).json({ erro: 'Credenciais inválidas' });

  const token = jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '8h' });

  const prod = process.env.NODE_ENV === 'production';
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure:   prod,
    sameSite: prod ? 'None' : 'Strict', // None obrigatório para cross-domain (Vercel → Railway)
    maxAge:   8 * 60 * 60 * 1000,
    path:     '/api/admin',
  });

  res.json({ mensagem: 'Login realizado com sucesso' });
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', { path: '/api/admin' });
  res.json({ mensagem: 'Logout realizado' });
});

// ── Verificar sessão ──────────────────────────────────────────────────────────

router.get('/me', auth, (req, res) => {
  res.json({ usuario: req.admin.usuario });
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
        cpf:       cpfUtil.mask(cpfUtil.decrypt(r.cpf_enc, r.cpf_iv, r.cpf_tag)),
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
