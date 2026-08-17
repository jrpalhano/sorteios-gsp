# Sorteio Kit Verão — Decisões de Arquitetura

> Documento de referência para implementação. Todas as decisões foram validadas antes de escrever código.

---

## 1. Visão Geral

Sistema de inscrição para sorteio "Kit Verão" do Supermercados Popular.
Participantes se inscrevem via formulário web, cada loja tem seu próprio link/QR Code.
Administradores visualizam e exportam cadastros por loja via painel protegido.

---

## 2. Stack Tecnológica

| Camada      | Tecnologia          | Justificativa                                      |
|-------------|---------------------|----------------------------------------------------|
| Frontend    | React + Vite        | Build rápido, componentes reutilizáveis            |
| Backend     | Node.js + Express   | Mesmo ecossistema JS, API REST simples             |
| Banco       | MySQL               | Infraestrutura já existente no servidor            |
| Segurança   | reCAPTCHA v3        | Invisível ao usuário, pontuação de risco           |
| Hospedagem  | Servidor existente  | Sem custo adicional, controle total                |

---

## 3. Formulário de Inscrição — Campos

| Campo               | Tipo        | Obrigatório | Validação                                      |
|---------------------|-------------|-------------|------------------------------------------------|
| Nome completo       | texto       | Sim         | Mínimo 3 chars, apenas letras/espaços          |
| Telefone            | texto       | Sim         | Formato BR: (XX) XXXXX-XXXX                    |
| CPF                 | texto       | Sim         | Formato: 000.000.000-00                        |
| Número do cupom     | texto       | Sim         | Só números, mínimo 1 dígito                    |
| Data do cupom       | data        | Sim         | Formato date (dd/mm/aaaa)                      |
| Comprou por influencer? | radio   | Sim         | Sim / Não                                      |
| Nome do influencer  | texto       | Condicional | Obrigatório se respondeu Sim acima             |
| Loja                | hidden      | Sim         | Preenchido automaticamente via slug da URL     |
| reCAPTCHA token     | hidden      | Sim         | Gerado pelo reCAPTCHA v3, validado no backend  |

---

## 4. Identificação de Loja — Link/QR Code por Loja

**Decisão:** Cada loja recebe um link único. A loja é identificada por um slug na URL.  
O cliente **não vê nem escolhe** a loja — é preenchida automaticamente.

**Formato da URL:**
```
https://<dominio-a-definir>/loja/piquia
https://<dominio-a-definir>/loja/centro
```

**Lojas participantes:**

| Slug    | Nome Exibido          |
|---------|-----------------------|
| piquia  | Loja PIQUIA           |
| centro  | Loja Centro           |

> Se acessarem a URL raiz sem slug, exibir aviso: "Use o link da sua loja".

---

## 5. Banco de Dados — Esquema MySQL

