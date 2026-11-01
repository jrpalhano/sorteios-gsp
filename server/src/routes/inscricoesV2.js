const express   = require('express');
const router    = express.Router();
const { body, validationResult } = require('express-validator');
const db        = require('../db/connection');
const cpfUtil   = require('../utils/cpf');
const recaptcha = require('../utils/recaptcha');
const { inscricaoLimiter } = require('../middleware/rateLimiter');

// Valida dígito verificador da chave NF-e/NFC-e/CF-e pelo algoritmo Módulo 11 da SEFAZ
function validarChaveNF(chave) {
  if (!/^\d{44}$/.test(chave)) return false;
  const digits = chave.split('').map(Number);
  let peso = 2, soma = 0;
  for (let i = 42; i >= 0; i--) {
    soma += digits[i] * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto    = soma % 11;
  const esperado = resto < 2 ? 0 : 11 - resto;
  return digits[43] === esperado;
}

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
  // chave_nf: formato validado aqui apenas se vier no body
  // a obrigatoriedade é checada no handler após consultar o banco
  body('chave_nf')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{44}$/).withMessage('Chave da nota fiscal inválida — deve conter 44 dígitos'),
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
    chave_nf: chave_nf_raw,
  } = req.body;

  const chave_nf = chave_nf_raw?.trim() || null;

  const { valido, score } = await recaptcha.validate(recaptcha_token);
  if (!valido) {
    return res.status(400).json({ erro: 'Verificação de segurança falhou. Tente novamente.' });
  }

  try {
    // Valida promoção (ativa e dentro da vigência) — inclui exige_chave_nf como fonte de verdade
    const hoje = new Date().toISOString().split('T')[0];
    const { rows: promos } = await db.query(
      `SELECT id, exige_chave_nf FROM promocoes
       WHERE id = $1 AND ativo = true
         AND vigencia_inicio <= $2 AND vigencia_fim >= $2`,
      [promocao_id, hoje]
    );
    if (!promos.length) return res.status(400).json({ erro: 'Promoção inválida ou encerrada' });

    const { exige_chave_nf } = promos[0];

    // Valida chave_nf com base na regra do banco — frontend não é fonte de verdade
    if (exige_chave_nf) {
      if (!chave_nf) {
        return res.status(400).json({ erro: 'A chave da nota fiscal é obrigatória para esta promoção.' });
      }
      if (!validarChaveNF(chave_nf)) {
        return res.status(400).json({ erro: 'Chave da nota fiscal inválida. Verifique o QR code e tente novamente.' });
      }
    }

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

    // Chave NF única globalmente (quando informada)
    if (chave_nf) {
      const { rows: chaveExistente } = await db.query(
        'SELECT id FROM inscricoes_v2 WHERE chave_nf = $1',
        [chave_nf]
      );
      if (chaveExistente.length) {
        return res.status(409).json({ erro: 'Esta nota fiscal já foi utilizada em outra inscrição.' });
      }
    }

    const { cpf_enc, cpf_iv, cpf_tag } = cpfUtil.encrypt(cpf);

    await db.query(
      `INSERT INTO inscricoes_v2
         (promocao_id, loja_id, nome, telefone, cpf_enc, cpf_iv, cpf_tag,
          numero_cupom, data_cupom, comprou_influencer, influencer_nome,
          lgpd_aceite, lgpd_aceite_em, recaptcha_score, ip_origem, chave_nf)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,NOW(),$12,$13,$14)`,
      [
        promocao_id, loja_id, nome, telefone,
        cpf_enc, cpf_iv, cpf_tag,
        numero_cupom, data_cupom,
        comprou_influencer === 'true',
        comprou_influencer === 'true' ? (influencer_nome || null) : null,
        score, req.ip,
        chave_nf,
      ]
    );

    res.status(201).json({ mensagem: 'Inscrição realizada com sucesso!' });
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint === 'idx_inscricoes_v2_chave_nf') {
        return res.status(409).json({ erro: 'Esta nota fiscal já foi utilizada em outra inscrição.' });
      }
      return res.status(409).json({ erro: 'Este cupom já foi cadastrado nesta promoção.' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
  }
});

module.exports = router;
