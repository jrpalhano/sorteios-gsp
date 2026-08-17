CREATE DATABASE IF NOT EXISTS sorteio_kit_verao
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sorteio_kit_verao;

CREATE TABLE IF NOT EXISTS lojas (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  slug      VARCHAR(50)  NOT NULL UNIQUE,
  nome      VARCHAR(100) NOT NULL,
  ativo     TINYINT(1)   DEFAULT 1,
  criado_em DATETIME     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inscricoes (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  loja_id              INT          NOT NULL,
  nome                 VARCHAR(150) NOT NULL,
  telefone             VARCHAR(20)  NOT NULL,
  cpf_enc              TEXT         NOT NULL,   -- CPF criptografado AES-256-GCM
  cpf_iv               VARCHAR(24)  NOT NULL,   -- IV em hex (12 bytes)
  cpf_tag              VARCHAR(32)  NOT NULL,   -- auth tag em hex (16 bytes)
  numero_cupom         VARCHAR(50)  NOT NULL UNIQUE,
  data_cupom           DATE         NOT NULL,
  comprou_influencer   TINYINT(1)   NOT NULL DEFAULT 0,
  influencer_nome      VARCHAR(100) DEFAULT NULL,
  lgpd_aceite          TINYINT(1)   NOT NULL DEFAULT 0,
  lgpd_aceite_em       DATETIME     DEFAULT NULL,
  recaptcha_score      DECIMAL(3,2) DEFAULT NULL,
  ip_origem            VARCHAR(45)  DEFAULT NULL,
  criado_em            DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loja_id) REFERENCES lojas(id)
);

CREATE INDEX IF NOT EXISTS idx_loja       ON inscricoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_criado_em  ON inscricoes(criado_em);
CREATE INDEX IF NOT EXISTS idx_cupom      ON inscricoes(numero_cupom);
CREATE INDEX IF NOT EXISTS idx_telefone   ON inscricoes(telefone);

-- Seed das lojas
INSERT IGNORE INTO lojas (slug, nome) VALUES
  ('piquia', 'Loja PIQUIA'),
  ('centro', 'Loja CENTRO');
