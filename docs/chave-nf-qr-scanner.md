# Leitura de QR Code da Nota Fiscal no Cadastro de Promoções

**Data de decisão:** 31/10/2026  
**Status:** Planejado — aguardando implementação  
**Autor:** Junior Muniz

---

## Contexto

O sistema de sorteios do Supermercados Popular permite que clientes se inscrevam em promoções informando o número do cupom fiscal digitado manualmente. A proposta é adicionar a leitura do QR code da nota fiscal eletrônica para capturar a **chave de acesso de 44 dígitos** automaticamente no ato do cadastro, reduzindo erros de digitação e permitindo validações mais precisas no futuro.

---

## Decisões de Arquitetura

### 1. Feature flag por promoção no banco de dados

**Decisão:** A habilitação do campo de QR code é controlada por uma coluna `exige_chave_nf BOOLEAN` na tabela `promocoes`, e não por variável de ambiente ou configuração no frontend.

**Motivo:** Cada promoção pode ter regras diferentes. Algumas podem exigir a chave NF, outras não. Centralizar no banco permite que o admin ligue/desligue por promoção sem deploy.

**Consequência:** O frontend renderiza o campo condicionalmente com base em `promo.exige_chave_nf`, valor que já vem no GET público de promoções.

---

### 2. Validação obrigatória no backend, independente do frontend

**Decisão:** O backend lê `exige_chave_nf` diretamente do banco ao processar o POST de inscrição. Ele não confia no valor enviado pelo cliente.

**Motivo:** Qualquer pessoa pode manipular o frontend (DevTools, Postman, script) para omitir ou falsificar campos. A única fonte de verdade é o banco.

**Implementação:**
- Na query que valida a promoção (já existente em `inscricoesV2.js`), incluir `exige_chave_nf` no SELECT.
- Se `exige_chave_nf = true` e `chave_nf` não vier no body (ou vier inválida) → rejeitar com HTTP 400.
- Se `exige_chave_nf = false` → ignorar `chave_nf` mesmo que venha no body.

---

### 3. Extração da chave por regex agnóstica de formato de URL

**Decisão:** Usar regex `(?<!\d)(\d{44})(?!\d)` sobre o conteúdo bruto do QR, em vez de parsear a URL do SEFAZ.

**Motivo:** Existem três tipos de nota com QR code no Brasil, cada um com formato de URL diferente por estado:

| Tipo | Formato do QR |
|------|--------------|
| NFC-e (modelo 65) | URL com `?chave=44digitos` — padrão ENCAT, varia por estado |
| NF-e (modelo 55) | URL com `nfe_id=44digitos` — portal nacional |
| CF-e / SAT (SP) | Bloco de dados sem URL — chave presente como sequência pura |

Parsear a URL quebraria para SAT e para estados com parâmetros diferentes. A regex encontra os 44 dígitos em qualquer formato.

---

### 4. Validação matemática da chave por Módulo 11

**Decisão:** Após extrair os 44 dígitos, validar o dígito verificador (último dígito) usando o algoritmo Módulo 11 da SEFAZ.

**Motivo:** Evitar aceitar sequências de 44 dígitos que não sejam chaves reais (ex: outros números numa URL). A validação matemática é determinística e não requer chamada de rede.

**Algoritmo:**
```js
function validarChaveNF(chave) {
  if (!/^\d{44}$/.test(chave)) return false;

  const digits = chave.split('').map(Number);
  const body   = digits.slice(0, 43);
  const cDV    = digits[43];

  let peso = 2, soma = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    soma += body[i] * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto    = soma % 11;
  const esperado = resto < 2 ? 0 : 11 - resto;
  return cDV === esperado;
}
```

Esta validação é executada no **frontend** (UX — feedback imediato) e no **backend** (segurança — fonte de verdade).

---

### 5. Campo opcional com fallback manual obrigatório

**Decisão:** Mesmo quando `exige_chave_nf = true`, o formulário deve sempre manter o campo `numero_cupom` digitável. O scanner preenche automaticamente, mas o usuário pode digitar manualmente.

**Motivo:**
- Câmera pode ser negada pelo usuário ou pelo navegador.
- Nota pode estar danificada/ilegível.
- iOS Safari exige HTTPS para `getUserMedia` — já coberto em produção, mas pode falhar em redes específicas.

**Comportamento:**
- Se o usuário escanear com sucesso → `numero_cupom` e `data_cupom` são preenchidos automaticamente quando extraíveis da URL.
- Se o scanner falhar → mensagem clara + usuário digita normalmente.
- `chave_nf` fica no backend como dado adicional de validação futura.

---

### 6. Biblioteca de leitura: `html5-qrcode`

**Decisão:** Usar `html5-qrcode` em vez de `@zxing/browser`.

**Motivo:** Melhor suporte a câmera traseira em dispositivos móveis (principal cenário de uso), API mais simples, e suporta tanto câmera ao vivo quanto upload de imagem da galeria nativamente — o que resolve o caso do usuário que já tem foto do cupom.

---

### 7. Índice único parcial para `chave_nf`

**Decisão:** `CREATE UNIQUE INDEX idx_chave_nf ON inscricoes_v2(chave_nf) WHERE chave_nf IS NOT NULL`

