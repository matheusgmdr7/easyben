-- ============================================
-- SCRIPT 6: CRIAR TABELAS DE RECURSOS
-- ============================================
-- Este script cria o sistema de controle de recursos/páginas por tenant
-- Execute este script após criar a tabela de tenants
-- ============================================

BEGIN;

-- 1. Criar tabela de recursos disponíveis no sistema
CREATE TABLE IF NOT EXISTS recursos_disponiveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) UNIQUE NOT NULL, -- ex: 'portal_corretor', 'portal_administradora'
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100) NOT NULL, -- ex: 'portal', 'financeiro', 'relatorios', 'publico'
    rota_base VARCHAR(255) NOT NULL, -- ex: '/corretor', '/administradora', '/admin'
    icone VARCHAR(100), -- nome do ícone (lucide-react)
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0, -- ordem de exibição
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de recursos habilitados por tenant
CREATE TABLE IF NOT EXISTS tenant_recursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recurso_id UUID NOT NULL REFERENCES recursos_disponiveis(id) ON DELETE CASCADE,
    habilitado BOOLEAN DEFAULT true,
    configuracoes JSONB DEFAULT '{}'::jsonb, -- configurações específicas do recurso para este tenant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, recurso_id)
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_recursos_codigo ON recursos_disponiveis(codigo);
CREATE INDEX IF NOT EXISTS idx_recursos_categoria ON recursos_disponiveis(categoria);
CREATE INDEX IF NOT EXISTS idx_recursos_ativo ON recursos_disponiveis(ativo);
CREATE INDEX IF NOT EXISTS idx_tenant_recursos_tenant_id ON tenant_recursos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_recursos_recurso_id ON tenant_recursos(recurso_id);
CREATE INDEX IF NOT EXISTS idx_tenant_recursos_habilitado ON tenant_recursos(habilitado);

-- 4. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recursos_disponiveis_updated_at 
    BEFORE UPDATE ON recursos_disponiveis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_recursos_updated_at 
    BEFORE UPDATE ON tenant_recursos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Comentários para documentação
COMMENT ON TABLE recursos_disponiveis IS 'Recursos (páginas/módulos) disponíveis no sistema que podem ser habilitados por tenant';
COMMENT ON TABLE tenant_recursos IS 'Recursos habilitados para cada tenant';
COMMENT ON COLUMN recursos_disponiveis.codigo IS 'Código único do recurso (ex: portal_corretor, portal_administradora)';
COMMENT ON COLUMN recursos_disponiveis.categoria IS 'Categoria do recurso para agrupamento (portal, financeiro, relatorios, publico)';
COMMENT ON COLUMN recursos_disponiveis.rota_base IS 'Rota base do recurso (ex: /corretor, /administradora)';
COMMENT ON COLUMN tenant_recursos.habilitado IS 'Se o recurso está habilitado para este tenant';
COMMENT ON COLUMN tenant_recursos.configuracoes IS 'Configurações específicas do recurso para este tenant (JSONB)';

COMMIT;

-- ============================================
-- POPULAR TABELA DE RECURSOS DISPONÍVEIS
-- ============================================

BEGIN;

-- Recursos Públicos
INSERT INTO recursos_disponiveis (codigo, nome, descricao, categoria, rota_base, icone, ordem) VALUES
('cotacao_online', 'Cotação Online', 'Página pública de cotação de planos de saúde', 'publico', '/cotacao', 'ShoppingCart', 1),
('proposta_digital', 'Proposta Digital', 'Sistema de proposta digital para clientes', 'publico', '/proposta-digital', 'FileText', 2)
ON CONFLICT (codigo) DO NOTHING;

-- Portal do Corretor
INSERT INTO recursos_disponiveis (codigo, nome, descricao, categoria, rota_base, icone, ordem) VALUES
('portal_corretor', 'Portal do Corretor', 'Acesso completo ao portal do corretor (dashboard, propostas, clientes, produtos, comissões)', 'portal', '/corretor', 'User', 10),
('corretor_cadastro', 'Cadastro de Corretor', 'Página pública de cadastro de corretores', 'publico', '/corretor/cadastro', 'UserPlus', 3),
('corretor_login', 'Login do Corretor', 'Página de login para corretores', 'publico', '/corretor/login', 'LogIn', 4)
ON CONFLICT (codigo) DO NOTHING;

-- Portal do Gestor
INSERT INTO recursos_disponiveis (codigo, nome, descricao, categoria, rota_base, icone, ordem) VALUES
('portal_gestor', 'Portal do Gestor', 'Acesso ao portal do gestor (dashboard, equipe, link de cadastro)', 'portal', '/gestor', 'Users', 20),
('gestor_cadastro', 'Cadastro de Gestor', 'Página pública de cadastro de gestores', 'publico', '/gestor/cadastro', 'UserPlus', 5),
('gestor_login', 'Login do Gestor', 'Página de login para gestores', 'publico', '/gestor/login', 'LogIn', 6)
ON CONFLICT (codigo) DO NOTHING;

-- Portal da Administradora
INSERT INTO recursos_disponiveis (codigo, nome, descricao, categoria, rota_base, icone, ordem) VALUES
('portal_administradora', 'Portal da Administradora', 'Acesso completo ao portal da administradora (faturamento, fatura, financeiro, contratos, grupos de beneficiários)', 'portal', '/administradora', 'Building2', 30),
('administradora_cadastro', 'Cadastro de Administradora', 'Página pública de cadastro de administradoras', 'publico', '/administradora/cadastro', 'Building2', 7),
('administradora_login', 'Login da Administradora', 'Página de login para administradoras', 'publico', '/administradora/login', 'LogIn', 8)
ON CONFLICT (codigo) DO NOTHING;

-- Portal do Admin
INSERT INTO recursos_disponiveis (codigo, nome, descricao, categoria, rota_base, icone, ordem) VALUES
('portal_admin', 'Portal do Administrador', 'Acesso ao portal administrativo (dashboard, propostas, corretores, produtos, tabelas, comissões, financeiro, contratos, administradoras, usuários, vendas, leads, clientes, modelos)', 'portal', '/admin', 'Settings', 40),
('admin_login', 'Login do Admin', 'Página de login para administradores', 'publico', '/admin/login', 'LogIn', 9)
ON CONFLICT (codigo) DO NOTHING;

-- Portal do Analista
INSERT INTO recursos_disponiveis (codigo, nome, descricao, categoria, rota_base, icone, ordem) VALUES
('portal_analista', 'Portal do Analista', 'Acesso ao portal do analista (propostas recebidas, em análise, relatórios)', 'portal', '/analista', 'ClipboardList', 50)
ON CONFLICT (codigo) DO NOTHING;

COMMIT;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar recursos criados
SELECT 
    codigo,
    nome,
    categoria,
    rota_base,
    ativo,
    ordem
FROM recursos_disponiveis
ORDER BY ordem, categoria, nome;


