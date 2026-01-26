-- ============================================
-- SCRIPT DE CRIAÇÃO - TABELA DE ENTIDADES
-- ============================================
-- Este script cria a estrutura necessária para:
-- 1. Cadastro de entidades
-- ============================================

-- ============================================
-- 1. TABELA DE ENTIDADES
-- ============================================
CREATE TABLE IF NOT EXISTS entidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sigla VARCHAR(10) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  
  -- Metadados
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint para garantir sigla única por tenant
  CONSTRAINT unique_sigla_per_tenant UNIQUE (sigla, tenant_id)
);

-- ============================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_entidades_tenant_id ON entidades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entidades_sigla ON entidades(sigla);
CREATE INDEX IF NOT EXISTS idx_entidades_nome ON entidades(nome);

-- ============================================
-- 3. TRIGGER PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_entidades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_entidades_updated_at_trigger ON entidades;
CREATE TRIGGER update_entidades_updated_at_trigger 
    BEFORE UPDATE ON entidades 
    FOR EACH ROW EXECUTE FUNCTION update_entidades_updated_at();

-- ============================================
-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE entidades IS 'Tabela para cadastro de entidades';
COMMENT ON COLUMN entidades.sigla IS 'Sigla da entidade (até 10 caracteres)';
COMMENT ON COLUMN entidades.nome IS 'Nome completo da entidade';

-- ============================================
-- ✅ Script executado com sucesso!
-- ============================================








