-- ============================================================
-- Migration 001 — Chave NF e feature flag por promoção
-- Data: 2026-10-31
-- Banco: PostgreSQL (inscricoes_v2 + promocoes)
-- Execução: psql $DATABASE_URL -f migration_001_chave_nf.sql
-- Rollback:  ver seção DOWN no final deste arquivo
-- ============================================================

-- ── UP ────────────────────────────────────────────────────────────────────────

-- 1. Flag por promoção: controla se o scanner de QR é exibido e obrigatório
ALTER TABLE promocoes
  ADD COLUMN IF NOT EXISTS exige_chave_nf BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN promocoes.exige_chave_nf IS
  'Quando true, o formulário de inscrição exige leitura do QR code da nota fiscal (chave de 44 dígitos). Validado no backend — não confiar no frontend.';

-- 2. Campo para armazenar a chave de acesso da NF (44 dígitos)
ALTER TABLE inscricoes_v2
  ADD COLUMN IF NOT EXISTS chave_nf VARCHAR(44) DEFAULT NULL;

COMMENT ON COLUMN inscricoes_v2.chave_nf IS
  'Chave de acesso da NF-e/NFC-e/CF-e (44 dígitos). Extraída do QR code no ato do cadastro. NULL quando promoção não exige ou usuário usou fallback manual.';

-- 3. Índice único parcial — garante unicidade apenas onde chave_nf foi informada
--    Índice parcial evita conflito ao inserir múltiplos NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_inscricoes_v2_chave_nf
  ON inscricoes_v2(chave_nf)
  WHERE chave_nf IS NOT NULL;

-- ── Verificação pós-execução ──────────────────────────────────────────────────
-- Execute para confirmar que as colunas foram criadas:
--
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('promocoes', 'inscricoes_v2')
--   AND column_name IN ('exige_chave_nf', 'chave_nf')
-- ORDER BY table_name, column_name;
--
-- Resultado esperado:
--   inscricoes_v2 | chave_nf       | character varying | YES | null
--   promocoes     | exige_chave_nf | boolean           | NO  | false

-- ── DOWN (rollback) ───────────────────────────────────────────────────────────
-- ATENÇÃO: apaga dados de chave_nf já salvos.
-- Só executar em caso de rollback necessário.
--
-- DROP INDEX IF EXISTS idx_inscricoes_v2_chave_nf;
-- ALTER TABLE inscricoes_v2 DROP COLUMN IF EXISTS chave_nf;
-- ALTER TABLE promocoes     DROP COLUMN IF EXISTS exige_chave_nf;
