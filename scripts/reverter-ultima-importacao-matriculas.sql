-- =============================================================================
-- Reverter a ULTIMA importacao de matriculas (vias vidas_importadas_historico)
-- =============================================================================
-- COMO USAR:
-- 1) Rode com executar_reversao = false para PREVIEW.
-- 2) Confira a quantidade e alguns IDs afetados.
-- 3) Troque para executar_reversao = true e rode novamente.
--
-- Observacao:
-- - Este script reverte apenas alteracoes registradas com
--   alteracoes.importacao_matriculas (origem: "importacao-matriculas").
-- - Atualizacoes feitas apenas em clientes_administradoras (sem vida vinculada)
--   e sem historico correspondente nao sao revertidas por este script.
-- =============================================================================

DO $$
DECLARE
  v_administradora_id uuid := '81b2fd0f-0289-41fb-a140-db5af26011e9'::uuid; -- ajuste se necessario
  executar_reversao boolean := false; -- mude para true para aplicar
  janela_minutos int := 60; -- ultima importacao deve estar dentro desta janela

  qtd_hist int := 0;
  qtd_vidas int := 0;
  qtd_clientes int := 0;
BEGIN
  CREATE TEMP TABLE _ultima_importacao_hist ON COMMIT DROP AS
  WITH base AS (
    SELECT
      h.id,
      h.vida_id,
      h.created_at,
      v.administradora_id,
      v.cliente_administradora_id,
      (h.alteracoes -> 'importacao_matriculas' ->> 'antes') AS matricula_antes,
      (h.alteracoes -> 'importacao_matriculas' ->> 'depois') AS matricula_depois
    FROM vidas_importadas_historico h
    INNER JOIN vidas_importadas v ON v.id = h.vida_id
    WHERE v.administradora_id = v_administradora_id
      AND (h.alteracoes ? 'importacao_matriculas')
      AND coalesce(h.alteracoes -> 'importacao_matriculas' ->> 'origem', '') = 'importacao-matriculas'
  ),
  ultimo AS (
    SELECT max(created_at) AS ts_ultimo
    FROM base
    WHERE created_at >= (now() - make_interval(mins => janela_minutos))
  )
  SELECT b.*
  FROM base b
  CROSS JOIN ultimo u
  WHERE u.ts_ultimo IS NOT NULL
    AND b.created_at BETWEEN (u.ts_ultimo - interval '10 minutes') AND u.ts_ultimo;

  SELECT count(*)::int INTO qtd_hist FROM _ultima_importacao_hist;
  SELECT count(DISTINCT vida_id)::int INTO qtd_vidas FROM _ultima_importacao_hist;
  SELECT count(DISTINCT cliente_administradora_id)::int
    INTO qtd_clientes
  FROM _ultima_importacao_hist
  WHERE cliente_administradora_id IS NOT NULL;

  RAISE NOTICE 'Preview: % linha(s) de historico, % vida(s), % cliente(s).', qtd_hist, qtd_vidas, qtd_clientes;

  IF qtd_hist = 0 THEN
    RAISE EXCEPTION 'Nenhuma importacao recente encontrada para a administradora % na janela de % minuto(s).',
      v_administradora_id, janela_minutos;
  END IF;

  IF NOT executar_reversao THEN
    RAISE NOTICE 'PREVIEW somente. Defina executar_reversao = true para aplicar a reversao.';
    RETURN;
  END IF;

  -- 1) Reverte numero_carteirinha em vidas_importadas (dados_adicionais)
  UPDATE vidas_importadas v
  SET dados_adicionais =
    CASE
      WHEN u.matricula_antes IS NULL OR btrim(u.matricula_antes) = '' THEN
        coalesce(v.dados_adicionais, '{}'::jsonb) - 'numero_carteirinha'
      ELSE
        jsonb_set(
          coalesce(v.dados_adicionais, '{}'::jsonb),
          '{numero_carteirinha}',
          to_jsonb(u.matricula_antes::text),
          true
        )
    END
  FROM (
    SELECT DISTINCT ON (vida_id)
      vida_id,
      matricula_antes
    FROM _ultima_importacao_hist
    ORDER BY vida_id, created_at DESC
  ) u
  WHERE v.id = u.vida_id
    AND v.administradora_id = v_administradora_id;

  GET DIAGNOSTICS qtd_vidas = ROW_COUNT;

  -- 2) Sincroniza clientes_administradoras vinculados nessas vidas
  UPDATE clientes_administradoras ca
  SET numero_carteirinha = NULLIF(btrim(u.matricula_antes), '')
  FROM (
    SELECT DISTINCT ON (h.cliente_administradora_id)
      h.cliente_administradora_id,
      h.matricula_antes
    FROM _ultima_importacao_hist h
    WHERE h.cliente_administradora_id IS NOT NULL
    ORDER BY h.cliente_administradora_id, h.created_at DESC
  ) u
  WHERE ca.id = u.cliente_administradora_id
    AND ca.administradora_id = v_administradora_id;

  GET DIAGNOSTICS qtd_clientes = ROW_COUNT;

  RAISE NOTICE 'Reversao aplicada. Vidas atualizadas: % | Clientes atualizados: %', qtd_vidas, qtd_clientes;
END $$;

