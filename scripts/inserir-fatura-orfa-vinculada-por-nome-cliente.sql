-- =============================================================================
-- Inserir fatura órfã (existe no Asaas, não existe em `faturas`) já vinculada ao cliente
-- =============================================================================
-- Edite o CTE `params`.
--
-- IMPORTANTE — Por que qtd_cliente_cte = 0?
-- A view `vw_clientes_administradoras_completo` só inclui quem tem JOIN em `propostas`.
-- Beneficiário só em vida importada (sem linha na view) fica com cliente_nome NULL no
-- LEFT JOIN — o filtro só por nome da view não acha. Por isso este script usa também
-- `propostas.nome` e `vidas_importadas.nome` (titular).
--
-- Opção mais segura: preencha `cliente_administradora_id_opcional` com o UUID do titular
-- (copiado do passo 0b ou da tela do beneficiário). Se não for NULL, o nome é ignorado.
--
-- Após a seção 1: linhas_gravadas = 1 → gravado. = 0 → leia mensagem e colunas de diagnóstico.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0a) Quem bate só pelo nome na VIEW (pode ser vazio para quem não tem proposta na view)
-- -----------------------------------------------------------------------------
SELECT
  ca.id AS cliente_administradora_id,
  ca.administradora_id,
  ca.tenant_id,
  ca.proposta_id,
  v.cliente_nome,
  v.cliente_cpf
FROM clientes_administradoras ca
LEFT JOIN vw_clientes_administradoras_completo v ON v.id = ca.id
WHERE coalesce(v.cliente_nome, '') ILIKE '%Acenate Fernandes da Silva%'   -- <<< AJUSTE
ORDER BY v.cliente_nome
LIMIT 5;

-- -----------------------------------------------------------------------------
-- 0b) Quem bate pelo nome na VIEW **ou** na proposta **ou** na vida importada (titular)
--     Use esta lista para copiar `cliente_administradora_id` ou ajustar o ILIKE.
-- -----------------------------------------------------------------------------
SELECT
  ca.id AS cliente_administradora_id,
  ca.administradora_id,
  ca.tenant_id,
  v.cliente_nome AS nome_na_view,
  p.nome AS nome_na_proposta,
  vi.nome AS nome_vida_importada_titular,
  coalesce(v.cliente_nome, p.nome, vi.nome, '') AS nome_para_busca
FROM clientes_administradoras ca
LEFT JOIN vw_clientes_administradoras_completo v ON v.id = ca.id
LEFT JOIN propostas p ON p.id = ca.proposta_id
LEFT JOIN LATERAL (
  SELECT v2.nome
  FROM vidas_importadas v2
  WHERE v2.cliente_administradora_id = ca.id
  ORDER BY CASE WHEN lower(coalesce(v2.tipo, '')) = 'titular' THEN 0 ELSE 1 END, v2.nome
  LIMIT 1
) vi ON true
WHERE coalesce(v.cliente_nome, p.nome, vi.nome, '') ILIKE '%Acenate Fernandes da Silva%'   -- <<< MESMO padrão do params.filtro_nome_ilike
ORDER BY nome_para_busca
LIMIT 20;

-- Se 0b também vier vazio: o nome no banco está diferente (acento, ordem, abreviação)
-- ou o vínculo `vidas_importadas.cliente_administradora_id` ainda não está preenchido.
-- Aí use busca por CPF em propostas / vidas ou cole o UUID em cliente_administradora_id_opcional.

