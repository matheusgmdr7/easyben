-- Normaliza CPF e CPF do titular em vidas_importadas para 11 dígitos
-- Regras:
-- 1) Remove qualquer caractere não numérico
-- 2) Mantém os 11 últimos dígitos (quando houver mais de 11)
-- 3) Completa com zero à esquerda quando houver menos de 11

-- Prévia: confira antes de atualizar
SELECT
  id,
  cpf AS cpf_atual,
  LPAD(RIGHT(REGEXP_REPLACE(COALESCE(cpf, ''), '\D', '', 'g'), 11), 11, '0') AS cpf_normalizado,
  cpf_titular AS cpf_titular_atual,
  LPAD(RIGHT(REGEXP_REPLACE(COALESCE(cpf_titular, ''), '\D', '', 'g'), 11), 11, '0') AS cpf_titular_normalizado
FROM vidas_importadas
WHERE
  (
    REGEXP_REPLACE(COALESCE(cpf, ''), '\D', '', 'g') <> ''
    AND COALESCE(cpf, '') <> LPAD(RIGHT(REGEXP_REPLACE(COALESCE(cpf, ''), '\D', '', 'g'), 11), 11, '0')
  )
  OR
  (
    REGEXP_REPLACE(COALESCE(cpf_titular, ''), '\D', '', 'g') <> ''
    AND COALESCE(cpf_titular, '') <> LPAD(RIGHT(REGEXP_REPLACE(COALESCE(cpf_titular, ''), '\D', '', 'g'), 11), 11, '0')
  );

-- Atualização
UPDATE vidas_importadas
SET
  cpf = CASE
    WHEN REGEXP_REPLACE(COALESCE(cpf, ''), '\D', '', 'g') = '' THEN cpf
    ELSE LPAD(RIGHT(REGEXP_REPLACE(COALESCE(cpf, ''), '\D', '', 'g'), 11), 11, '0')
  END,
  cpf_titular = CASE
    WHEN REGEXP_REPLACE(COALESCE(cpf_titular, ''), '\D', '', 'g') = '' THEN cpf_titular
    ELSE LPAD(RIGHT(REGEXP_REPLACE(COALESCE(cpf_titular, ''), '\D', '', 'g'), 11), 11, '0')
  END
WHERE
  (
    REGEXP_REPLACE(COALESCE(cpf, ''), '\D', '', 'g') <> ''
    AND COALESCE(cpf, '') <> LPAD(RIGHT(REGEXP_REPLACE(COALESCE(cpf, ''), '\D', '', 'g'), 11), 11, '0')
  )
  OR
  (
    REGEXP_REPLACE(COALESCE(cpf_titular, ''), '\D', '', 'g') <> ''
    AND COALESCE(cpf_titular, '') <> LPAD(RIGHT(REGEXP_REPLACE(COALESCE(cpf_titular, ''), '\D', '', 'g'), 11), 11, '0')
  );
