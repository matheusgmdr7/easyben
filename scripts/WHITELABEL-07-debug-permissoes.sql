-- ============================================
-- SCRIPT 7: DEBUG - VERIFICAR PERMISSÕES
-- ============================================
-- Este script ajuda a diagnosticar problemas com permissões
-- Execute e verifique os resultados
-- ============================================

-- 1. Verificar usuários e suas permissões
SELECT 
    id,
    nome,
    email,
    perfil,
    ativo,
    status,
    permissoes,
    CASE 
        WHEN permissoes IS NOT NULL AND jsonb_typeof(permissoes) = 'array' 
        THEN jsonb_array_length(permissoes)
        WHEN permissoes IS NOT NULL AND jsonb_typeof(permissoes) = 'object'
        THEN (SELECT COUNT(*) FROM jsonb_object_keys(permissoes))
        ELSE 0
    END as total_permissoes,
    jsonb_typeof(permissoes) as tipo_permissoes,
    tenant_id
FROM usuarios_admin
WHERE ativo = true
ORDER BY perfil, nome;

-- 2. Verificar se há usuários sem permissões
SELECT 
    COUNT(*) as usuarios_sem_permissoes,
    perfil
FROM usuarios_admin
WHERE ativo = true
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  )
GROUP BY perfil;

-- 3. Verificar policies RLS
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'usuarios_admin'
ORDER BY policyname;

-- 4. Verificar se RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'usuarios_admin';

