-- Adiciona coluna ativo à tabela vidas_importadas (default true)
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vidas_importadas' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE vidas_importadas ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true;
    RAISE NOTICE 'Coluna ativo adicionada em vidas_importadas';
  ELSE
    RAISE NOTICE 'Coluna ativo já existe em vidas_importadas';
  END IF;
END $$;
