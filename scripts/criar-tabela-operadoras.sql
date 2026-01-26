-- ============================================
-- SCRIPT DE CRIAÇÃO - TABELA DE OPERADORAS
-- ============================================
-- Este script cria a estrutura necessária para:
-- 1. Cadastro de operadoras de saúde
-- ============================================

-- ============================================
-- 1. TABELA DE OPERADORAS
-- ============================================
CREATE TABLE IF NOT EXISTS operadoras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  fantasia VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) NOT NULL,
  ans VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  cep VARCHAR(10) NOT NULL,
  endereco TEXT NOT NULL,
  numero VARCHAR(20),
  complemento VARCHAR(255),
  bairro VARCHAR(255),
  cidade VARCHAR(100) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  
  -- Metadados
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint para garantir CNPJ único por tenant
  CONSTRAINT unique_cnpj_per_tenant UNIQUE (cnpj, tenant_id)
);

-- ============================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_operadoras_tenant_id ON operadoras(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operadoras_cnpj ON operadoras(cnpj);
CREATE INDEX IF NOT EXISTS idx_operadoras_nome ON operadoras(nome);
CREATE INDEX IF NOT EXISTS idx_operadoras_uf ON operadoras(uf);
CREATE INDEX IF NOT EXISTS idx_operadoras_cidade ON operadoras(cidade);

-- ============================================
-- 3. TRIGGER PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_operadoras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_operadoras_updated_at_trigger ON operadoras;
CREATE TRIGGER update_operadoras_updated_at_trigger 
    BEFORE UPDATE ON operadoras 
    FOR EACH ROW EXECUTE FUNCTION update_operadoras_updated_at();

-- ============================================
-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE operadoras IS 'Tabela para cadastro de operadoras de saúde';
COMMENT ON COLUMN operadoras.nome IS 'Nome oficial da operadora';
COMMENT ON COLUMN operadoras.fantasia IS 'Nome fantasia da operadora';
COMMENT ON COLUMN operadoras.cnpj IS 'CNPJ da operadora (sem formatação)';
COMMENT ON COLUMN operadoras.ans IS 'Número de registro na ANS (Agência Nacional de Saúde Suplementar)';
COMMENT ON COLUMN operadoras.uf IS 'Unidade Federativa (estado) da operadora';

-- ============================================
-- ✅ Script executado com sucesso!
-- ============================================








