-- ============================================
-- SCRIPT 16: CORRIGIR TODOS OS PROBLEMAS RLS
-- ============================================
-- Este script corrige TODOS os problemas causados pelas policies RLS:
-- 1. Cadastro de novos corretores não funciona
-- 2. Login de corretores não funciona
-- 3. Itens não aparecem no admin sidebar
-- ============================================
-- ⚠️ ATENÇÃO: Execute este script para restaurar funcionamento completo
-- ============================================

BEGIN;

-- ============================================
-- PARTE 1: CORRIGIR TABELA CORRETORES
-- ============================================
-- Problemas: Cadastro e Login não funcionam

-- Remover TODAS as policies existentes da tabela corretores
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

-- SELECT: Permitir leitura para usuários autenticados
-- NECESSÁRIO para: Login de corretores, busca por email
CREATE POLICY "corretores_select_authenticated"
ON corretores
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Permitir inserção para usuários autenticados
-- NECESSÁRIO para: Cadastro de novos corretores
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

-- Garantir que RLS está habilitado
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: CORRIGIR TABELA USUARIOS_ADMIN
-- ============================================
-- Problema: Itens não aparecem no admin sidebar

-- Remover TODAS as policies existentes da tabela usuarios_admin
DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_select_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_self" ON usuarios_admin;

-- SELECT: Permitir leitura para usuários autenticados
-- NECESSÁRIO para: Login de admin, carregar sidebar, verificar permissões
CREATE POLICY "usuarios_admin_select_authenticated"
ON usuarios_admin
FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Permitir atualização para usuários autenticados
-- NECESSÁRIO para: Atualizar último_login, etc.
CREATE POLICY "usuarios_admin_update_authenticated"
ON usuarios_admin
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Garantir que RLS está habilitado
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO FINAL
-- ============================================
-- Execute para verificar que todas as policies foram criadas corretamente:
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
--   - corretores_select_authenticated: SELECT com USING (true)
--   - corretores_insert_authenticated: INSERT com WITH CHECK (true)
--   - corretores_update_authenticated: UPDATE com USING/WITH CHECK (true)
--   - corretores_delete_authenticated: DELETE com USING (true)
-- 
-- usuarios_admin:
--   - usuarios_admin_select_authenticated: SELECT com USING (true)
--   - usuarios_admin_update_authenticated: UPDATE com USING/WITH CHECK (true)
-- ============================================
-- 
-- APÓS EXECUTAR ESTE SCRIPT:
-- ✅ Cadastro de corretores deve funcionar
-- ✅ Login de corretores deve funcionar
-- ✅ Admin sidebar deve mostrar todos os itens
-- ============================================

