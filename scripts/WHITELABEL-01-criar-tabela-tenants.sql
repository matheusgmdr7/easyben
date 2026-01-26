-- ============================================
-- SCRIPT 1: CRIAR TABELA DE TENANTS
-- ============================================
-- Este script cria a estrutura base para multi-tenancy
-- Execute este script PRIMEIRO antes de qualquer migração
-- ============================================

BEGIN;

-- 1. Criar tabela de tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL, -- identificador único (ex: 'contratando-planos')
    nome VARCHAR(255) NOT NULL,
    dominio_principal VARCHAR(255) UNIQUE, -- ex: 'contratandoplanos.com.br'
    subdominio VARCHAR(100) UNIQUE, -- ex: 'cliente2' para cliente2.plataforma.com
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
    
    -- Configurações de branding
    logo_url TEXT,
    favicon_url TEXT,
    cor_primaria VARCHAR(7), -- hex color
    cor_secundaria VARCHAR(7),
    nome_marca VARCHAR(255),
    
    -- Configurações de email
    email_remetente VARCHAR(255),
    nome_remetente VARCHAR(255),
    
    -- Configurações de domínio
    dominio_personalizado VARCHAR(255), -- ex: 'app.cliente.com'
    ssl_enabled BOOLEAN DEFAULT false,
    
    -- Configurações de integração
    asaas_api_key TEXT, -- criptografado (será implementado depois)
    resend_api_key TEXT, -- criptografado (será implementado depois)
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Configurações adicionais (JSONB para flexibilidade)
    configuracoes JSONB DEFAULT '{}'::jsonb
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_dominio ON tenants(dominio_principal);
CREATE INDEX IF NOT EXISTS idx_tenants_subdominio ON tenants(subdominio);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_dominio_personalizado ON tenants(dominio_personalizado);

-- 3. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tenants_updated_at ON tenants;
CREATE TRIGGER trigger_update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenants_updated_at();

-- 4. Criar tenant padrão (Contratando Planos)
-- ID fixo para garantir consistência
INSERT INTO tenants (
    id,
    slug,
    nome,
    dominio_principal,
    subdominio,
    status,
    nome_marca,
    cor_primaria,
    cor_secundaria,
    email_remetente,
    nome_remetente,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid, -- ID fixo para tenant padrão
    'contratando-planos',
    'Contratando Planos',
    'contratandoplanos.com.br',
    'contratando-planos',
    'ativo',
    'Contratando Planos',
    '#168979', -- cor atual do sistema
    '#13786a',
    'contato@contratandoplanos.com.br',
    'Contratando Planos',
    NOW()
) ON CONFLICT (slug) DO UPDATE SET
    nome = EXCLUDED.nome,
    dominio_principal = EXCLUDED.dominio_principal,
    subdominio = EXCLUDED.subdominio,
    status = EXCLUDED.status,
    nome_marca = EXCLUDED.nome_marca,
    cor_primaria = EXCLUDED.cor_primaria,
    cor_secundaria = EXCLUDED.cor_secundaria,
    updated_at = NOW();

-- 5. Comentários para documentação
COMMENT ON TABLE tenants IS 'Tabela principal de tenants/organizações da plataforma white-label';
COMMENT ON COLUMN tenants.slug IS 'Identificador único do tenant (usado em URLs e subdomínios)';
COMMENT ON COLUMN tenants.dominio_principal IS 'Domínio principal do tenant (ex: contratandoplanos.com.br)';
COMMENT ON COLUMN tenants.subdominio IS 'Subdomínio do tenant (ex: cliente2 para cliente2.plataforma.com)';
COMMENT ON COLUMN tenants.configuracoes IS 'Configurações adicionais em formato JSON para flexibilidade futura';

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar se a tabela foi criada corretamente:
-- SELECT * FROM tenants;
-- ============================================

