-- Permite vincular uma vida importada a um cliente_administradora (criado ao gerar o primeiro boleto)
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vidas_importadas' AND column_name = 'cliente_administradora_id'
  ) THEN
    ALTER TABLE vidas_importadas
    ADD COLUMN cliente_administradora_id UUID NULL
    REFERENCES clientes_administradoras(id) ON DELETE SET NULL;
    RAISE NOTICE 'Coluna vidas_importadas.cliente_administradora_id criada';
  ELSE
    RAISE NOTICE 'Coluna vidas_importadas.cliente_administradora_id já existe';
  END IF;
END $$;