-- -----------------------------------------------------------------------------
-- 1) INSERT + diagnóstico (rode o bloco inteiro)
-- -----------------------------------------------------------------------------
WITH
  params AS (
    SELECT
      NULL::uuid AS cliente_administradora_id_opcional,   -- <<< opcional: UUID do 0b (ignora nome)
      723.38::numeric AS valor_fatura,
      '2026-05-10'::date AS vencimento_fatura,
      'paga'::text AS status_fatura,
      '805253744'::text AS numero_fatura,
      'pay_SUBSTITUA_PELO_ID_REAL'::varchar AS asaas_charge_id,   -- <<< ID real da cobrança no Asaas (pay_...)
      NULL::uuid AS financeira_id_opcional,
      NULL::varchar(50) AS gateway_nome_opcional,
      NULL::text AS asaas_boleto_url,
      NULL::text AS asaas_invoice_url,
      NULL::text AS asaas_payment_link,
      NULL::text AS boleto_url,
      '%Acenate Fernandes da Silva%'::text AS filtro_nome_ilike
  ),
  cliente AS (
    SELECT
      ca.id AS cliente_administradora_id,
      ca.administradora_id,
      ca.tenant_id,
      coalesce(v.cliente_nome, p.nome, vi.nome, 'Cliente') AS cliente_nome,
      coalesce(v.cliente_email, p.email, '') AS cliente_email,
      coalesce(v.cliente_telefone, p.telefone, '') AS cliente_telefone
    FROM clientes_administradoras ca
    LEFT JOIN vw_clientes_administradoras_completo v ON v.id = ca.id
    LEFT JOIN propostas p ON p.id = ca.proposta_id
    LEFT JOIN LATERAL (
      SELECT v2.nome
      FROM vidas_importadas v2
      WHERE v2.cliente_administradora_id = ca.id
      ORDER BY CASE WHEN lower(coalesce(v2.tipo, '')) = 'titular' THEN 0 ELSE 1 END, v2.nome
      LIMIT 1
    ) vi ON true
    CROSS JOIN params p2
    WHERE (
        p2.cliente_administradora_id_opcional IS NOT NULL
        AND ca.id = p2.cliente_administradora_id_opcional
      )
      OR (
        p2.cliente_administradora_id_opcional IS NULL
        AND coalesce(v.cliente_nome, p.nome, vi.nome, '') ILIKE p2.filtro_nome_ilike
      )
    ORDER BY coalesce(v.cliente_nome, p.nome, vi.nome)
    LIMIT 1
  ),
  candidatos AS (
    SELECT
      gen_random_uuid() AS id,
      c.cliente_administradora_id,
      c.administradora_id,
      c.tenant_id,
      c.cliente_administradora_id::text AS cliente_id,
      c.cliente_nome,
      c.cliente_email,
      c.cliente_telefone,
      p.valor_fatura,
      p.vencimento_fatura,
      p.status_fatura,
      p.numero_fatura,
      p.financeira_id_opcional,
      p.asaas_charge_id,
      left(coalesce(p.gateway_nome_opcional, 'Asaas'), 50) AS gateway_nome_trunc,
      p.boleto_url,
      p.asaas_boleto_url,
      p.asaas_invoice_url,
      p.asaas_payment_link
    FROM cliente c
    CROSS JOIN params p
    WHERE c.cliente_administradora_id IS NOT NULL
      AND p.valor_fatura > 0
      AND p.numero_fatura IS NOT NULL
      AND btrim(p.numero_fatura) <> ''
      AND p.asaas_charge_id IS NOT NULL
      AND btrim(p.asaas_charge_id) <> ''
      -- Só bloqueia o placeholder de exemplo (não use outro pay_ aqui — senão seu ID real é rejeitado)
      AND p.asaas_charge_id <> 'pay_SUBSTITUA_PELO_ID_REAL'
  ),
  ins AS (
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
      financeira_id,
      gateway_id,
      gateway_nome,
      asaas_charge_id,
      boleto_url,
      asaas_boleto_url,
      asaas_invoice_url,
      asaas_payment_link,
      created_at,
      updated_at
    )
    SELECT
      x.id,
      x.cliente_administradora_id,
      x.administradora_id,
      x.tenant_id,
      x.cliente_id,
      x.cliente_nome,
      x.cliente_email,
      x.cliente_telefone,
      x.valor_fatura,
      x.vencimento_fatura,
      x.status_fatura,
      x.numero_fatura,
      'Inserção manual: cobrança no Asaas ausente em faturas.',
      x.financeira_id_opcional,
      x.asaas_charge_id,
      x.gateway_nome_trunc,
      x.asaas_charge_id,
      x.boleto_url,
      x.asaas_boleto_url,
      x.asaas_invoice_url,
      x.asaas_payment_link,
      now(),
      now()
    FROM candidatos x
    RETURNING
      id,
      numero_fatura,
      asaas_charge_id,
      cliente_administradora_id
  )
SELECT
  (SELECT count(*)::int FROM cliente) AS qtd_cliente_cte,
  (SELECT count(*)::int FROM candidatos) AS candidatos_ok_para_insert,
  (SELECT count(*)::int FROM ins) AS linhas_gravadas,
  (SELECT id FROM ins LIMIT 1) AS id_inserido,
  (SELECT asaas_charge_id FROM ins LIMIT 1) AS pay_inserido,
  (SELECT numero_fatura FROM ins LIMIT 1) AS numero_inserido,
  (SELECT valor_fatura FROM params) AS diag_valor_em_params,
  (SELECT coalesce(btrim(numero_fatura), '') FROM params) AS diag_numero_fatura_em_params,
  (SELECT coalesce(asaas_charge_id, '') FROM params) AS diag_asaas_charge_id_em_params,
  (SELECT (valor_fatura > 0) FROM params) AS diag_valor_ok,
  (SELECT (numero_fatura IS NOT NULL AND btrim(numero_fatura) <> '') FROM params) AS diag_numero_ok,
  (SELECT (
      asaas_charge_id IS NOT NULL
      AND btrim(asaas_charge_id) <> ''
      AND asaas_charge_id <> 'pay_SUBSTITUA_PELO_ID_REAL'
    ) FROM params) AS diag_pay_ok,
  CASE
    WHEN (SELECT count(*) FROM cliente) = 0 THEN
      'Nenhum cliente: ajuste filtro_nome_ilike (passo 0b) OU defina cliente_administradora_id_opcional com UUID do titular.'
    WHEN (SELECT count(*) FROM candidatos) = 0 THEN
      'Cliente ok mas params não passam no filtro: veja diag_valor_ok, diag_numero_ok, diag_pay_ok e diag_*_em_params.'
    WHEN (SELECT count(*) FROM ins) = 0 THEN
      'Inesperado: candidatos>0 mas insert 0 linhas (constraint/trigger?).'
    ELSE
      'Fatura gravada em public.faturas.'
  END AS mensagem;

-- -----------------------------------------------------------------------------
-- 2) Conferir (id ou pay retornados acima)
-- -----------------------------------------------------------------------------
/*
SELECT id, numero_fatura, asaas_charge_id, status, valor, vencimento, created_at, tenant_id
FROM faturas
WHERE id = '...'::uuid;
*/

-- -----------------------------------------------------------------------------
-- Se vidas_importadas não tiver coluna cliente_administradora_id, rode no Supabase:
-- scripts/tornar-proposta-id-opcional-para-vidas.sql
-- -----------------------------------------------------------------------------
