-- =============================================================================
-- Clube Ben vs Benefit: por grupo de beneficiários
-- =============================================================================
-- Todas as faturas cujo cliente_administradora_id está no grupo
-- "Unimed Campos": vidas com cliente_administradora_id, clientes_grupos, CPF
-- (fatura.cliente_id ou propostas.cpf ↔ vida.cpf), padrão IMP-{8 chars do id da vida}
-- em numero_contrato (gerar-boleto vida:), e fatura.cliente_id = uuid da vida (raro).
-- Demais faturas da administradora com cobrança Asaas → BENEFIT COBRANCAS.
--
-- gateway_nome = left('Asaas - ' || nome da financeira no cadastro, 50)
--   (igual lib/fatura-filtro-financeira.ts → gatewayAsaasComoNoBanco).
--
-- Ajuste se necessário: adm, nome_grupo_clube_ben, nome_financeira_clube, nome_financeira_benefit
-- =============================================================================

DO $$
DECLARE
  adm uuid := '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid;
  nome_grupo_clube_ben text := 'Unimed Campos';
  nome_financeira_clube text := 'CLUBE BEN';
  nome_financeira_benefit text := 'BENEFIT COBRANCAS';
  grupo_clube_id uuid;
  fin_clube uuid;
  fin_benef uuid;
  nome_clube text;
  nome_benef text;
  gw_clube text;
  gw_benef text;
  atualiz_clube int;
  atualiz_benef int;
  nomes_cad text;
  qtd_clientes_grupo int;
  nomes_grupos text;
