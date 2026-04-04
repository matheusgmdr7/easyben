-- Garante faturas.gateway_nome (filtro por financeira no dashboard e relatórios).
-- Se você já rodou scripts/adicionar-colunas-boleto-faturas.sql atualizado, pode ignorar este arquivo.
-- Execute no Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'gateway_nome'
  ) THEN
    ALTER TABLE faturas ADD COLUMN gateway_nome VARCHAR(50);
    RAISE NOTICE 'Coluna faturas.gateway_nome criada';
  ELSE
    RAISE NOTICE 'Coluna faturas.gateway_nome já existe';
  END IF;
END $$;

COMMENT ON COLUMN faturas.gateway_nome IS 'Identificação da conta gateway (ex: Asaas - Nome financeira), para filtro multi-financeira';
