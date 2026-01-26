-- Criar tabela para armazenar autorizações de tabelas para corretoras (gestores)
-- Nota: corretores.id é BIGINT, não UUID
CREATE TABLE IF NOT EXISTS tabela_corretora_autorizacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela_id UUID NOT NULL REFERENCES tabelas_precos(id) ON DELETE CASCADE,
  corretora_id BIGINT NOT NULL REFERENCES corretores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tabela_id, corretora_id, tenant_id)
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_tabela_corretora_autorizacao_tabela_id ON tabela_corretora_autorizacao(tabela_id);
CREATE INDEX IF NOT EXISTS idx_tabela_corretora_autorizacao_corretora_id ON tabela_corretora_autorizacao(corretora_id);
CREATE INDEX IF NOT EXISTS idx_tabela_corretora_autorizacao_tenant_id ON tabela_corretora_autorizacao(tenant_id);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tabela_corretora_autorizacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tabela_corretora_autorizacao_updated_at
BEFORE UPDATE ON tabela_corretora_autorizacao
FOR EACH ROW
EXECUTE FUNCTION update_tabela_corretora_autorizacao_updated_at();

-- Comentários para documentação
COMMENT ON TABLE tabela_corretora_autorizacao IS 'Armazena autorizações de tabelas de preços para corretoras (gestores). Corretores vinculados a gestores autorizados também terão acesso.';
COMMENT ON COLUMN tabela_corretora_autorizacao.tabela_id IS 'ID da tabela de preços';
COMMENT ON COLUMN tabela_corretora_autorizacao.corretora_id IS 'ID da corretora (gestor) autorizada';
COMMENT ON COLUMN tabela_corretora_autorizacao.tenant_id IS 'ID do tenant (multi-tenancy)';

