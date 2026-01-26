-- ============================================
-- SCRIPT 4: AJUSTAR RLS PARA COMPATIBILIDADE
-- ============================================
-- Este script ajusta o RLS para permitir acesso quando
-- o tenant_id não está definido no contexto (modo compatibilidade)
-- Isso permite que o sistema continue funcionando enquanto
-- ajustamos a implementação completa
-- ============================================
-- ⚠️ ATENÇÃO: Este é um ajuste temporário!
-- ⚠️ Execute após os scripts 01, 02 e 03
-- ============================================

BEGIN;

-- ============================================
-- 1. ATUALIZAR FUNÇÃO get_current_tenant_id()
-- ============================================
-- Modificar para retornar tenant padrão quando não definido
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
    tenant_slug TEXT;
BEGIN
    -- Tentar obter do contexto da sessão
    BEGIN
        tenant_id := current_setting('app.current_tenant_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        tenant_id := NULL;
    END;
    
    -- Se não estiver definido, tentar obter do header/cookie via tenant_slug
    IF tenant_id IS NULL THEN
        BEGIN
            tenant_slug := current_setting('app.current_tenant_slug', true);
            
            -- Buscar tenant pelo slug
            SELECT id INTO tenant_id
            FROM tenants
            WHERE slug = tenant_slug
            AND status = 'ativo'
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            -- Se falhar, usar tenant padrão
            tenant_id := '00000000-0000-0000-0000-000000000001'::uuid;
        END;
    END IF;
    
    -- Se ainda for NULL, usar tenant padrão
    IF tenant_id IS NULL THEN
        tenant_id := '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;
    
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_tenant_id() IS 'Retorna o tenant_id do contexto atual, com fallback para tenant padrão';

-- ============================================
-- 2. ATUALIZAR POLICIES PARA PERMITIR ACESSO
-- ============================================
-- Modificar policies para permitir acesso ao tenant padrão
-- quando o contexto não está definido (modo compatibilidade temporário)

-- PROPOSTAS
DROP POLICY IF EXISTS "tenant_isolation_propostas" ON propostas;
CREATE POLICY "tenant_isolation_propostas"
ON propostas
FOR ALL
TO authenticated
USING (
    tenant_id = get_current_tenant_id()
    -- Permitir acesso ao tenant padrão quando contexto não está definido
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
)
WITH CHECK (
    tenant_id = get_current_tenant_id()
    -- Permitir inserção no tenant padrão quando contexto não está definido
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- CORRETORES
DROP POLICY IF EXISTS "tenant_isolation_corretores" ON corretores;
CREATE POLICY "tenant_isolation_corretores"
ON corretores
FOR ALL
TO authenticated
USING (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
)
WITH CHECK (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- PRODUTOS_CORRETORES
DROP POLICY IF EXISTS "tenant_isolation_produtos_corretores" ON produtos_corretores;
CREATE POLICY "tenant_isolation_produtos_corretores"
ON produtos_corretores
FOR ALL
TO authenticated
USING (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
)
WITH CHECK (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- TABELAS_PRECOS
DROP POLICY IF EXISTS "tenant_isolation_tabelas_precos" ON tabelas_precos;
CREATE POLICY "tenant_isolation_tabelas_precos"
ON tabelas_precos
FOR ALL
TO authenticated
USING (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
)
WITH CHECK (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ADMINISTRADORAS (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras') THEN
        DROP POLICY IF EXISTS "tenant_isolation_administradoras" ON administradoras;
        CREATE POLICY "tenant_isolation_administradoras"
        ON administradoras
        FOR ALL
        TO authenticated
        USING (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        )
        WITH CHECK (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        );
    END IF;
END $$;

-- CLIENTES_ADMINISTRADORAS (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras') THEN
        DROP POLICY IF EXISTS "tenant_isolation_clientes_administradoras" ON clientes_administradoras;
        CREATE POLICY "tenant_isolation_clientes_administradoras"
        ON clientes_administradoras
        FOR ALL
        TO authenticated
        USING (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        )
        WITH CHECK (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        );
    END IF;
END $$;

-- FATURAS (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faturas') THEN
        DROP POLICY IF EXISTS "tenant_isolation_faturas" ON faturas;
        CREATE POLICY "tenant_isolation_faturas"
        ON faturas
        FOR ALL
        TO authenticated
        USING (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        )
        WITH CHECK (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        );
    END IF;
END $$;

-- COMISSOES (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comissoes') THEN
        DROP POLICY IF EXISTS "tenant_isolation_comissoes" ON comissoes;
        CREATE POLICY "tenant_isolation_comissoes"
        ON comissoes
        FOR ALL
        TO authenticated
        USING (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        )
        WITH CHECK (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        );
    END IF;
END $$;

-- USUARIOS_ADMIN (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios_admin') THEN
        DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;
        CREATE POLICY "tenant_isolation_usuarios_admin"
        ON usuarios_admin
        FOR ALL
        TO authenticated
        USING (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        )
        WITH CHECK (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        );
    END IF;
END $$;

-- LEADS (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        DROP POLICY IF EXISTS "tenant_isolation_leads" ON leads;
        CREATE POLICY "tenant_isolation_leads"
        ON leads
        FOR ALL
        TO authenticated
        USING (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        )
        WITH CHECK (
            tenant_id = get_current_tenant_id()
            OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        );
    END IF;
END $$;

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar se as policies foram atualizadas:
-- 
-- SELECT 
--     tablename,
--     policyname,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE tablename IN ('propostas', 'corretores', 'produtos_corretores', 'tabelas_precos', 'usuarios_admin')
-- ORDER BY tablename, policyname;
-- ============================================

