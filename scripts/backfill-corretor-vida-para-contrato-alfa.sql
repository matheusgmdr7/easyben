-- Backfill: copia corretor_id de vidas_importadas → clientes_administradoras
-- quando o contrato está sem corretor e a vida vinculada tem corretor preenchido.
-- Escopo: Alfa Seguros (ajuste o UUID se necessário).

-- Administradora: Alfa Seguros
-- id: 81b2fd0f-0289-41fb-a140-db5af26011e9

BEGIN;

UPDATE clientes_administradoras AS ca
SET
  corretor_id = sub.corretor_id,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (v.cliente_administradora_id)
    v.cliente_administradora_id,
    v.corretor_id
  FROM vidas_importadas AS v
  WHERE v.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'
    AND v.cliente_administradora_id IS NOT NULL
    AND v.corretor_id IS NOT NULL
  ORDER BY
    v.cliente_administradora_id,
    CASE WHEN lower(coalesce(v.tipo, '')) = 'titular' THEN 0 ELSE 1 END,
    v.updated_at DESC NULLS LAST,
    v.created_at DESC NULLS LAST
) AS sub
WHERE ca.id = sub.cliente_administradora_id
  AND ca.administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9'
  AND ca.corretor_id IS NULL;

COMMIT;

-- Conferência (rode separadamente após o UPDATE):
-- SELECT count(*) FROM clientes_administradoras
-- WHERE administradora_id = '81b2fd0f-0289-41fb-a140-db5af26011e9' AND corretor_id IS NOT NULL;
