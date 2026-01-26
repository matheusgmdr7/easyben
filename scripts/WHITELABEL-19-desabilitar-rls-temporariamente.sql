-- ============================================
-- SCRIPT 19: DESABILITAR RLS TEMPORARIAMENTE
-- ============================================
-- Este script DESABILITA o RLS nas tabelas corretores e usuarios_admin
-- para restaurar funcionamento imediato enquanto a implementação white-label
-- está em desenvolvimento
-- ============================================
-- ⚠️ ATENÇÃO: Este script desabilita RLS completamente
-- ⚠️ Use apenas para restaurar funcionamento em produção
-- ⚠️ Reative o RLS quando a implementação white-label estiver completa
-- ============================================

BEGIN;

-- ============================================
-- PARTE 1: DESABILITAR RLS NA TABELA CORRETORES
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
DROP POLICY IF EXISTS "corretores_select_login" ON corretores;
DROP POLICY IF EXISTS "corretores_insert_cadastro" ON corretores;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON corretores;

-- DESABILITAR RLS completamente
ALTER TABLE corretores DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: DESABILITAR RLS NA TABELA USUARIOS_ADMIN
-- ============================================

-- Remover TODAS as policies existentes
DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_select_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_self" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_select_funcional" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_funcional" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_select_login" ON usuarios_admin;

-- DESABILITAR RLS completamente
ALTER TABLE usuarios_admin DISABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar que o RLS foi desabilitado:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     rowsecurity as "RLS Habilitado"
-- FROM pg_tables
-- WHERE tablename IN ('corretores', 'usuarios_admin')
-- AND schemaname = 'public';
-- ============================================
-- 
-- RESULTADO ESPERADO:
-- - corretores: rowsecurity = false (RLS DESABILITADO)
-- - usuarios_admin: rowsecurity = false (RLS DESABILITADO)
-- ============================================
-- 
-- APÓS EXECUTAR ESTE SCRIPT:
-- ✅ Login de corretores deve funcionar (RLS desabilitado)
-- ✅ Cadastro de corretores deve funcionar (RLS desabilitado)
-- ✅ Admin sidebar deve mostrar todos os itens (RLS desabilitado)
-- ============================================
-- 
-- ⚠️ IMPORTANTE: Este é um estado temporário
-- ⚠️ Reative o RLS quando a implementação white-label estiver completa
-- ============================================

