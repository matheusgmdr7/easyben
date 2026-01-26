-- ============================================
-- SCRIPT 8: DIAGNÓSTICO - VERIFICAR TABELA DE USUÁRIOS ADMIN
-- ============================================
-- Este script verifica se há alguma referência incorreta
-- à tabela "admin_usuario" em views, funções ou triggers
-- ============================================
-- ⚠️ ATENÇÃO: Execute no Supabase SQL Editor
-- ============================================

-- 1. Verificar se a tabela usuarios_admin existe
SELECT 
    'Tabela usuarios_admin' AS tipo,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios_admin'
    ) AS existe;

-- 2. Verificar se existe alguma tabela chamada "admin_usuario" (incorreta)
SELECT 
    'Tabela admin_usuario (INCORRETA)' AS tipo,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_usuario'
    ) AS existe;

-- 3. Verificar views que referenciam usuarios_admin ou admin_usuario
SELECT 
    table_name AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND (
    view_definition ILIKE '%usuarios_admin%'
    OR view_definition ILIKE '%admin_usuario%'
);

-- 4. Verificar funções que referenciam usuarios_admin ou admin_usuario
SELECT 
    routine_name AS function_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND (
    routine_definition ILIKE '%usuarios_admin%'
    OR routine_definition ILIKE '%admin_usuario%'
);

-- 5. Verificar triggers que referenciam usuarios_admin ou admin_usuario
SELECT 
    trigger_name,
    event_object_table AS table_name,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (
    event_object_table = 'usuarios_admin'
    OR event_object_table = 'admin_usuario'
    OR action_statement ILIKE '%usuarios_admin%'
    OR action_statement ILIKE '%admin_usuario%'
);

-- 6. Verificar RLS policies na tabela usuarios_admin
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'usuarios_admin'
OR tablename = 'admin_usuario';

-- 7. Verificar estrutura da tabela usuarios_admin
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'usuarios_admin'
ORDER BY ordinal_position;

-- 8. Contar registros na tabela usuarios_admin
SELECT 
    COUNT(*) AS total_usuarios,
    COUNT(*) FILTER (WHERE ativo = true) AS usuarios_ativos,
    COUNT(*) FILTER (WHERE ativo = false) AS usuarios_inativos
FROM usuarios_admin;

-- 9. Listar alguns usuários para verificação
SELECT 
    id,
    nome,
    email,
    perfil,
    ativo,
    status
FROM usuarios_admin
ORDER BY criado_em DESC
LIMIT 10;

-- ============================================
-- ✅ INTERPRETAÇÃO DOS RESULTADOS
-- ============================================
-- 1. Se "Tabela usuarios_admin" = true: ✅ Tabela existe corretamente
-- 2. Se "Tabela admin_usuario" = true: ❌ Há uma tabela incorreta (deve ser removida)
-- 3. Views/Funções/Triggers: Verificar se há referências a "admin_usuario"
-- 4. RLS Policies: Verificar se há policies na tabela incorreta
-- ============================================

