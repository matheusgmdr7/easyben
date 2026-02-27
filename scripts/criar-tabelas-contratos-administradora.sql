-- ============================================
-- CONTRATOS E PRODUTOS DA ADMINISTRADORA
-- ============================================
-- Contratos criados em /administradora/contrato/novo e seus produtos.
-- Os produtos aparecem na Importação de vidas para vincular às vidas importadas.
-- Execute no Supabase SQL Editor.
-- ============================================

-- 1. CONTRATOS DA ADMINISTRADORA
CREATE TABLE IF NOT EXISTS contratos_administradora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  operadora_id UUID REFERENCES operadoras(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Dados do formulário (operadora pode ser null se cadastrada "inline")
  cnpj_operadora VARCHAR(18),
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  logo TEXT,

  descricao TEXT NOT NULL,
  numero VARCHAR(100) NOT NULL,
  observacao TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_adm_administradora ON contratos_administradora(administradora_id);
CREATE INDEX IF NOT EXISTS idx_contratos_adm_operadora ON contratos_administradora(operadora_id);
CREATE INDEX IF NOT EXISTS idx_contratos_adm_tenant ON contratos_administradora(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contratos_adm_numero ON contratos_administradora(numero);

-- 2. PRODUTOS DO CONTRATO (planos com faixas etárias)
CREATE TABLE IF NOT EXISTS produtos_contrato_administradora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos_administradora(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  nome VARCHAR(255) NOT NULL,
  segmentacao VARCHAR(50) DEFAULT 'Padrão',
  acomodacao VARCHAR(50) DEFAULT 'Enfermaria',

  -- Faixas etárias com valores: [{"faixa_etaria":"0-18","valor":"150.00"}, ...]
  faixas JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_contrato_contrato ON produtos_contrato_administradora(contrato_id);
CREATE INDEX IF NOT EXISTS idx_produtos_contrato_tenant ON produtos_contrato_administradora(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_contrato_nome ON produtos_contrato_administradora(nome);

-- 3. RLS (opcional - usar políticas adequadas ao seu tenant)
-- Comentado por padrão; ative se usar RLS na aplicação
/*
ALTER TABLE contratos_administradora ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos_contrato_administradora ENABLE ROW LEVEL SECURITY;
*/

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION update_contratos_administradora_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contratos_adm_updated ON contratos_administradora;
CREATE TRIGGER trg_contratos_adm_updated
  BEFORE UPDATE ON contratos_administradora
  FOR EACH ROW EXECUTE FUNCTION update_contratos_administradora_updated_at();

DROP TRIGGER IF EXISTS trg_produtos_contrato_adm_updated ON produtos_contrato_administradora;
CREATE TRIGGER trg_produtos_contrato_adm_updated
  BEFORE UPDATE ON produtos_contrato_administradora
  FOR EACH ROW EXECUTE FUNCTION update_contratos_administradora_updated_at();

COMMENT ON TABLE contratos_administradora IS 'Contratos cadastrados em /administradora/contrato/novo';
COMMENT ON TABLE produtos_contrato_administradora IS 'Produtos (planos) de cada contrato, usados na Importação de vidas';

-- ============================================
-- OPCIONAL: Se a tabela operadoras exigir ans, cep, endereco, cidade, uf NOT NULL
-- e o cadastro via contrato/novo falhar, execute:
-- ALTER TABLE operadoras ALTER COLUMN ans DROP NOT NULL;
-- ALTER TABLE operadoras ALTER COLUMN cep DROP NOT NULL;
-- ALTER TABLE operadoras ALTER COLUMN endereco DROP NOT NULL;
-- ALTER TABLE operadoras ALTER COLUMN cidade DROP NOT NULL;
-- ALTER TABLE operadoras ALTER COLUMN uf DROP NOT NULL;
-- (A API usa placeholders: ans='0', cep='00000000', etc. se as colunas forem NOT NULL)
