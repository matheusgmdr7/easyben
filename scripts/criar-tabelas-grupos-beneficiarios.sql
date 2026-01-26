-- Criar estrutura de banco de dados para Grupos de Beneficiários
-- Execute este script no Supabase SQL Editor

-- 1. Tabela de Contas Cedentes (contas bancárias para faturamento)
CREATE TABLE IF NOT EXISTS contas_cedentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    banco VARCHAR(100) NOT NULL,
    agencia VARCHAR(20) NOT NULL,
    conta VARCHAR(50) NOT NULL,
    tipo_conta VARCHAR(20) NOT NULL CHECK (tipo_conta IN ('corrente', 'poupanca')),
    cpf_cnpj VARCHAR(20),
    nome_titular VARCHAR(255) NOT NULL,
    codigo_cedente VARCHAR(50),
    carteira VARCHAR(20),
    convenio VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(administradora_id, banco, agencia, conta)
);

-- 2. Tabela de Configurações de Faturamento
CREATE TABLE IF NOT EXISTS configuracao_faturamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    tipo_faturamento VARCHAR(50) NOT NULL CHECK (tipo_faturamento IN ('asaas', 'banco', 'manual')),
    -- Configurações para Asaas
    asaas_api_key TEXT,
    asaas_ambiente VARCHAR(20) CHECK (asaas_ambiente IN ('producao', 'sandbox')),
    -- Configurações para Banco
    conta_cedente_id UUID REFERENCES contas_cedentes(id) ON DELETE SET NULL,
    banco_codigo VARCHAR(10), -- Código do banco (ex: 001 para Banco do Brasil)
    banco_nome VARCHAR(100),
    -- Configurações gerais
    dias_vencimento INTEGER DEFAULT 30,
    instrucoes_boleto TEXT,
    ativo BOOLEAN DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Grupos de Beneficiários
CREATE TABLE IF NOT EXISTS grupos_beneficiarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    configuracao_faturamento_id UUID REFERENCES configuracao_faturamento(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    UNIQUE(administradora_id, nome)
);

-- 4. Tabela de Relação Cliente-Grupo (muitos para muitos)
CREATE TABLE IF NOT EXISTS clientes_grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos_beneficiarios(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL, -- Pode referenciar diferentes tabelas de clientes
    cliente_tipo VARCHAR(50) NOT NULL CHECK (cliente_tipo IN ('proposta', 'cliente_administradora')),
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(grupo_id, cliente_id, cliente_tipo)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_contas_cedentes_administradora ON contas_cedentes(administradora_id);
CREATE INDEX IF NOT EXISTS idx_contas_cedentes_ativo ON contas_cedentes(ativo);
CREATE INDEX IF NOT EXISTS idx_configuracao_faturamento_tipo ON configuracao_faturamento(tipo_faturamento);
CREATE INDEX IF NOT EXISTS idx_configuracao_faturamento_ativo ON configuracao_faturamento(ativo);
CREATE INDEX IF NOT EXISTS idx_grupos_beneficiarios_administradora ON grupos_beneficiarios(administradora_id);
CREATE INDEX IF NOT EXISTS idx_grupos_beneficiarios_ativo ON grupos_beneficiarios(ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_grupos_grupo ON clientes_grupos(grupo_id);
CREATE INDEX IF NOT EXISTS idx_clientes_grupos_cliente ON clientes_grupos(cliente_id, cliente_tipo);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contas_cedentes_updated_at ON contas_cedentes;
CREATE TRIGGER update_contas_cedentes_updated_at 
    BEFORE UPDATE ON contas_cedentes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracao_faturamento_updated_at ON configuracao_faturamento;
CREATE TRIGGER update_configuracao_faturamento_updated_at 
    BEFORE UPDATE ON configuracao_faturamento 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grupos_beneficiarios_updated_at ON grupos_beneficiarios;
CREATE TRIGGER update_grupos_beneficiarios_updated_at 
    BEFORE UPDATE ON grupos_beneficiarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE contas_cedentes IS 'Contas bancárias cedentes para geração de boletos';
COMMENT ON TABLE configuracao_faturamento IS 'Configurações de faturamento (Asaas, Bancos, Manual)';
COMMENT ON TABLE grupos_beneficiarios IS 'Grupos de beneficiários (clientes) da administradora';
COMMENT ON TABLE clientes_grupos IS 'Relação entre clientes e grupos de beneficiários';







