-- Diagnóstico: por que o filtro por financeira no dashboard pode não achar faturas antigas.
-- Rode no Supabase SQL Editor (somente leitura / inspeção).

-- 1) Resumo por padrão de gateway_nome (últimas 2000 faturas com cobrança)
SELECT
  left(coalesce(nullif(btrim(f.gateway_nome), ''), '(vazio)'), 40) AS gateway_prefixo,
  count(*)::bigint AS qtd,
  count(f.financeira_id)::bigint AS com_financeira_id
FROM faturas f
WHERE f.asaas_charge_id IS NOT NULL OR f.gateway_id IS NOT NULL
GROUP BY 1
ORDER BY qtd DESC
LIMIT 30;

-- 2) Faturas com cobrança Asaas mas sem vínculo com financeira (candidatas a backfill manual)
SELECT
  f.id,
  f.administradora_id,
  f.numero_fatura,
  f.vencimento,
  f.gateway_nome,
  f.financeira_id,
  f.asaas_charge_id IS NOT NULL AS tem_asaas_charge
FROM faturas f
WHERE (f.asaas_charge_id IS NOT NULL OR f.gateway_id IS NOT NULL)
  AND f.financeira_id IS NULL
  AND (
    f.gateway_nome IS NULL
    OR btrim(f.gateway_nome) = ''
    OR lower(btrim(f.gateway_nome)) = 'asaas'
  )
ORDER BY f.vencimento DESC NULLS LAST
LIMIT 200;

-- 3) Administradoras com mais de uma financeira Asaas ativa (legado "Asaas" genérico não pode ser adivinhado)
SELECT
  af.administradora_id,
  count(*)::int AS financeiras_asaas_ativas
FROM administradora_financeiras af
WHERE af.ativo = true
  AND lower(btrim(coalesce(af.instituicao_financeira, ''))) = 'asaas'
GROUP BY af.administradora_id
HAVING count(*) > 1;

-- 4) Exemplo de correção manual (ajuste UUIDs e rode só se souber a financeira correta):
-- UPDATE faturas
-- SET
--   financeira_id = 'UUID_DA_FINANCEIRA_AQUI'::uuid,
--   gateway_nome = left('Asaas - Nome exato como no cadastro', 50)
-- WHERE administradora_id = 'UUID_ADMIN_AQUI'::uuid
--   AND financeira_id IS NULL
--   AND lower(btrim(coalesce(gateway_nome, ''))) = 'asaas';

-- =============================================================================
-- 5) Caso real: administradora com 2+ financeiras Asaas (ex.: 81b2fd0f-0289-41fb-a140-db5af26011e9)
-- =============================================================================
-- O sistema não sabe qual conta gerou cada fatura legada (gateway só "Asaas").
-- Você precisa decidir regra de negócio: ex. "tudo que era genérico era da Benefit" e rodar o UPDATE (6).

-- 5a) Quem são as financeiras desta administradora (copie o id da que deve receber o legado)
SELECT id, nome, ativo, instituicao_financeira
FROM administradora_financeiras
WHERE administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
ORDER BY nome;

-- 5b) Quantas faturas ficariam sem filtro até você corrigir (legado Asaas / vazio, com cobrança)
SELECT count(*)::bigint AS faturas_sem_vinculo
FROM faturas f
WHERE f.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
  AND f.financeira_id IS NULL
  AND (
    f.gateway_nome IS NULL
    OR btrim(f.gateway_nome) = ''
    OR lower(btrim(f.gateway_nome)) = 'asaas'
  )
  AND (
    f.asaas_charge_id IS NOT NULL AND btrim(f.asaas_charge_id::text) <> ''
    OR f.gateway_id IS NOT NULL AND btrim(f.gateway_id::text) <> ''
  );

-- 5c) Amostra antes de corrigir (confira se bate com o que você espera)
SELECT f.id, f.numero_fatura, f.vencimento, f.gateway_nome, f.asaas_charge_id IS NOT NULL AS tem_charge
FROM faturas f
WHERE f.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
  AND f.financeira_id IS NULL
  AND (
    f.gateway_nome IS NULL
    OR btrim(f.gateway_nome) = ''
    OR lower(btrim(f.gateway_nome)) = 'asaas'
  )
  AND (
    f.asaas_charge_id IS NOT NULL AND btrim(f.asaas_charge_id::text) <> ''
    OR f.gateway_id IS NOT NULL AND btrim(f.gateway_id::text) <> ''
  )
ORDER BY f.vencimento DESC NULLS LAST
LIMIT 25;

-- =============================================================================
-- 6) Atribuir TODAS as faturas legadas (Asaas genérico ou gateway vazio) a UMA financeira
-- =============================================================================
-- 1) Rode 5a e escolha o UUID da financeira correta (ex.: Benefit Cobrança).
-- 2) Substitua apenas FINANCEIRA_DESTINO abaixo e execute o UPDATE (em transação se preferir).

-- BEGIN;
-- UPDATE faturas f
-- SET
--   financeira_id = 'FINANCEIRA_DESTINO'::uuid,
--   gateway_nome = left(
--     concat(
--       'Asaas - ',
--       btrim(coalesce((SELECT nome FROM administradora_financeiras WHERE id = 'FINANCEIRA_DESTINO'::uuid), ''))
--     ),
--     50
--   )
-- WHERE f.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
--   AND f.financeira_id IS NULL
--   AND (
--     f.gateway_nome IS NULL
--     OR btrim(f.gateway_nome) = ''
--     OR lower(btrim(f.gateway_nome)) = 'asaas'
--   )
--   AND (
--     f.asaas_charge_id IS NOT NULL AND btrim(f.asaas_charge_id::text) <> ''
--     OR f.gateway_id IS NOT NULL AND btrim(f.gateway_id::text) <> ''
--   );
-- COMMIT;

-- Se parte do legado era de outra conta, faça um segundo UPDATE com WHERE mais restrito
-- (ex.: só vencimento antes de 2025-01-01) ou corrija por lista de fatura id.

-- =============================================================================
-- 7) Verificar se status das faturas CLUBE BEN batem com a expectativa (pós-webhook/sync)
-- =============================================================================
-- Substitua FIN_CLUBE pelo id retornado em 5a para o nome "CLUBE BEN".
-- financeira_id é a fonte principal; gateway_nome confirma o rótulo Asaas.

-- 7a) Distribuição de status (faturas com cobrança vinculada à financeira Clube Ben)
/*
SELECT f.status, count(*)::bigint AS qtd
FROM faturas f
WHERE f.financeira_id = 'FIN_CLUBE'::uuid
  AND (
    f.asaas_charge_id IS NOT NULL AND btrim(f.asaas_charge_id::text) <> ''
    OR f.gateway_id IS NOT NULL AND btrim(f.gateway_id::text) <> ''
  )
GROUP BY f.status
ORDER BY qtd DESC;
*/

-- 7b) Candidatas a “já pagas no Asaas mas ainda pendentes no app” (vale abrir o id no painel Asaas)
/*
SELECT f.id, f.numero_fatura, f.cliente_nome, f.status, f.vencimento, f.asaas_charge_id, f.updated_at
FROM faturas f
WHERE f.financeira_id = 'FIN_CLUBE'::uuid
  AND lower(btrim(coalesce(f.status, ''))) IN ('pendente', 'atrasada')
  AND (
    f.asaas_charge_id IS NOT NULL AND btrim(f.asaas_charge_id::text) <> ''
    OR f.gateway_id IS NOT NULL AND btrim(f.gateway_id::text) <> ''
  )
ORDER BY f.vencimento DESC NULLS LAST
LIMIT 50;
*/
