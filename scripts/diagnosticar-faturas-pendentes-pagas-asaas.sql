-- =============================================================================
-- Candidatas a "paga no Asaas / banco, ainda em aberto no Easyben"
-- Administradora exemplo: 81b2fd0f-0289-41fb-a140-db5af26011e9
-- =============================================================================
-- 1) Conferir vínculo do caso Cleyton
-- 2) Listar em aberto COM asaas_charge_id (as que o sync consegue consultar)
-- 3) Listar em aberto SEM charge id (risco: sync só acha se tiver customer + número)
-- Depois rode sync em lote no painel ou:
--   POST /api/sincronizar-status-asaas
--   { "administradora_id": "...", "modo": "reconciliare", "limite": 40 }
-- =============================================================================

-- A) Caso pontual (Cleyton / 946680321)
SELECT
  f.id,
  f.numero_fatura,
  f.cliente_nome,
  f.status,
  f.pagamento_data,
  f.asaas_charge_id,
  f.gateway_id,
  f.cliente_administradora_id,
  ca.asaas_customer_id,
  ca.status AS ca_status
FROM faturas f
LEFT JOIN clientes_administradoras ca ON ca.id = f.cliente_administradora_id
WHERE f.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'
  AND (
    f.numero_fatura = '946680321'
    OR f.id = 'e47af6fc-58ff-4990-805f-f37cef8bca9d'
    OR coalesce(f.cliente_nome, '') ILIKE '%Cleyton Pereira dos Santos%'
  );

-- B) Em aberto COM cobrança Asaas (prioridade da varredura)
SELECT
  f.id,
  f.numero_fatura,
  f.cliente_nome,
  f.status,
  f.vencimento,
  f.valor,
  f.asaas_charge_id,
  f.gateway_id,
  f.cliente_administradora_id,
  f.gateway_nome,
  f.updated_at
FROM faturas f
WHERE f.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'
  AND lower(coalesce(f.status, '')) IN ('pendente', 'atrasada', 'vencida')
  AND (
    (f.asaas_charge_id IS NOT NULL AND btrim(f.asaas_charge_id) <> '')
    OR (f.gateway_id IS NOT NULL AND btrim(f.gateway_id) <> '')
  )
ORDER BY f.vencimento DESC NULLS LAST
LIMIT 200;

-- C) Em aberto SEM charge id (podem precisar de customer + numero_fatura)
SELECT
  f.id,
  f.numero_fatura,
  f.cliente_nome,
  f.status,
  f.vencimento,
  f.valor,
  f.cliente_administradora_id,
  ca.asaas_customer_id
FROM faturas f
LEFT JOIN clientes_administradoras ca ON ca.id = f.cliente_administradora_id
WHERE f.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'
  AND lower(coalesce(f.status, '')) IN ('pendente', 'atrasada', 'vencida')
  AND (f.asaas_charge_id IS NULL OR btrim(f.asaas_charge_id) = '')
  AND (f.gateway_id IS NULL OR btrim(f.gateway_id) = '')
ORDER BY f.vencimento DESC NULLS LAST
LIMIT 100;

-- D) Resumo
SELECT
  count(*) FILTER (
    WHERE lower(coalesce(status, '')) IN ('pendente', 'atrasada', 'vencida')
      AND (
        (asaas_charge_id IS NOT NULL AND btrim(asaas_charge_id) <> '')
        OR (gateway_id IS NOT NULL AND btrim(gateway_id) <> '')
      )
  ) AS em_aberto_com_charge,
  count(*) FILTER (
    WHERE lower(coalesce(status, '')) IN ('pendente', 'atrasada', 'vencida')
      AND (asaas_charge_id IS NULL OR btrim(asaas_charge_id) = '')
      AND (gateway_id IS NULL OR btrim(gateway_id) = '')
  ) AS em_aberto_sem_charge,
  count(*) FILTER (
    WHERE lower(coalesce(status, '')) IN ('pendente', 'atrasada', 'vencida')
      AND cliente_administradora_id IS NULL
  ) AS em_aberto_sem_cliente_adm
FROM faturas
WHERE administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9';