**Motivo:** Índice único convencional em coluna nullable cria conflito em alguns SGBDs ao inserir múltiplos `NULL`. O índice parcial (`WHERE chave_nf IS NOT NULL`) garante unicidade apenas onde há valor, sem afetar inscrições que não escanearam.

---

## Alterações por Camada

### Banco de dados

```sql
-- Habilitar feature por promoção
ALTER TABLE promocoes
  ADD COLUMN IF NOT EXISTS exige_chave_nf BOOLEAN NOT NULL DEFAULT FALSE;

-- Armazenar a chave capturada
ALTER TABLE inscricoes_v2
  ADD COLUMN IF NOT EXISTS chave_nf VARCHAR(44) DEFAULT NULL;

-- Unicidade sem conflito em NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_chave_nf
  ON inscricoes_v2(chave_nf)
  WHERE chave_nf IS NOT NULL;
```

---

### Backend — `routes/promocoes.js`

**GET `/:slug` (público):** adicionar `exige_chave_nf` no SELECT para que o frontend receba a flag junto com os dados da promoção.

**PUT `/:id` (admin):** aceitar e persistir `exige_chave_nf` no UPDATE, permitindo que o admin controle a flag pelo painel.

---

### Backend — `routes/inscricoesV2.js`

**POST `/` (público):**

1. Na query de validação da promoção, incluir `exige_chave_nf` no SELECT.
2. Após validar a promoção, verificar condicionalmente:
   - `exige_chave_nf = true` e `chave_nf` ausente → HTTP 400
   - `exige_chave_nf = true` e `chave_nf` presente → validar 44 dígitos + Módulo 11 + duplicidade
   - `exige_chave_nf = false` → ignorar `chave_nf`
3. Incluir `chave_nf` no INSERT (quando presente).

---

### Frontend — `pages/PromoForm.jsx`

- Schema Yup: `chave_nf` obrigatório condicionalmente via `promo.exige_chave_nf`.
- Renderização: bloco do scanner aparece somente quando `promo.exige_chave_nf === true`.
- Payload: `chave_nf` incluída no POST somente quando preenchida.
- Ao escanear com sucesso: `setValue('numero_cupom', ...)` e `setValue('data_cupom', ...)` quando extraíveis da URL.

---

### Frontend — `components/QrNfScanner.jsx` (novo)

Responsabilidades:
- Botão que abre modal com câmera.
- Leitura via `html5-qrcode` (câmera ao vivo + upload de imagem).
- Extração da chave: regex `(?<!\d)(\d{44})(?!\d)` sobre o conteúdo bruto.
- Validação local com Módulo 11.
- Callback `onScan({ chave_nf, numero_cupom, data_cupom })`.
- Estados: idle → scanning → sucesso | falha.
- Botão "Digitar manualmente" como saída sem erro.

---

### Frontend — `pages/Admin.jsx`

- Toggle (checkbox ou switch) no formulário de edição de promoção para ligar/desligar `exige_chave_nf`.
- Exibir `chave_nf` (truncada) na tabela de inscrições como dado informativo.

---

## Fluxo de Segurança

```
FRONTEND
  promo.exige_chave_nf (lido do banco via GET)
  → renderiza campo se true
  → valida Módulo 11 localmente (UX)
  → envia chave_nf no POST

BACKEND (fonte de verdade)
  → lê exige_chave_nf DO BANCO na query de validação da promoção
  → valida chave_nf independentemente do que o frontend enviou
  → rejeita se obrigatória e ausente/inválida
  → salva

BANCO
  → promocoes.exige_chave_nf  — única fonte de verdade da regra
  → inscricoes_v2.chave_nf    — dado salvo
  → índice único parcial       — integridade
```

---

## Riscos Mapeados e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Câmera negada pelo usuário | Alto | Campo `numero_cupom` manual sempre disponível |
| QR danificado/ilegível | Médio | Fallback manual; campo `chave_nf` é opcional no banco |
| SAT/CF-e sem URL padrão | Médio | Regex agnóstica extrai 44 dígitos de qualquer formato |
| Estados com URL diferente | Baixo | Mesma regex cobre todos os formatos |
| Chave duplicada (mesma NF) | Médio | Índice único parcial + erro amigável no frontend |
| Manipulação via DevTools | Alto | Backend valida flag e chave diretamente no banco |
| HTTPS ausente (câmera iOS) | Baixo | Produção já usa HTTPS; fallback manual disponível |

---

## Ordem de Implementação Recomendada

1. Migration do banco (`exige_chave_nf` em `promocoes`, `chave_nf` em `inscricoes_v2`)
2. `routes/promocoes.js` — GET inclui a flag, PUT persiste
3. `routes/inscricoesV2.js` — validação condicional no POST
4. `components/QrNfScanner.jsx` — componente de leitura
5. `pages/PromoForm.jsx` — integração do scanner e schema condicional
6. `pages/Admin.jsx` — toggle de configuração e exibição da chave

---

## Arquivos Impactados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `server/src/db/migration_chave_nf.sql` | Novo |
| `server/src/routes/promocoes.js` | Editar (GET + PUT) |
| `server/src/routes/inscricoesV2.js` | Editar (POST) |
| `frontendV2/src/components/QrNfScanner.jsx` | Novo |
| `frontendV2/src/pages/PromoForm.jsx` | Editar |
| `frontendV2/src/pages/Admin.jsx` | Editar |
