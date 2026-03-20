-- Recalcula e salva idade em vidas_importadas com base na data_nascimento
-- Idade de referência: data atual (CURRENT_DATE)
-- Útil para registros antigos importados sem coluna de idade.

-- Prévia antes do update
SELECT
  id,
  nome,
  cpf,
  data_nascimento,
  idade AS idade_atual,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_nascimento::date))::int AS idade_recalculada
FROM vidas_importadas
WHERE
  data_nascimento IS NOT NULL
  AND (
    idade IS NULL
    OR idade < 0
    OR idade > 120
  )
ORDER BY nome;

-- Update
UPDATE vidas_importadas
SET idade = EXTRACT(YEAR FROM AGE(CURRENT_DATE, data_nascimento::date))::int
WHERE
  data_nascimento IS NOT NULL
  AND (
    idade IS NULL
    OR idade < 0
    OR idade > 120
  );
