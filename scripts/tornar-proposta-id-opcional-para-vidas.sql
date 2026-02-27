-- Permite gerar fatura para beneficiários importados (vidas) sem proposta.
-- Execute no Supabase SQL Editor ANTES de usar Fatura > Gerar para grupos com vidas importadas.

DO $$
BEGIN
  -- 1. vidas_importadas: coluna para vincular ao cliente criado ao gerar primeiro boleto
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vidas_importadas' AND column_name = 'cliente_administradora_id'
  ) THEN
    ALTER TABLE vidas_importadas
    ADD COLUMN cliente_administradora_id UUID NULL
    REFERENCES clientes_administradoras(id) ON DELETE SET NULL;
    RAISE NOTICE 'Coluna vidas_importadas.cliente_administradora_id criada';
  END IF;

  -- 2. clientes_administradoras: proposta_id opcional (para clientes criados a partir de vida importada)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes_administradoras' AND column_name = 'proposta_id'
  ) THEN
    ALTER TABLE clientes_administradoras ALTER COLUMN proposta_id DROP NOT NULL;
    RAISE NOTICE 'clientes_administradoras.proposta_id agora aceita NULL';
  ELSE
    RAISE NOTICE 'clientes_administradoras.proposta_id não existe ou já é opcional';
  END IF;

  -- 3. faturas: proposta_id opcional (quando fatura é de vida importada) — só altera se a coluna existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'proposta_id'
  ) THEN
    ALTER TABLE faturas ALTER COLUMN proposta_id DROP NOT NULL;
    RAISE NOTICE 'faturas.proposta_id agora aceita NULL';
  ELSE
    RAISE NOTICE 'faturas.proposta_id não existe (tabela faturas pode ter estrutura diferente)';
  END IF;
END $$;
