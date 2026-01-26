-- ============================================
-- SCRIPT 9: VERIFICAR RLS E POLICIES DE usuarios_admin
-- ============================================
-- Este script verifica se as políticas RLS estão corretas
-- e se permitem que usuários autenticados acessem a tabela
-- ============================================
-- ⚠️ ATENÇÃO: Execute no Supabase SQL Editor
-- ============================================

-- 1. Verificar se RLS está habilitado
SELECT 
    tablename, 
    rowsecurity AS rls_habilitado
FROM pg_tables 
WHERE tablename = 'usuarios_admin';

-- 2. Listar todas as policies da tabela usuarios_admin
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS operacao,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'usuarios_admin'
ORDER BY policyname;

-- 3. Verificar se há policies que bloqueiam acesso
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%tenant_id%' THEN '⚠️ BLOQUEIA: Usa tenant_id (PROBLEMA)'
        WHEN qual LIKE '%true%' OR qual IS NULL THEN '✅ PERMITE: Sem restrições'
        ELSE '⚠️ VERIFICAR: ' || qual
    END AS status
FROM pg_policies
WHERE tablename = 'usuarios_admin';

-- 4. Verificar se há policies com tenant_isolation (que devem ser removidas)
SELECT 
    policyname,
    '❌ DEVE SER REMOVIDA' AS acao
FROM pg_policies
WHERE tablename = 'usuarios_admin'
AND policyname LIKE '%tenant%';

-- 5. Testar se um usuário autenticado pode ler a tabela
-- (Execute como um usuário autenticado no Supabase Dashboard)
-- SELECT COUNT(*) FROM usuarios_admin;

-- ============================================
-- ✅ RESULTADO ESPERADO
-- ============================================
-- 1. RLS deve estar HABILITADO
-- 2. Deve haver 2 policies:
--    - usuarios_admin_select_authenticated (SELECT, USING: true)
--    - usuarios_admin_update_authenticated (UPDATE, com condições)
-- 3. NÃO deve haver policies com "tenant_isolation" no nome
-- 4. A policy SELECT deve ter USING: true (sem restrições de tenant_id)
-- ============================================

