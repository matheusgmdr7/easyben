-- ============================================
-- SCRIPT 3: CRIAR RLS POLICIES PARA ISOLAMENTO
-- ============================================
-- Este script cria as políticas RLS para garantir
-- isolamento completo de dados entre tenants
-- ============================================
-- ⚠️ ATENÇÃO: Execute os scripts 01 e 02 primeiro!
-- ============================================

BEGIN;

-- ============================================
-- 1. FUNÇÃO HELPER PARA OBTER TENANT_ID
-- ============================================
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    -- Tentar obter do contexto da sessão (será definido pelo middleware)
    BEGIN
        tenant_id := current_setting('app.current_tenant_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        -- Se não estiver definido, retornar NULL (será tratado nas policies)
        tenant_id := NULL;
    END;
    
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_tenant_id() IS 'Retorna o tenant_id do contexto atual da sessão';

-- ============================================
-- 2. HABILITAR RLS NAS TABELAS
-- ============================================

-- PROPOSTAS
ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_propostas" ON propostas;
CREATE POLICY "tenant_isolation_propostas"
ON propostas
FOR ALL
TO authenticated
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());

-- CORRETORES
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_corretores" ON corretores;
CREATE POLICY "tenant_isolation_corretores"
ON corretores
FOR ALL
TO authenticated
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());

-- PRODUTOS_CORRETORES
ALTER TABLE produtos_corretores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_produtos_corretores" ON produtos_corretores;
CREATE POLICY "tenant_isolation_produtos_corretores"
ON produtos_corretores
FOR ALL
TO authenticated
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());

-- TABELAS_PRECOS
ALTER TABLE tabelas_precos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_tabelas_precos" ON tabelas_precos;
CREATE POLICY "tenant_isolation_tabelas_precos"
ON tabelas_precos
FOR ALL
TO authenticated
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());

-- ADMINISTRADORAS (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras') THEN
        ALTER TABLE administradoras ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "tenant_isolation_administradoras" ON administradoras;
        CREATE POLICY "tenant_isolation_administradoras"
        ON administradoras
        FOR ALL
        TO authenticated
        USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;
END $$;

-- CLIENTES_ADMINISTRADORAS (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras') THEN
        ALTER TABLE clientes_administradoras ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "tenant_isolation_clientes_administradoras" ON clientes_administradoras;
        CREATE POLICY "tenant_isolation_clientes_administradoras"
        ON clientes_administradoras
        FOR ALL
        TO authenticated
        USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;
END $$;

-- FATURAS (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faturas') THEN
        ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "tenant_isolation_faturas" ON faturas;
        CREATE POLICY "tenant_isolation_faturas"
        ON faturas
        FOR ALL
        TO authenticated
        USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;
END $$;

-- COMISSOES (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comissoes') THEN
        ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "tenant_isolation_comissoes" ON comissoes;
        CREATE POLICY "tenant_isolation_comissoes"
        ON comissoes
        FOR ALL
        TO authenticated
        USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;
END $$;

-- USUARIOS_ADMIN (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios_admin') THEN
        ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;
        CREATE POLICY "tenant_isolation_usuarios_admin"
        ON usuarios_admin
        FOR ALL
        TO authenticated
        USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;
END $$;

-- LEADS (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "tenant_isolation_leads" ON leads;
        CREATE POLICY "tenant_isolation_leads"
        ON leads
        FOR ALL
        TO authenticated
        USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;
END $$;

-- ============================================
-- 3. POLICY ESPECIAL PARA SUPER ADMIN
-- ============================================
-- Permitir que super admins vejam todos os tenants
-- (será implementado quando criar sistema de super admin)

-- Por enquanto, manter isolamento total
-- Futuramente: adicionar role 'super_admin' e policy especial

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar as policies criadas:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE tablename IN ('propostas', 'corretores', 'produtos_corretores', 'tabelas_precos')
-- ORDER BY tablename, policyname;
-- ============================================

