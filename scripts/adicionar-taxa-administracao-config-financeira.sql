-- Adiciona coluna taxa_administracao na configuração financeira da administradora
-- (usada ao gerar boleto: valor total = valor titular + dependentes + taxa_administracao)
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'administradoras_config_financeira' AND column_name = 'taxa_administracao'
  ) THEN
    ALTER TABLE administradoras_config_financeira
      ADD COLUMN taxa_administracao DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE 'Coluna taxa_administracao adicionada em administradoras_config_financeira';
  ELSE
    RAISE NOTICE 'Coluna taxa_administracao já existe';
  END IF;
END $$;

COMMENT ON COLUMN administradoras_config_financeira.taxa_administracao IS 'Taxa de administração (R$) somada ao valor do boleto (titular + dependentes)';
