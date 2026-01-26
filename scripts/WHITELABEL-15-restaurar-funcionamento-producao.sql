-- ============================================
-- SCRIPT 15: RESTAURAR FUNCIONAMENTO EM PRODUÇÃO
-- ============================================
-- Este script ajusta as policies RLS para permitir que o sistema
-- funcione normalmente em produção enquanto a atualização white-label
-- está em desenvolvimento
-- ============================================
-- ⚠️ ATENÇÃO: Este script permite que o sistema funcione normalmente
-- ⚠️ Execute este script para restaurar o funcionamento imediato
-- ============================================

BEGIN;

-- ============================================
-- 1. CORRIGIR POLICIES DA TABELA CORRETORES
-- ============================================
-- Remover todas as policies existentes
DROP POLICY IF EXISTS "tenant_isolation_corretores" ON corretores;
DROP POLICY IF EXISTS "corretores_select_permissive" ON corretores;
DROP POLICY IF EXISTS "corretores_write_tenant_isolation" ON corretores;
DROP POLICY IF EXISTS "corretores_select_authenticated" ON corretores;
DROP POLICY IF EXISTS "corretores_insert_tenant_isolation" ON corretores;
DROP POLICY IF EXISTS "corretores_update_tenant_isolation" ON corretores;
DROP POLICY IF EXISTS "corretores_delete_tenant_isolation" ON corretores;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON corretores;

-- Criar policies permissivas para permitir funcionamento normal
-- SELECT: Permitir leitura para usuários autenticados (necessário para login)
CREATE POLICY "corretores_select_authenticated"
ON corretores
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Permitir inserção para usuários autenticados (necessário para cadastro)
CREATE POLICY "corretores_insert_authenticated"
ON corretores
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Permitir atualização para usuários autenticados
CREATE POLICY "corretores_update_authenticated"
ON corretores
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Permitir deleção para usuários autenticados
CREATE POLICY "corretores_delete_authenticated"
ON corretores
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 2. CORRIGIR POLICIES DA TABELA USUARIOS_ADMIN
-- ============================================
-- Remover policies conflitantes
DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_select_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_self" ON usuarios_admin;

-- SELECT: Permitir leitura para usuários autenticados (necessário para login e sidebar)
CREATE POLICY "usuarios_admin_select_authenticated"
ON usuarios_admin
FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Permitir atualização para usuários autenticados
CREATE POLICY "usuarios_admin_update_authenticated"
ON usuarios_admin
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- 3. GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;
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
-- corretores:
--   - corretores_select_authenticated: SELECT com USING (true)
--   - corretores_insert_authenticated: INSERT com WITH CHECK (true)
--   - corretores_update_authenticated: UPDATE com USING/WITH CHECK (true)
--   - corretores_delete_authenticated: DELETE com USING (true)
-- 
-- usuarios_admin:
--   - usuarios_admin_select_authenticated: SELECT com USING (true)
--   - usuarios_admin_update_authenticated: UPDATE com USING/WITH CHECK (true)
-- ============================================

