const express   = require('express');
const router    = express.Router();
const { body, validationResult } = require('express-validator');
const db        = require('../db/connection');
const cpfUtil   = require('../utils/cpf');
const recaptcha = require('../utils/recaptcha');
const { inscricaoLimiter } = require('../middleware/rateLimiter');

const validacoes = [
  body('nome').trim().escape().isLength({ min: 3 }).withMessage('Nome deve ter ao menos 3 caracteres'),
  body('telefone').trim().matches(/^\(\d{2}\) \d{4,5}-\d{4}$/).withMessage('Telefone inválido'),
  body('cpf').trim().matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/).withMessage('CPF inválido'),
  body('numero_cupom').trim().isNumeric().isLength({ min: 1 }).withMessage('Número do cupom inválido'),
  body('data_cupom').isDate({ format: 'YYYY-MM-DD' }).withMessage('Data inválida'),
  body('comprou_influencer').isIn(['true', 'false']).withMessage('Campo inválido'),
  body('influencer_nome')
    .if(body('comprou_influencer').equals('true'))
    .trim().escape().isLength({ min: 2 }).withMessage('Informe o nome da influenciadora'),
  body('promocao_id').isInt({ min: 1 }).withMessage('Promoção inválida'),
  body('lgpd_aceite').equals('true').withMessage('É necessário aceitar os termos da LGPD'),
];

router.post('/', inscricaoLimiter, validacoes, async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erros: erros.array().map(e => e.msg) });
  }

  const {
    nome, telefone, cpf, numero_cupom, data_cupom,
    comprou_influencer, influencer_nome,
    loja_slug, promocao_id, recaptcha_token,
  } = req.body;

  const { valido, score } = await recaptcha.validate(recaptcha_token);
  if (!valido) {
    return res.status(400).json({ erro: 'Verificação de segurança falhou. Tente novamente.' });
  }

  try {
    // Valida promoção (ativa e dentro da vigência)
    const hoje = new Date().toISOString().split('T')[0];
    const { rows: promos } = await db.query(
      `SELECT id FROM promocoes
       WHERE id = $1 AND ativo = true
         AND vigencia_inicio <= $2 AND vigencia_fim >= $2`,
      [promocao_id, hoje]
    );
    if (!promos.length) return res.status(400).json({ erro: 'Promoção inválida ou encerrada' });

    // Resolve loja: busca lojas associadas à promoção
    const { rows: lojasPromo } = await db.query(
      `SELECT l.id, l.slug FROM lojas l
       JOIN promocao_lojas pl ON pl.loja_id = l.id
       WHERE pl.promocao_id = $1 AND l.ativo = true`,
      [promocao_id]
    );

    let loja_id = null;

    if (lojasPromo.length > 0) {
      // Promoção tem lojas: loja_slug é obrigatório e deve ser uma das lojas da promoção
      if (!loja_slug) {
        return res.status(400).json({ erro: 'Selecione a loja onde realizou a compra' });
      }
      const lojaEncontrada = lojasPromo.find(l => l.slug === loja_slug);
      if (!lojaEncontrada) {
        return res.status(400).json({ erro: 'Loja inválida para esta promoção' });
      }
      loja_id = lojaEncontrada.id;
    }

    // Cupom único por promoção
    const { rows: existente } = await db.query(
      'SELECT id FROM inscricoes_v2 WHERE numero_cupom = $1 AND promocao_id = $2',
      [numero_cupom, promocao_id]
    );
    if (existente.length) {
      return res.status(409).json({ erro: 'Este cupom já foi cadastrado nesta promoção.' });
    }

    const { cpf_enc, cpf_iv, cpf_tag } = cpfUtil.encrypt(cpf);

    await db.query(
      `INSERT INTO inscricoes_v2
         (promocao_id, loja_id, nome, telefone, cpf_enc, cpf_iv, cpf_tag,
          numero_cupom, data_cupom, comprou_influencer, influencer_nome,
          lgpd_aceite, lgpd_aceite_em, recaptcha_score, ip_origem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,NOW(),$12,$13)`,
      [
        promocao_id, loja_id, nome, telefone,
        cpf_enc, cpf_iv, cpf_tag,
        numero_cupom, data_cupom,
        comprou_influencer === 'true',
        comprou_influencer === 'true' ? (influencer_nome || null) : null,
        score, req.ip,
      ]
    );

    res.status(201).json({ mensagem: 'Inscrição realizada com sucesso!' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Este cupom já foi cadastrado nesta promoção.' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
  }
});

module.exports = router;
