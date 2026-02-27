-- Adiciona coluna nativa "plano" em vidas_importadas (nome do plano cadastrado na importação).
-- Alinha com o que aparece em Dados básicos > Dados adicionais > Plano e na geração de fatura.
-- Execute no Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vidas_importadas' AND column_name = 'plano') THEN
    ALTER TABLE vidas_importadas ADD COLUMN plano VARCHAR(150);
    RAISE NOTICE 'Coluna vidas_importadas.plano criada';
  END IF;
  RAISE NOTICE 'Coluna plano em vidas_importadas conferida.';
END $$;

COMMENT ON COLUMN vidas_importadas.plano IS 'Nome do plano (ex: NACIONAL) cadastrado na importação; mesmo valor exibido em Dados básicos do beneficiário';

-- Opcional: preencher plano a partir de dados_adicionais->>'Plano' ou dados_adicionais->>'plano' onde plano estiver vazio
-- UPDATE vidas_importadas
-- SET plano = COALESCE(NULLIF(TRIM(plano), ''), dados_adicionais->>'Plano', dados_adicionais->>'plano')
-- WHERE (plano IS NULL OR TRIM(plano) = '') AND dados_adicionais IS NOT NULL;
