-- Diagnóstico: divergência entre cancelamentos em lote e contagem na ficha do grupo
-- Substitua :administradora_id e os nomes dos grupos antes de executar no Supabase SQL Editor.

-- 1) Cancelamentos recentes por grupo de ORIGEM (o que o lote registrou)
SELECT
  g.nome AS grupo_origem,
  c.status_fluxo,
  COUNT(*) AS qtd
FROM cancelamentos_beneficiarios c
JOIN grupos_beneficiarios g ON g.id = c.grupo_origem_id
WHERE c.administradora_id = :'administradora_id'
  AND c.data_solicitacao >= NOW() - INTERVAL '7 days'
GROUP BY g.nome, c.status_fluxo
ORDER BY g.nome, c.status_fluxo;

-- 2) Vidas inativas por grupo ATUAL (o que a ficha do grupo usava antes da correção)
SELECT
  g.nome AS grupo_atual_vida,
  COUNT(*) AS vidas_inativas
FROM vidas_importadas v
JOIN grupos_beneficiarios g ON g.id = v.grupo_id
WHERE v.administradora_id = :'administradora_id'
  AND v.ativo = false
GROUP BY g.nome
ORDER BY vidas_inativas DESC;

-- 3) Cancelamentos do lote cuja vida AINDA está ativa (insert OK, update da vida falhou)
SELECT COUNT(*) AS cancelamentos_vida_ainda_ativa
FROM cancelamentos_beneficiarios c
JOIN vidas_importadas v ON v.id = c.vida_id
WHERE c.administradora_id = :'administradora_id'
  AND c.status_fluxo = 'solicitado'
  AND c.data_solicitacao >= NOW() - INTERVAL '7 days'
  AND COALESCE(v.ativo, true) = true;

-- 4) Cancelamentos com grupo_origem diferente do grupo_id atual da vida
SELECT
  g_origem.nome AS grupo_origem_cancelamento,
  g_atual.nome AS grupo_atual_vida,
  COUNT(*) AS qtd
FROM cancelamentos_beneficiarios c
JOIN vidas_importadas v ON v.id = c.vida_id
LEFT JOIN grupos_beneficiarios g_origem ON g_origem.id = c.grupo_origem_id
LEFT JOIN grupos_beneficiarios g_atual ON g_atual.id = v.grupo_id
WHERE c.administradora_id = :'administradora_id'
  AND c.data_solicitacao >= NOW() - INTERVAL '7 days'
  AND c.grupo_origem_id IS DISTINCT FROM v.grupo_id
GROUP BY g_origem.nome, g_atual.nome
ORDER BY qtd DESC;

-- 5) Comparativo para um grupo específico (ex.: AURORA - APTI 1)
-- Troque o ILIKE pelo nome exato do grupo.
WITH alvo AS (
  SELECT id FROM grupos_beneficiarios
  WHERE administradora_id = :'administradora_id'
    AND nome ILIKE '%AURORA%APTI 1%'
  LIMIT 1
)
SELECT
  (SELECT COUNT(*) FROM cancelamentos_beneficiarios c, alvo a
   WHERE c.grupo_origem_id = a.id AND c.status_fluxo <> 'reativado') AS cancelamentos_grupo_origem,
  (SELECT COUNT(*) FROM vidas_importadas v, alvo a
   WHERE v.grupo_id = a.id AND v.ativo = false) AS vidas_inativas_grupo_atual,
  (SELECT COUNT(*) FROM cancelamentos_beneficiarios c
   JOIN vidas_importadas v ON v.id = c.vida_id, alvo a
   WHERE c.grupo_origem_id = a.id AND c.status_fluxo <> 'reativado'
     AND COALESCE(v.ativo, true) = true) AS cancelamentos_com_vida_ainda_ativa;
