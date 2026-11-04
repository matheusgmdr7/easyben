-- =============================================================================
-- Diagnóstico: fatura paga no Asaas/banco mas ainda pendente no sistema
-- Exemplo: 946680321 — Cleyton Pereira dos Santos
-- =============================================================================
-- 1) Localizar a fatura no Easyben
-- 2) Ver se tem asaas_charge_id / gateway_id (sem isso o sync antigo ignorava)
-- 3) Confirmar status e pagamento_data
-- Depois use a API pontual:
--   POST /api/sincronizar-status-asaas
--   { "administradora_id": "<uuid>", "numero_fatura": "946680321" }
-- =============================================================================

SELECT
  f.id,
  f.numero_fatura,
  f.cliente_nome,
  f.status,
  f.pagamento_data,
  f.pagamento_valor,
  f.valor,
  f.vencimento,
  f.asaas_charge_id,
  f.gateway_id,
  f.gateway_nome,
  f.financeira_id,
  f.cliente_administradora_id,
  f.administradora_id,
  f.tenant_id,
  f.updated_at,
  CASE
    WHEN f.asaas_charge_id IS NULL AND f.gateway_id IS NULL THEN
      'Sem charge id — sync antigo não consultava o Asaas; use sync pontual por numero_fatura'
    WHEN f.status IN ('pendente', 'atrasada', 'vencida') AND f.pagamento_data IS NOT NULL THEN
      'Inconsistente: tem pagamento_data mas status ainda em aberto'
    WHEN f.status IN ('pendente', 'atrasada', 'vencida') THEN
      'Em aberto no Easyben — rode sync pontual ou confira webhook'
    ELSE
      'Status atual: ' || coalesce(f.status, '(null)')
  END AS diagnostico
FROM faturas f
WHERE f.numero_fatura = '946680321'   -- <<< ajuste se necessário
   OR coalesce(f.cliente_nome, '') ILIKE '%Cleyton Pereira dos Santos%'
ORDER BY f.updated_at DESC NULLS LAST
LIMIT 20;
