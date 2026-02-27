-- Adiciona coluna acomodacao à tabela vidas_importadas (Enfermaria / Apartamento).
-- Usado na importação de vidas e no faturamento para calcular valor pela faixa correta do produto.
-- Execute no Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'acomodacao') THEN
    ALTER TABLE vidas_importadas ADD COLUMN acomodacao VARCHAR(50) DEFAULT 'Enfermaria';
    RAISE NOTICE 'Coluna acomodacao adicionada em vidas_importadas.';
  ELSE
    RAISE NOTICE 'Coluna acomodacao já existe em vidas_importadas.';
  END IF;
END $$;

COMMENT ON COLUMN vidas_importadas.acomodacao IS 'Tipo de acomodação do beneficiário no produto: Enfermaria ou Apartamento (usado no cálculo do valor por faixa etária)';
