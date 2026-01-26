-- ============================================
-- SCRIPT 13: REMOVER POLICY CONFLITANTE DE CORRETORES
-- ============================================
-- Este script remove a policy "tenant_isolation_corretores" que está
-- conflitando com as policies permissivas e bloqueando o login
-- ============================================
-- ⚠️ ATENÇÃO: Execute este script para corrigir o problema de login
-- ============================================

BEGIN;

-- ============================================
-- 1. REMOVER POLICY CONFLITANTE
-- ============================================
-- A policy "tenant_isolation_corretores" com ALL está bloqueando
-- mesmo com as outras policies permissivas
DROP POLICY IF EXISTS "tenant_isolation_corretores" ON corretores;

-- ============================================
-- 2. VERIFICAR POLICIES RESTANTES
-- ============================================
-- As policies permissivas devem permanecer:
-- - "Permitir leitura para usuários autenticados" (SELECT com true)
-- - "Permitir inserção para usuários autenticados" (INSERT com true)
-- - "Permitir atualização para usuários autenticados" (UPDATE com true)
-- - "Permitir deleção para usuários autenticados" (DELETE com true)

-- ============================================
-- 3. GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar que a policy conflitante foi removida:
-- 
-- SELECT 
--     tablename,
--     policyname,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE tablename = 'corretores'
-- ORDER BY policyname;
-- ============================================
-- 
-- RESULTADO ESPERADO:
-- - Apenas as 4 policies permissivas devem aparecer
-- - A policy "tenant_isolation_corretores" NÃO deve aparecer
-- ============================================

