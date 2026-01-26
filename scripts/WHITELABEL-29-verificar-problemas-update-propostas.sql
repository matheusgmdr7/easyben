-- ============================================
-- VERIFICAR PROBLEMAS COM UPDATE EM PROPOSTAS
-- ============================================
-- Este script verifica se há políticas bloqueando UPDATE
-- e se RLS está realmente desabilitado
-- ============================================

BEGIN;

-- ============================================
-- 1. VERIFICAR STATUS RLS E POLÍTICAS
-- ============================================

SELECT 
    'propostas' as tabela,
    rowsecurity as rls_habilitado,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'propostas') as num_policies
FROM pg_tables
WHERE tablename = 'propostas'
UNION ALL
SELECT 
    'dependentes' as tabela,
    rowsecurity as rls_habilitado,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'dependentes') as num_policies
FROM pg_tables
WHERE tablename = 'dependentes'
UNION ALL
SELECT 
    'questionario_saude' as tabela,
    rowsecurity as rls_habilitado,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'questionario_saude') as num_policies
FROM pg_tables
WHERE tablename = 'questionario_saude';

-- ============================================
-- 2. LISTAR TODAS AS POLÍTICAS DE UPDATE
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('propostas', 'dependentes', 'questionario_saude')
AND cmd = 'UPDATE'
ORDER BY tablename, policyname;

-- ============================================
-- 3. VERIFICAR SE HÁ POLÍTICAS COM with_check RESTRITIVO
-- ============================================

SELECT 
    tablename,
    policyname,
    cmd,
    with_check,
    CASE 
        WHEN with_check IS NULL OR with_check = 'true' THEN 'PERMISSIVO ✅'
        ELSE 'RESTRITIVO ⚠️'
    END as tipo_policy
FROM pg_policies
WHERE tablename IN ('propostas', 'dependentes', 'questionario_saude')
AND cmd IN ('INSERT', 'UPDATE')
ORDER BY tablename, cmd, policyname;

COMMIT;

