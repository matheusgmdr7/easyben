-- Adiciona coluna valor_mensal à tabela vidas_importadas
-- O valor é calculado com base na idade do cliente e na tabela/faixas do produto vinculado.
-- Execute no Supabase SQL Editor.
-- Após adicionar a coluna, os valores serão calculados automaticamente na importação e ao editar.
-- Para vidas já importadas, use o botão "Atualizar valor" no modal do cliente ou edite e salve.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vidas_importadas' AND column_name = 'valor_mensal'
  ) THEN
    ALTER TABLE vidas_importadas ADD COLUMN valor_mensal DECIMAL(12,2);
    RAISE NOTICE 'Coluna valor_mensal adicionada à tabela vidas_importadas';
  ELSE
    RAISE NOTICE 'Coluna valor_mensal já existe';
  END IF;
END $$;
