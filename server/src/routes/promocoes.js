const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const db       = require('../db/connection');
const auth     = require('../middleware/auth');
const upload   = require('../middleware/upload');

// ── GET público: dados completos de uma promoção pelo slug ────────────────────

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const { rows } = await db.query(
      `SELECT id, slug, titulo, selo_url, imagem_produtos_url,
              vigencia_inicio, vigencia_fim, ativo
       FROM promocoes WHERE slug = $1`,
      [slug]
    );

    if (!rows.length) {
      return res.status(404).json({ erro: 'Promoção não encontrada', codigo: 'NAO_ENCONTRADA' });
    }

    const promo = rows[0];
    const hoje  = new Date().toISOString().split('T')[0];

    if (promo.vigencia_fim < hoje) {
      return res.status(410).json({ erro: 'Promoção encerrada', codigo: 'ENCERRADA' });
    }

    const { rows: produtos } = await db.query(
      'SELECT nome FROM promocao_produtos WHERE promocao_id = $1 ORDER BY ordem ASC',
      [promo.id]
    );

    const { rows: regras } = await db.query(
      'SELECT texto FROM promocao_regras WHERE promocao_id = $1 ORDER BY ordem ASC',
      [promo.id]
    );

    res.json({
      ...promo,
      produtos: produtos.map(p => p.nome),
      regras:   regras.map(r => r.texto),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno', codigo: 'ERRO' });
  }
});

// ── GET admin: lista todas as promoções ───────────────────────────────────────

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, slug, titulo, vigencia_inicio, vigencia_fim, ativo, criado_em
       FROM promocoes ORDER BY criado_em DESC`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── POST admin: criar promoção ────────────────────────────────────────────────

router.post('/', auth, async (req, res) => {
  const { titulo, slug, vigencia_inicio, vigencia_fim, produtos = [], regras = [] } = req.body;

  if (!titulo || !slug || !vigencia_inicio || !vigencia_fim) {
    return res.status(400).json({ erro: 'Título, slug e vigência são obrigatórios' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO promocoes (titulo, slug, vigencia_inicio, vigencia_fim)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [titulo.trim(), slug.trim().toLowerCase(), vigencia_inicio, vigencia_fim]
    );

    const id = rows[0].id;

    if (produtos.length) {
      const prodValues = produtos.map((nome, i) => `($1, $${i + 2}, ${i})`).join(', ');
      await db.query(
        `INSERT INTO promocao_produtos (promocao_id, nome, ordem) VALUES ${produtos.map((_, i) => `($1, $${i + 2}, ${i})`).join(', ')}`,
        [id, ...produtos]
      );
    }

    if (regras.length) {
      await db.query(
        `INSERT INTO promocao_regras (promocao_id, texto, ordem) VALUES ${regras.map((_, i) => `($1, $${i + 2}, ${i})`).join(', ')}`,
        [id, ...regras]
      );
    }

    res.status(201).json({ mensagem: 'Promoção criada com sucesso', id });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Este slug já está em uso' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── PUT admin: editar promoção ────────────────────────────────────────────────

router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { titulo, slug, vigencia_inicio, vigencia_fim, ativo, produtos = [], regras = [] } = req.body;

  if (!titulo || !slug || !vigencia_inicio || !vigencia_fim) {
    return res.status(400).json({ erro: 'Título, slug e vigência são obrigatórios' });
  }

  try {
    const { rowCount } = await db.query(
      `UPDATE promocoes SET titulo=$1, slug=$2, vigencia_inicio=$3, vigencia_fim=$4, ativo=$5
       WHERE id=$6`,
      [titulo.trim(), slug.trim().toLowerCase(), vigencia_inicio, vigencia_fim, ativo ?? true, id]
    );

    if (!rowCount) return res.status(404).json({ erro: 'Promoção não encontrada' });

    // Substitui produtos e regras (DELETE + INSERT — seguro pois são dados da promoção)
    await db.query('DELETE FROM promocao_produtos WHERE promocao_id = $1', [id]);
    await db.query('DELETE FROM promocao_regras   WHERE promocao_id = $1', [id]);

    if (produtos.length) {
      await db.query(
        `INSERT INTO promocao_produtos (promocao_id, nome, ordem) VALUES ${produtos.map((_, i) => `($1, $${i + 2}, ${i})`).join(', ')}`,
        [id, ...produtos]
      );
    }

    if (regras.length) {
      await db.query(
        `INSERT INTO promocao_regras (promocao_id, texto, ordem) VALUES ${regras.map((_, i) => `($1, $${i + 2}, ${i})`).join(', ')}`,
        [id, ...regras]
      );
    }

    res.json({ mensagem: 'Promoção atualizada com sucesso' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Este slug já está em uso' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── POST admin: upload do selo ────────────────────────────────────────────────

router.post('/:id/selo', auth, upload.single('imagem'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada' });

  const url = `/uploads/promocoes/${req.file.filename}`;

  try {
    const { rows } = await db.query(
      'UPDATE promocoes SET selo_url = $1 WHERE id = $2 RETURNING selo_url',
      [url, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Promoção não encontrada' });
    res.json({ url });
  } catch {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── POST admin: upload da imagem de produtos ──────────────────────────────────

router.post('/:id/imagem-produtos', auth, upload.single('imagem'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada' });

  const url = `/uploads/promocoes/${req.file.filename}`;

  try {
    const { rows } = await db.query(
      'UPDATE promocoes SET imagem_produtos_url = $1 WHERE id = $2 RETURNING imagem_produtos_url',
      [url, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Promoção não encontrada' });
    res.json({ url });
  } catch {
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── GET admin: inscrições de uma promoção ─────────────────────────────────────

router.get('/:id/inscricoes', auth, async (req, res) => {
  const { page = 1, limit = 50, loja_id, busca, data_inicio, data_fim } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const params = [Number(req.params.id)];
  const where  = ['i.promocao_id = $1'];

  if (loja_id)    { params.push(Number(loja_id));  where.push(`i.loja_id = $${params.length}`); }
  if (data_inicio){ params.push(data_inicio);       where.push(`i.criado_em::date >= $${params.length}`); }
  if (data_fim)   { params.push(data_fim);          where.push(`i.criado_em::date <= $${params.length}`); }
  if (busca)      { params.push(`%${busca}%`);      where.push(`(i.nome ILIKE $${params.length} OR i.telefone ILIKE $${params.length} OR i.numero_cupom ILIKE $${params.length})`); }

  const clausula = `WHERE ${where.join(' AND ')}`;
  params.push(Number(limit), offset);

  try {
    const { rows } = await db.query(`
      SELECT i.id, l.nome AS loja, i.nome, i.telefone,
             i.numero_cupom, i.data_cupom,
             i.comprou_influencer, i.influencer_nome, i.criado_em
      FROM inscricoes_v2 i JOIN lojas l ON l.id = i.loja_id
      ${clausula}
      ORDER BY i.criado_em DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*)::int AS total FROM inscricoes_v2 i ${clausula}`,
      params.slice(0, params.length - 2)
    );

    res.json({ data: rows, total: countRows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
