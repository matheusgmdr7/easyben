-- Campos adicionais (JSONB) e corretor em vidas_importadas
-- Execute no Supabase SQL Editor

-- 1. dados_adicionais: armazena campos extras mapeados na importação (chave/valor)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'dados_adicionais') THEN
    ALTER TABLE vidas_importadas ADD COLUMN dados_adicionais JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Coluna vidas_importadas.dados_adicionais criada';
  END IF;
END $$;

-- 2. corretor_id: vincular beneficiário (vida) a um corretor da administradora
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'corretores_administradora') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'corretor_id') THEN
      ALTER TABLE vidas_importadas
        ADD COLUMN corretor_id UUID REFERENCES corretores_administradora(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_vidas_importadas_corretor ON vidas_importadas(corretor_id);
      RAISE NOTICE 'Coluna vidas_importadas.corretor_id criada';
    END IF;
  ELSE
    RAISE NOTICE 'Execute antes: scripts/criar-tabela-corretores-administradora.sql';
  END IF;
END $$;

COMMENT ON COLUMN vidas_importadas.dados_adicionais IS 'Campos extras da planilha mapeados em "Adicionar campo" na importação';
COMMENT ON COLUMN vidas_importadas.corretor_id IS 'Corretor da administradora vinculado a este beneficiário';
