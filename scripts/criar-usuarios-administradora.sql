-- Usuários do portal /administradora (sub-usuários por empresa)
CREATE TABLE IF NOT EXISTS usuarios_administradora (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  perfil VARCHAR(50) NOT NULL DEFAULT 'customizado',
  is_master BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  permissoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acesso TIMESTAMPTZ,
  criado_por UUID REFERENCES usuarios_administradora(id) ON DELETE SET NULL,
  UNIQUE (administradora_id, email)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_administradora_adm ON usuarios_administradora(administradora_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_administradora_email ON usuarios_administradora(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_administradora_status ON usuarios_administradora(status);

DROP TRIGGER IF EXISTS update_usuarios_administradora_updated_at ON usuarios_administradora;

CREATE OR REPLACE FUNCTION update_usuarios_administradora_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_administradora_updated_at
  BEFORE UPDATE ON usuarios_administradora
  FOR EACH ROW
  EXECUTE FUNCTION update_usuarios_administradora_atualizado_em();

COMMENT ON TABLE usuarios_administradora IS 'Sub-usuários do portal administradora com permissões por módulo';
