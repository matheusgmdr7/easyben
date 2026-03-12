-- Opções de vencimento/vigência por contrato + unicidade de número por administradora.
-- Execute no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS contratos_opcoes_administradora (
  contrato_id UUID PRIMARY KEY REFERENCES contratos_administradora(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  opcoes_dia_vencimento JSONB NOT NULL DEFAULT '[]'::jsonb,
  opcoes_data_vigencia JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_opcoes_tenant
  ON contratos_opcoes_administradora(tenant_id);

CREATE OR REPLACE FUNCTION update_contratos_opcoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contratos_opcoes_updated ON contratos_opcoes_administradora;
CREATE TRIGGER trg_contratos_opcoes_updated
  BEFORE UPDATE ON contratos_opcoes_administradora
  FOR EACH ROW EXECUTE FUNCTION update_contratos_opcoes_updated_at();

-- Garante unicidade de número por administradora para permitir geração sequencial segura.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contrato_numero_por_administradora
  ON contratos_administradora(administradora_id, numero);
