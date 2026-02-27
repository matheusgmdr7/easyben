-- Corretores cadastrados pela administradora (para vincular clientes)
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS corretores_administradora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  tenant_id UUID,

  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(50),
  ativo BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corretores_administradora_administradora ON corretores_administradora(administradora_id);
CREATE INDEX IF NOT EXISTS idx_corretores_administradora_tenant ON corretores_administradora(tenant_id);
CREATE INDEX IF NOT EXISTS idx_corretores_administradora_ativo ON corretores_administradora(ativo);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_corretores_administradora_updated ON corretores_administradora;
CREATE TRIGGER trg_corretores_administradora_updated
  BEFORE UPDATE ON corretores_administradora
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE corretores_administradora IS 'Corretores da administradora; clientes podem ser vinculados a um corretor em clientes_administradoras.corretor_id';

-- Adicionar coluna corretor_id em clientes_administradoras (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes_administradoras' AND column_name = 'corretor_id') THEN
      ALTER TABLE clientes_administradoras
        ADD COLUMN corretor_id UUID REFERENCES corretores_administradora(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_clientes_administradoras_corretor ON clientes_administradoras(corretor_id);
      RAISE NOTICE 'Coluna clientes_administradoras.corretor_id criada';
    END IF;
  END IF;
END $$;
