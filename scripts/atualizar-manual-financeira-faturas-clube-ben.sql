-- =============================================================================
-- Corrigir manualmente financeira CLUBE BEN em faturas (ex.: Unimed Campos)
-- =============================================================================
-- Novas faturas: ao gerar boleto (único ou lote), o app já grava na tabela
-- `faturas` os campos `financeira_id` e `gateway_nome` (prefixo "Asaas - " +
-- nome da financeira escolhida na tela). Veja:
--   lib/gerar-boleto-administradora.ts → updatePayload + atualizarFaturaComFallbackColunas
-- Confirme no Supabase as colunas (scripts/adicionar-coluna-financeira-id-faturas.sql
-- e adicionar-colunas-boleto-faturas.sql) se algo não persistir.
--
-- Ajuste administradora_id se for outra conta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Passo 1 — Id da financeira CLUBE BEN (use no UPDATE ou confira no Table Editor)
-- -----------------------------------------------------------------------------
SELECT id, nome, ativo
FROM administradora_financeiras
WHERE administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
  AND lower(btrim(nome)) = lower('CLUBE BEN')
LIMIT 1;

-- -----------------------------------------------------------------------------
-- Passo 2 (opcional) — Faturas Asaas ainda na Benefit mas com padrão IMP- de vida
-- do grupo "Unimed Campos" (candidatas a virar Clube Ben)
-- -----------------------------------------------------------------------------
WITH g AS (
  SELECT gb.id
  FROM grupos_beneficiarios gb
  WHERE gb.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
    AND gb.ativo = true
    AND lower(btrim(gb.nome)) = lower(btrim('Unimed Campos'))
  LIMIT 1
),
fin_benef AS (
  SELECT af.id
  FROM administradora_financeiras af
  WHERE af.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
    AND af.ativo = true
    AND lower(btrim(af.nome)) = lower(btrim('BENEFIT COBRANCAS'))
  LIMIT 1
)
SELECT
  f.id AS fatura_id,
  f.numero_fatura,
  f.cliente_nome,
  f.financeira_id,
  f.gateway_nome,
  v.nome AS titular_vida_grupo
FROM faturas f
CROSS JOIN g
CROSS JOIN fin_benef
INNER JOIN vidas_importadas v
  ON v.grupo_id = g.id
  AND v.administradora_id = f.administradora_id
  AND v.tipo = 'titular'
INNER JOIN clientes_administradoras ca
  ON ca.id = f.cliente_administradora_id
  AND ca.administradora_id = f.administradora_id
WHERE f.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
  AND fin_benef.id IS NOT NULL
  AND f.financeira_id = fin_benef.id
  AND (
    f.asaas_charge_id IS NOT NULL AND btrim(f.asaas_charge_id::text) <> ''
    OR f.gateway_id IS NOT NULL AND btrim(f.gateway_id::text) <> ''
  )
  AND btrim(ca.numero_contrato) = ('IMP-' || substring(v.id::text from 1 for 8))
ORDER BY f.vencimento DESC NULLS LAST, f.created_at DESC;

-- -----------------------------------------------------------------------------
-- Passo 3 — UPDATE manual: cole os UUIDs de f.id do Passo 2 (ou da tela Fatura)
-- -----------------------------------------------------------------------------
-- Descomente, substitua os UUIDs e execute uma vez.

/*
UPDATE faturas f
SET
  financeira_id = sub.fin_id,
  gateway_nome = left(concat('Asaas - ', sub.fin_nome), 50)
FROM (
  SELECT
    af.id AS fin_id,
    btrim(af.nome) AS fin_nome
  FROM administradora_financeiras af
  WHERE af.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
    AND af.ativo = true
    AND lower(btrim(af.nome)) = lower(btrim('CLUBE BEN'))
  LIMIT 1
) sub
WHERE f.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
  AND f.id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
  );
*/