### Tabela `lojas`
```sql
CREATE TABLE lojas (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  slug       VARCHAR(50) NOT NULL UNIQUE,  -- usado na URL
  nome       VARCHAR(100) NOT NULL,
  ativo      TINYINT(1) DEFAULT 1,
  criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela `inscricoes`
```sql
CREATE TABLE inscricoes (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  loja_id           INT NOT NULL,
  nome              VARCHAR(150) NOT NULL,
  telefone          VARCHAR(20) NOT NULL,
  numero_cupom      VARCHAR(50) NOT NULL UNIQUE,  -- cupom é único globalmente
  comprou_influencer TINYINT(1) NOT NULL DEFAULT 0,
  influencer_nome   VARCHAR(100) DEFAULT NULL,
  recaptcha_score   DECIMAL(3,2) DEFAULT NULL,  -- score do reCAPTCHA v3 (0.0 a 1.0)
  ip_origem         VARCHAR(45) DEFAULT NULL,   -- IPv4 ou IPv6
  criado_em         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loja_id) REFERENCES lojas(id)
);
```

**Índices:**
```sql
CREATE INDEX idx_loja ON inscricoes(loja_id);
CREATE INDEX idx_criado_em ON inscricoes(criado_em);
CREATE INDEX idx_cupom ON inscricoes(numero_cupom);
```

---

## 6. Segurança da API

A proteção é feita em **camadas** — cada uma cobre o que a anterior não alcança.

---

### Camada 1 — Transporte (HTTPS + Headers)

**Helmet.js** aplicado globalmente no Express logo na primeira linha do servidor:

| Header configurado         | O que protege                                              |
|----------------------------|------------------------------------------------------------|
| `Content-Security-Policy`  | Bloqueia scripts/recursos de origens não autorizadas (XSS) |
| `X-Frame-Options: DENY`    | Impede que a página seja embutida em iframe (clickjacking)  |
| `Strict-Transport-Security`| Força HTTPS em visitas futuras (HSTS)                      |
| `X-Content-Type-Options`   | Impede sniffing de MIME type                               |
| `Referrer-Policy`          | Não vaza a URL de origem em requisições externas           |

**CORS** restrito: só o domínio próprio pode chamar a API. Qualquer outra origem recebe erro 403.

---

### Camada 2 — Autenticação do Admin (Cookie HttpOnly)

**Decisão:** sessão do admin usa **JWT dentro de um cookie HttpOnly** — não localStorage.

| Atributo do cookie | Valor          | Por quê                                                        |
|--------------------|----------------|----------------------------------------------------------------|
| `HttpOnly`         | true           | JavaScript **nunca** consegue ler o token — bloqueia XSS      |
| `Secure`           | true           | Cookie só trafega em HTTPS — nunca em HTTP puro               |
| `SameSite`         | `Strict`       | Cookie não é enviado em requisições cross-site — bloqueia CSRF |
| `MaxAge`           | 8h             | Sessão expira automaticamente                                  |
| `Path`             | `/api/admin`   | Cookie só é enviado para rotas admin                           |

Fluxo de login:
```
POST /api/admin/login  →  valida user+pass  →  gera JWT  →  seta cookie HttpOnly
GET  /api/admin/*      →  middleware lê cookie  →  verifica JWT  →  libera ou 401
POST /api/admin/logout →  limpa o cookie (MaxAge=0)
```

> Sem `Authorization: Bearer` no header — o cookie é enviado automaticamente pelo browser, e como é HttpOnly, nenhum script consegue roubá-lo.

---

### Camada 3 — Validação de Entrada

Toda entrada do usuário passa por **`express-validator`** antes de tocar o banco:

| Campo             | Regras                                                          |
|-------------------|-----------------------------------------------------------------|
| nome              | `trim`, `escape`, mínimo 3 chars, apenas letras e espaços      |
| telefone          | `trim`, formato `(XX) XXXXX-XXXX` via regex                    |
| numero_cupom      | `trim`, apenas dígitos, mínimo 1 char                          |
| comprou_influencer| `isBoolean`                                                     |
| influencer_nome   | `trim`, `escape`, obrigatório se `comprou_influencer = true`   |
| slug da loja      | validado contra lista fixa de slugs permitidos (`piquia`, `centro`) |

Se qualquer validação falhar → resposta `400 Bad Request` com lista de erros, **sem tocar o banco**.

---

### Camada 4 — Banco de Dados (SQL Injection)

- Todas as queries usam **prepared statements** via `mysql2` com `?` placeholders — valores nunca interpolados na string SQL
- Usuário do banco tem permissão apenas de `SELECT`, `INSERT` na tabela `inscricoes` e `SELECT` em `lojas` — sem `DROP`, `ALTER`, `DELETE`
- Senha do banco em `.env`, nunca no código

---

### Camada 5 — Anti-bot (reCAPTCHA v3)

- Frontend executa `grecaptcha.execute(SITE_KEY, {action: 'inscricao'})` ao submeter
- Token enviado junto com o formulário no `POST /api/inscricoes`
- Backend valida o token na API do Google **antes** de qualquer outra operação
- Score mínimo aceito: **0.5** (0 = bot, 1 = humano)
- Se score < 0.5 → resposta `400` genérica (sem revelar o motivo ao bot)

---

### Camada 6 — Rate Limiting

```
POST /api/inscricoes  →  máx 5 requisições / 10 min por IP
POST /api/admin/login →  máx 10 tentativas / 15 min por IP  (brute force)
GET  /api/admin/*     →  sem limite (já protegido por cookie)
```

Resposta ao exceder: `429 Too Many Requests`.

---

### Camada 7 — Integridade dos Dados

| Regra                  | Onde é garantida              |
|------------------------|-------------------------------|
| Cupom único global     | `UNIQUE` na coluna do banco + verificação no backend com mensagem amigável |
| Loja válida            | Validada via lista fixa no backend antes do INSERT |
| IP registrado          | Coluna `ip_origem` para auditoria posterior |
| Score reCAPTCHA salvo  | Coluna `recaptcha_score` para análise de fraude |

---

### Resumo das Bibliotecas de Segurança (server)

```
helmet              → headers HTTP
cors                → política de origens
express-rate-limit  → rate limiting por IP
express-validator   → validação e sanitização de input
cookie-parser       → leitura de cookies no Express
jsonwebtoken        → geração e verificação do JWT
bcryptjs            → hash da senha do admin
mysql2              → prepared statements
crypto (nativo)     → criptografia AES-256 do CPF
```

---

## 6.1 Proteção de Dados Pessoais (CPF) — LGPD

O CPF é **dado pessoal** protegido pela Lei Geral de Proteção de Dados (Lei 13.709/2018). Três decisões obrigatórias antes de ir ao ar:

---

### Decisão 1 — CPF criptografado no banco (AES-256)

O CPF **nunca** será salvo em texto puro no banco. Fluxo:

```
usuário digita CPF
      ↓
backend recebe via HTTPS (em trânsito: TLS)
      ↓
backend criptografa com AES-256-GCM usando chave em .env
      ↓
banco salva o CPF criptografado
      ↓
consulta: backend descriptografa antes de retornar ao admin autenticado
```

Variáveis de ambiente necessárias:
```env
CPF_ENCRYPTION_KEY=   # 32 bytes em hex — gerado uma vez, nunca rotacionado sem migração
CPF_ENCRYPTION_IV=    # 16 bytes em hex — gerado por inscrição (salvo junto ao registro)
```

> Se o banco vazar, os CPFs permanecem ilegíveis sem a chave de ambiente.

---

### Decisão 2 — Mascaramento no Painel Admin

O CPF **nunca** aparece completo na listagem geral do painel.

| Contexto                        | Exibição              |
|---------------------------------|-----------------------|
| Tabela de inscrições (listagem) | `***.***.**-**`       |
| Exportação Excel padrão         | `***.***.**-**`       |
| Exportação com CPF completo     | Requer segundo fator de confirmação (senha) |
| Consulta individual (detalhe)   | CPF completo visível apenas ao admin logado |

---

### Decisão 3 — Consentimento LGPD no Formulário

O formulário deve exibir um **checkbox obrigatório** antes do botão de enviar, com texto:

> *"Autorizo o Supermercados Popular a utilizar meus dados pessoais (nome, CPF, telefone) exclusivamente para fins de participação neste sorteio, conforme a Lei 13.709/2018 (LGPD)."*

- Checkbox não marcado = botão de envio desabilitado
- O aceite é registrado no banco junto à inscrição (`lgpd_aceite TINYINT(1)`, `lgpd_aceite_em DATETIME`)

Adição ao schema da tabela `inscricoes`:
```sql
lgpd_aceite     TINYINT(1) NOT NULL DEFAULT 0,
lgpd_aceite_em  DATETIME DEFAULT NULL
```

---

## 7. Rotas da API (Express)

```
POST   /api/inscricoes          → Registrar novo participante
GET    /api/admin/inscricoes    → Listar todos (protegido por auth)
GET    /api/admin/inscricoes?loja_id=X  → Filtrar por loja
GET    /api/admin/export        → Exportar CSV/Excel
GET    /api/lojas/slug/:slug    → Buscar dados da loja pelo slug
GET    /api/admin/stats         → Totais por loja (dashboard)
```

**Auth do admin:** JWT com expiração de 8h. Login via usuário/senha fixos em `.env`.  
*(Não é necessário sistema de usuários complexo para o volume deste sorteio)*

---

## 8. Painel Administrativo

**Acesso:** `/admin` — rota protegida, sem link visível ao público

**Funcionalidades:**
- [ ] Login com usuário + senha
- [ ] Dashboard: total de inscrições por loja (cards + gráfico de barras)
- [ ] Tabela com filtro por loja, data e nome
- [ ] Botão exportar Excel (`.xlsx`) — biblioteca `exceljs` no backend
- [ ] Botão exportar CSV
- [ ] Ver se o participante veio por influencer (e qual)

---

## 9. Estrutura de Pastas (Monorepo simples)

```
sorteio-kit-verao/
├── client/                  # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Inscricao.jsx       # Formulário público
│   │   │   ├── Admin/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   └── Inscricoes.jsx
│   │   │   └── LojaInvalida.jsx    # Slug não encontrado
│   │   ├── components/
│   │   └── App.jsx
│   └── package.json
│
├── server/                  # Node.js + Express
│   ├── src/
│   │   ├── routes/
│   │   │   ├── inscricoes.js
│   │   │   ├── admin.js
│   │   │   └── lojas.js
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verificação
│   │   │   └── rateLimiter.js
│   │   ├── db/
│   │   │   ├── connection.js   # Pool mysql2
│   │   │   └── schema.sql      # Script de criação das tabelas
│   │   └── index.js
│   ├── .env.example
│   └── package.json
│
├── DECISOES.md              # Este arquivo
└── README.md
```

---

## 10. Variáveis de Ambiente (`.env`)

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sorteio_kit_verao
DB_USER=
DB_PASS=

# reCAPTCHA v3
RECAPTCHA_SECRET_KEY=        # Chave secreta (Google Console)
RECAPTCHA_MIN_SCORE=0.5

# Admin JWT
JWT_SECRET=                  # String aleatória longa (min 32 chars)
ADMIN_USER=
ADMIN_PASS=                  # Armazenar hash bcrypt

# App
PORT=3001
CLIENT_URL=https://sorteio.supermercadospopular.com.br
NODE_ENV=production
```

---

## 11. Pendências Antes de Implementar

- [x] **Lojas** — 2 lojas: Piquiá (`piquia`) e Centro (`centro`)
- [x] **Regra de cupom** — cupom é único globalmente (UNIQUE no banco)
- [ ] **Domínio** — URL final a confirmar (placeholder `<dominio-a-definir>`)
- [ ] **Chaves reCAPTCHA** — aguardando chave site + chave secreta (v3)
- [x] **Período do sorteio** — 18 a 22 de agosto de 2026
- [ ] **Regulamento** — adicionar link no rodapé do formulário
- [ ] **Arte/layout** — identidade visual do Kit Verão para o frontend

---

## 12. Ordem de Implementação Sugerida

1. Schema SQL + seed das lojas
2. Servidor Express: rota POST `/api/inscricoes` + validações + reCAPTCHA
3. Frontend: formulário de inscrição com roteamento por slug
4. Testes manuais do fluxo completo
5. Rota GET admin + autenticação JWT
6. Painel admin: login + dashboard + tabela
7. Exportação Excel/CSV
8. Deploy no servidor existente + configuração HTTPS
9. Geração dos QR Codes por loja
10. Testes de carga e segurança

---

*Última atualização: 2026-08-17 — lojas definidas (PIQUIA + CENTRO), cupom único global*
