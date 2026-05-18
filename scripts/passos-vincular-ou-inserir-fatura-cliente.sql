-- =============================================================================
-- Passo a passo: vincular fatura existente OU inserir fatura manual no Supabase
-- =============================================================================
-- Use no SQL Editor do Supabase. Troque os placeholders (UUID, valores, datas).
-- Sempre rode os SELECTs antes do UPDATE/INSERT. Faça backup ou use BEGIN/COMMIT.

-- =============================================================================
-- Se a fatura NÃO existe em `faturas` (só no Asaas)
-- =============================================================================
-- Opção A — Recuperar pelo app (sem SQL): se a cobrança está no Asaas no MESMO
-- customer que o CPF da proposta do titular encontra, a API lista cobranças e
-- insere as que faltam no banco:
--
--   POST /api/admin/recuperar-fatura-asaas
--   Body: { "cliente_administradora_id": "<UUID do titular>", "administradora_id": "<UUID da administradora>" }
--
-- (Postman/curl no mesmo host do Next.) Inclui cobranças cujo invoiceNumber é
-- ex.: 805253744, desde que estejam nesse customer no Asaas.
-- Se a cobrança estiver em outro customer no Asaas, use a Opção B (INSERT SQL).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASSO 0 (opcional): ver colunas reais da tabela `faturas` no seu projeto
-- -----------------------------------------------------------------------------
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'faturas'
-- ORDER BY ordinal_position;

-- -----------------------------------------------------------------------------
-- PASSO 1: encontrar o cliente (titular) na plataforma — copie o `id` (UUID)
-- -----------------------------------------------------------------------------
-- Substitua o trecho do nome pelo do beneficiário.
/*
SELECT
  ca.id AS cliente_administradora_id,
  ca.administradora_id,
  ca.tenant_id,
  ca.status,
  ca.proposta_id,
  v.cliente_nome
FROM clientes_administradoras ca
LEFT JOIN vw_clientes_administradoras_completo v ON v.id = ca.id
WHERE lower(coalesce(v.cliente_nome, '')) LIKE lower('%Acenate%Fernandes%Silva%')
ORDER BY v.cliente_nome
LIMIT 20;
*/

-- -----------------------------------------------------------------------------
-- PASSO 2: a fatura JÁ existe na tabela `faturas`?
-- -----------------------------------------------------------------------------
-- Substitua pelo número da fatura no Asaas / plataforma (ex.: 805253744).
/*
SELECT
  f.id,
  f.numero_fatura,
  f.cliente_nome,
  f.cliente_administradora_id,
  f.administradora_id,
  f.tenant_id,
  f.valor,
  f.vencimento,
  f.status,
  f.gateway_id,
  f.asaas_charge_id
FROM faturas f
WHERE f.numero_fatura = '805253744'
   OR f.numero_fatura LIKE '%805253744%'
ORDER BY f.created_at DESC NULLS LAST
LIMIT 20;
*/

-- =============================================================================
-- CAMINHO A — A linha da fatura JÁ EXISTE: só falta (ou corrigir) o vínculo
-- =============================================================================
-- Confira no PASSO 2 que `administradora_id` e `tenant_id` da fatura batem com
-- os do cliente (PASSO 1). Se baterem, rode o UPDATE.

/*
BEGIN;

UPDATE faturas
SET
  cliente_administradora_id = 'UUID_CLIENTE_ADMINISTRADORA_AQUI'::uuid,
  cliente_nome = 'Nome exibido na fatura'  -- opcional; alinha com o cadastro
WHERE id = 'UUID_DA_FATURA_AQUI'::uuid;

-- Deve retornar UPDATE 1. Se 0, o WHERE está errado.
ROLLBACK;  -- troque por COMMIT; quando tiver certeza
*/

-- =============================================================================
-- CAMINHO B — A fatura NÃO existe no banco: INSERT manual (cobrança já no Asaas)
-- =============================================================================
-- Preencha com dados do PASSO 1 (cliente) e do Asaas (valor, vencimento, IDs).
-- `cliente_id` no app costuma ser CPF só dígitos ou fallback para o UUID do cliente.
-- `status`: use 'pendente' ou 'atrasada' conforme a situação no Asaas / vencimento.
-- `numero_fatura`: pode ser o número da nota/cobrança no Asaas (ex.: 805253744).
-- URLs do Asaas (opcional): https://www.asaas.com/b/pdf/{id_sem_pay_} e /i/ idem

/*
BEGIN;

INSERT INTO faturas (
  id,
  cliente_administradora_id,
  administradora_id,
  tenant_id,
  cliente_id,
  cliente_nome,
  cliente_email,
  cliente_telefone,
  valor,
  vencimento,
  status,
  numero_fatura,
  observacoes,
  proposta_id,
  financeira_id,
  gateway_id,
  gateway_nome,
  asaas_charge_id,
  boleto_url,
  asaas_boleto_url,
  asaas_invoice_url,
  asaas_payment_link
)
SELECT
  gen_random_uuid(),
  ca.id,
  ca.administradora_id,
  ca.tenant_id,
  ca.id::text,
  coalesce(v.cliente_nome, 'Cliente'),
  coalesce(v.cliente_email, ''),
  coalesce(v.cliente_telefone, ''),
  0.00,                          -- VALOR: substitua pelo valor da cobrança
  '2025-01-15'::date,            -- VENCIMENTO: data yyyy-mm-dd
  'pendente',                    -- ou 'atrasada'
  '805253744',                   -- número no Asaas / fatura
  'Inserção manual / vínculo retroativo',
  ca.proposta_id,
  NULL::uuid,                    -- financeira_id: opcional; preencha se souber o UUID
  'pay_xxxxxxxx',                -- gateway_id / ID cobrança Asaas (se tiver)
  'Asaas - Nome da financeira', -- gateway_nome (até 50 chars; alinhe ao cadastro)
  'pay_xxxxxxxx',                -- asaas_charge_id (geralmente igual ao gateway_id)
  null,                          -- boleto_url
  null,                          -- asaas_boleto_url
  null,                          -- asaas_invoice_url
  null                           -- asaas_payment_link
FROM clientes_administradoras ca
LEFT JOIN vw_clientes_administradoras_completo v ON v.id = ca.id
WHERE ca.id = 'UUID_CLIENTE_ADMINISTRADORA_AQUI'::uuid;

ROLLBACK;  -- troque por COMMIT; quando tiver certeza
*/

-- Notas:
-- 1) `cliente_id` usa o UUID do cliente em texto (compatível com fluxo legado do app).
-- 2) Se o INSERT falhar por coluna obrigatória ausente, rode o PASSO 0 e acrescente
--    a coluna na lista com valor default ou NULL permitido.
-- 3) Se a tabela não tiver `proposta_id` ou der erro, remova a coluna `proposta_id` do INSERT
--    ou use: ca.proposta_id apenas se existir em clientes_administradoras.
-- 4) Depois do COMMIT, abra o beneficiário na plataforma (aba Financeiro) e confira.
