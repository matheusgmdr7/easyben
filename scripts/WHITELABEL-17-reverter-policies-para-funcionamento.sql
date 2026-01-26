-- ============================================
-- SCRIPT 17: REVERTER POLICIES PARA FUNCIONAMENTO
-- ============================================
-- Este script reverte as policies RLS para um estado que permite
-- funcionamento normal do sistema, baseado no estado ANTES do white-label
-- ============================================
-- ⚠️ ATENÇÃO: Este script restaura funcionamento sem depender de tenant_id
-- ============================================

BEGIN;

-- ============================================
-- PARTE 1: CORRIGIR TABELA CORRETORES
-- ============================================
-- Problema: Login e cadastro não funcionam porque dependem de get_current_tenant_id()
-- Solução: Criar policies que permitem acesso ao tenant padrão OU quando tenant_id não está definido

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
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON corretores;

-- SELECT: Permitir acesso ao tenant padrão OU quando tenant_id não está definido
-- Isso permite login funcionar mesmo sem contexto de tenant
CREATE POLICY "corretores_select_funcional"
ON corretores
FOR SELECT
TO authenticated
USING (
    -- Permitir acesso ao tenant padrão
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR
    -- Permitir quando tenant_id não está definido (durante login)
    tenant_id IS NULL
    OR
    -- Permitir quando get_current_tenant_id() retorna o tenant padrão
    tenant_id = COALESCE(
        NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid
    )
);

-- INSERT: Permitir inserção no tenant padrão OU quando tenant_id não está definido
-- Isso permite cadastro funcionar
CREATE POLICY "corretores_insert_funcional"
ON corretores
FOR INSERT
TO authenticated
WITH CHECK (
    -- Permitir inserção no tenant padrão
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR
    -- Permitir quando tenant_id não está definido (durante cadastro)
    tenant_id IS NULL
    OR
    -- Permitir quando get_current_tenant_id() retorna o tenant padrão
    tenant_id = COALESCE(
        NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid
    )
);

-- UPDATE: Permitir atualização no tenant padrão OU quando tenant_id não está definido
CREATE POLICY "corretores_update_funcional"
ON corretores
FOR UPDATE
TO authenticated
USING (
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR tenant_id IS NULL
    OR tenant_id = COALESCE(
        NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid
    )
)
WITH CHECK (
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR tenant_id IS NULL
    OR tenant_id = COALESCE(
        NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid
    )
);

-- DELETE: Permitir deleção no tenant padrão OU quando tenant_id não está definido
CREATE POLICY "corretores_delete_funcional"
ON corretores
FOR DELETE
TO authenticated
USING (
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR tenant_id IS NULL
    OR tenant_id = COALESCE(
        NULLIF(current_setting('app.current_tenant_id', true), '')::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid
    )
);

-- Garantir que RLS está habilitado
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: CORRIGIR TABELA USUARIOS_ADMIN
-- ============================================
-- Problema: Sidebar não aparece porque policies bloqueiam acesso

-- Remover TODAS as policies existentes
DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_select_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_self" ON usuarios_admin;

-- SELECT: Permitir acesso sem restrição de tenant (usuarios_admin não deve ser isolado)
CREATE POLICY "usuarios_admin_select_funcional"
ON usuarios_admin
FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Permitir atualização sem restrição de tenant
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
--   - corretores_select_funcional: SELECT permitindo tenant padrão ou NULL
--   - corretores_insert_funcional: INSERT permitindo tenant padrão ou NULL
--   - corretores_update_funcional: UPDATE permitindo tenant padrão ou NULL
--   - corretores_delete_funcional: DELETE permitindo tenant padrão ou NULL
-- 
-- usuarios_admin:
--   - usuarios_admin_select_funcional: SELECT com USING (true)
--   - usuarios_admin_update_funcional: UPDATE com USING/WITH CHECK (true)
-- ============================================
-- 
-- APÓS EXECUTAR ESTE SCRIPT:
-- ✅ Login de corretores deve funcionar (permite acesso quando tenant_id é NULL ou padrão)
-- ✅ Cadastro de corretores deve funcionar (permite INSERT quando tenant_id é NULL ou padrão)
-- ✅ Admin sidebar deve mostrar todos os itens (permite SELECT sem restrição)
-- ============================================