BEGIN
  SELECT string_agg(btrim(nome), ' | ' ORDER BY nome) INTO nomes_cad
  FROM administradora_financeiras
  WHERE administradora_id = adm;

  SELECT af.id, btrim(af.nome)
  INTO fin_clube, nome_clube
  FROM administradora_financeiras af
  WHERE af.administradora_id = adm
    AND af.ativo = true
    AND lower(btrim(af.nome)) = lower(btrim(nome_financeira_clube))
  LIMIT 1;

  SELECT af.id, btrim(af.nome)
  INTO fin_benef, nome_benef
  FROM administradora_financeiras af
  WHERE af.administradora_id = adm
    AND af.ativo = true
    AND lower(btrim(af.nome)) = lower(btrim(nome_financeira_benefit))
  LIMIT 1;

  IF fin_clube IS NULL THEN
    RAISE EXCEPTION 'Financeira Clube não encontrada para nome "%". Cadastrados: %',
      nome_financeira_clube, nomes_cad;
  END IF;
  IF fin_benef IS NULL THEN
    RAISE EXCEPTION 'Financeira Benefit não encontrada para nome "%". Cadastrados: %',
      nome_financeira_benefit, nomes_cad;
  END IF;

  SELECT g.id INTO grupo_clube_id
  FROM grupos_beneficiarios g
  WHERE g.administradora_id = adm
    AND g.ativo = true
    AND lower(btrim(g.nome)) = lower(btrim(nome_grupo_clube_ben))
  LIMIT 1;

  IF grupo_clube_id IS NULL THEN
    SELECT string_agg(btrim(nome), ' | ' ORDER BY nome) INTO nomes_grupos
    FROM grupos_beneficiarios
    WHERE administradora_id = adm;
    RAISE EXCEPTION 'Grupo "%" não encontrado (ativo) nesta administradora. Grupos: %',
      nome_grupo_clube_ben, nomes_grupos;
  END IF;

  gw_clube := left(concat('Asaas - ', nome_clube), 50);
  gw_benef := left(concat('Asaas - ', nome_benef), 50);

  -- Clientes do grupo: vários vínculos (muitas faturas usam cliente_id = UUID do CA, não CPF).
  CREATE TEMP TABLE _clientes_grupo_clube ON COMMIT DROP AS
  SELECT DISTINCT x.cid
  FROM (
    SELECT v.cliente_administradora_id AS cid
    FROM vidas_importadas v
    WHERE v.administradora_id = adm
      AND v.grupo_id = grupo_clube_id
      AND v.cliente_administradora_id IS NOT NULL
    UNION
    SELECT cg.cliente_id AS cid
    FROM clientes_grupos cg
    WHERE cg.grupo_id = grupo_clube_id
      AND cg.cliente_tipo = 'cliente_administradora'
    UNION
    SELECT f.cliente_administradora_id AS cid
    FROM vidas_importadas v
    INNER JOIN faturas f ON f.administradora_id = adm
    WHERE v.administradora_id = adm
      AND v.grupo_id = grupo_clube_id
      AND length(regexp_replace(coalesce(v.cpf::text, ''), '\D', '', 'g')) BETWEEN 10 AND 11
      AND length(regexp_replace(coalesce(f.cliente_id::text, ''), '\D', '', 'g')) BETWEEN 10 AND 11
      AND lpad(regexp_replace(coalesce(f.cliente_id::text, ''), '\D', '', 'g'), 11, '0')
        = lpad(regexp_replace(coalesce(v.cpf::text, ''), '\D', '', 'g'), 11, '0')
    UNION
    SELECT f.cliente_administradora_id AS cid
    FROM vidas_importadas v
    INNER JOIN faturas f ON f.administradora_id = adm
    INNER JOIN clientes_administradoras ca ON ca.id = f.cliente_administradora_id AND ca.administradora_id = adm
    INNER JOIN propostas p ON p.id = ca.proposta_id
    WHERE v.administradora_id = adm
      AND v.grupo_id = grupo_clube_id
      AND v.tipo = 'titular'
      AND length(regexp_replace(coalesce(v.cpf::text, ''), '\D', '', 'g')) BETWEEN 10 AND 11
      AND length(regexp_replace(coalesce(p.cpf::text, ''), '\D', '', 'g')) BETWEEN 10 AND 11
      AND lpad(regexp_replace(coalesce(p.cpf::text, ''), '\D', '', 'g'), 11, '0')
        = lpad(regexp_replace(coalesce(v.cpf::text, ''), '\D', '', 'g'), 11, '0')
    UNION
    SELECT f.cliente_administradora_id AS cid
    FROM vidas_importadas v
    INNER JOIN faturas f ON f.administradora_id = adm
    INNER JOIN clientes_administradoras ca ON ca.id = f.cliente_administradora_id AND ca.administradora_id = adm
    WHERE v.administradora_id = adm
      AND v.grupo_id = grupo_clube_id
      AND v.tipo = 'titular'
      AND btrim(ca.numero_contrato) = ('IMP-' || substring(v.id::text from 1 for 8))
    UNION
    SELECT f.cliente_administradora_id AS cid
    FROM vidas_importadas v
    INNER JOIN faturas f ON f.administradora_id = adm
    WHERE v.administradora_id = adm
      AND v.grupo_id = grupo_clube_id
      AND v.tipo = 'titular'
      AND length(btrim(f.cliente_id::text)) = 36
      AND lower(btrim(f.cliente_id::text)) = lower(v.id::text)
  ) x
  WHERE x.cid IS NOT NULL;

  SELECT count(*)::int INTO qtd_clientes_grupo FROM _clientes_grupo_clube;
  RAISE NOTICE 'Grupo "%" (id %): % cliente(s)_administradora vinculado(s).', nome_grupo_clube_ben, grupo_clube_id, qtd_clientes_grupo;

  -- Todas as faturas desses clientes → CLUBE BEN
  UPDATE faturas f
  SET financeira_id = fin_clube, gateway_nome = gw_clube
  WHERE f.administradora_id = adm
    AND f.cliente_administradora_id IN (SELECT cid FROM _clientes_grupo_clube);

  GET DIAGNOSTICS atualiz_clube = ROW_COUNT;

  -- Demais faturas com cobrança Asaas → Benefit
  UPDATE faturas f
  SET financeira_id = fin_benef, gateway_nome = gw_benef
  WHERE f.administradora_id = adm
    AND (
      f.asaas_charge_id IS NOT NULL AND btrim(f.asaas_charge_id::text) <> ''
      OR f.gateway_id IS NOT NULL AND btrim(f.gateway_id::text) <> ''
    )
    AND (
      f.cliente_administradora_id IS NULL
      OR f.cliente_administradora_id NOT IN (SELECT cid FROM _clientes_grupo_clube)
    );

  GET DIAGNOSTICS atualiz_benef = ROW_COUNT;

  RAISE NOTICE 'Faturas atualizadas para Clube Ben (financeira %): %', nome_clube, atualiz_clube;
  RAISE NOTICE 'Faturas atualizadas para Benefit (financeira %): %', nome_benef, atualiz_benef;
END $$;

-- =============================================================================
-- Conferência
-- =============================================================================
SELECT
  f.gateway_nome,
  f.financeira_id,
  count(*)::bigint AS qtd
FROM faturas f
WHERE f.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid
  AND (f.asaas_charge_id IS NOT NULL OR f.gateway_id IS NOT NULL)
GROUP BY f.gateway_nome, f.financeira_id
ORDER BY qtd DESC;
