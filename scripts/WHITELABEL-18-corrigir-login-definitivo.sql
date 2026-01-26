-- ============================================
-- SCRIPT 18: CORRIGIR LOGIN DEFINITIVO
-- ============================================
-- Este script corrige o problema de login permitindo acesso quando:
-- 1. tenant_id é NULL (durante login/cadastro)
-- 2. tenant_id é o tenant padrão
-- 3. tenant_id corresponde ao contexto quando definido
-- ============================================
-- Baseado na comparação com o estado ANTES do white-label
-- ============================================

BEGIN;

-- ============================================
-- PARTE 1: CORRIGIR TABELA CORRETORES
-- ============================================

-- Remover TODAS as policies existentes
DROP POLICY IF EXISTS "tenant_isolation_corretores" ON corretores;
DROP POLICY IF EXISTS "corretores_select_permissive" ON corretores;
DROP POLICY IF EXISTS "corretores_write_tenant_isolation" ON corretores;
DROP POLICY IF EXISTS "corretores_select_authenticated" ON corretores;
DROP POLICY IF EXISTS "corretores_insert_tenant_isolation" ON corretores;
DROP POLICY IF EXISTS "corretores_update_tenant_isolation" ON corretores;
DROP POLICY IF EXISTS "corretores_delete_tenant_isolation" ON corretores;
DROP POLICY IF EXISTS "corretores_insert_authenticated" ON corretores;
DROP POLICY IF EXISTS "corretores_update_authenticated" ON corretores;
DROP POLICY IF EXISTS "corretores_delete_authenticated" ON corretores;
DROP POLICY IF EXISTS "corretores_select_funcional" ON corretores;
DROP POLICY IF EXISTS "corretores_insert_funcional" ON corretores;
DROP POLICY IF EXISTS "corretores_update_funcional" ON corretores;
DROP POLICY IF EXISTS "corretores_delete_funcional" ON corretores;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON corretores;

-- SELECT: Permitir acesso quando tenant_id é NULL, padrão, ou corresponde ao contexto
-- IMPORTANTE: Permitir NULL para que login funcione antes de definir tenant
CREATE POLICY "corretores_select_login"
ON corretores
FOR SELECT
TO authenticated
USING (
    -- Permitir quando tenant_id é NULL (durante login)
    tenant_id IS NULL
    OR
    -- Permitir quando é o tenant padrão
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR
    -- Permitir quando corresponde ao contexto (se definido)
    (
        current_setting('app.current_tenant_id', true) IS NOT NULL
        AND current_setting('app.current_tenant_id', true) != ''
        AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
);

-- INSERT: Permitir inserção quando tenant_id é NULL, padrão, ou corresponde ao contexto
-- IMPORTANTE: Permitir NULL para que cadastro funcione
CREATE POLICY "corretores_insert_cadastro"
ON corretores
FOR INSERT
TO authenticated
WITH CHECK (
    -- Permitir quando tenant_id é NULL (durante cadastro)
    tenant_id IS NULL
    OR
    -- Permitir quando é o tenant padrão
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR
    -- Permitir quando corresponde ao contexto (se definido)
    (
        current_setting('app.current_tenant_id', true) IS NOT NULL
        AND current_setting('app.current_tenant_id', true) != ''
        AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
);

-- UPDATE: Permitir atualização quando tenant_id é NULL, padrão, ou corresponde ao contexto
CREATE POLICY "corretores_update_funcional"
ON corretores
FOR UPDATE
TO authenticated
USING (
    tenant_id IS NULL
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR (
        current_setting('app.current_tenant_id', true) IS NOT NULL
        AND current_setting('app.current_tenant_id', true) != ''
        AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
)
WITH CHECK (
    tenant_id IS NULL
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR (
        current_setting('app.current_tenant_id', true) IS NOT NULL
        AND current_setting('app.current_tenant_id', true) != ''
        AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
);

-- DELETE: Permitir deleção quando tenant_id é NULL, padrão, ou corresponde ao contexto
CREATE POLICY "corretores_delete_funcional"
ON corretores
FOR DELETE
TO authenticated
USING (
    tenant_id IS NULL
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR (
        current_setting('app.current_tenant_id', true) IS NOT NULL
        AND current_setting('app.current_tenant_id', true) != ''
        AND tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
);

-- Garantir que RLS está habilitado
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: CORRIGIR TABELA USUARIOS_ADMIN
-- ============================================

-- Remover TODAS as policies existentes
DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_select_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_self" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_select_funcional" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_funcional" ON usuarios_admin;

-- SELECT: Permitir acesso sem restrição (usuarios_admin não deve ser isolado por tenant)
CREATE POLICY "usuarios_admin_select_login"
ON usuarios_admin
FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Permitir atualização sem restrição
CREATE POLICY "usuarios_admin_update_funcional"
ON usuarios_admin
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Garantir que RLS está habilitado
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar as policies criadas:
-- 
-- SELECT 
--     tablename,
--     policyname,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE tablename IN ('corretores', 'usuarios_admin')
-- ORDER BY tablename, policyname;
-- ============================================
-- 
-- RESULTADO ESPERADO:
-- 
-- corretores:
--   - corretores_select_login: SELECT permitindo NULL, tenant padrão, ou contexto
--   - corretores_insert_cadastro: INSERT permitindo NULL, tenant padrão, ou contexto
--   - corretores_update_funcional: UPDATE permitindo NULL, tenant padrão, ou contexto
--   - corretores_delete_funcional: DELETE permitindo NULL, tenant padrão, ou contexto
-- 
-- usuarios_admin:
--   - usuarios_admin_select_login: SELECT com USING (true)
--   - usuarios_admin_update_funcional: UPDATE com USING/WITH CHECK (true)
-- ============================================
-- 
-- DIFERENÇA CHAVE:
-- - ANTES: Não havia RLS ou policies muito permissivas
-- - AGORA: Policies que permitem NULL (durante login/cadastro) + tenant padrão + contexto
-- ============================================

