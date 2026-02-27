-- Adiciona a coluna bairro à tabela vidas_importadas (e demais colunas de endereço/contato se faltando).
-- Erro: "Could not find the 'bairro' column of 'vidas_importadas' in the schema cache"
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vidas_importadas' AND column_name = 'bairro') THEN
    ALTER TABLE vidas_importadas ADD COLUMN bairro VARCHAR(100);
    RAISE NOTICE 'Coluna bairro adicionada em vidas_importadas.';
  ELSE
    RAISE NOTICE 'Coluna bairro já existe em vidas_importadas.';
  END IF;
END $$;
