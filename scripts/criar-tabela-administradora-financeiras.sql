-- Tabela: empresas financeiras por administradora (conta/API para geração de boletos)
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS administradora_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  instituicao_financeira TEXT NOT NULL DEFAULT 'asaas',
  api_key TEXT,
  api_token TEXT,
  ambiente TEXT NOT NULL DEFAULT 'producao',
  status_integracao TEXT NOT NULL DEFAULT 'inativa',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_administradora_financeiras_administradora
  ON administradora_financeiras(administradora_id);
CREATE INDEX IF NOT EXISTS idx_administradora_financeiras_tenant
  ON administradora_financeiras(tenant_id);
CREATE INDEX IF NOT EXISTS idx_administradora_financeiras_ativo
  ON administradora_financeiras(ativo);

COMMENT ON TABLE administradora_financeiras IS 'Empresas financeiras (contas API) por administradora para geração de boletos no portal';

-- Trigger updated_at (usa a função update_updated_at_column se já existir no banco)
DROP TRIGGER IF EXISTS update_administradora_financeiras_updated_at ON administradora_financeiras;
CREATE TRIGGER update_administradora_financeiras_updated_at
  BEFORE UPDATE ON administradora_financeiras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
