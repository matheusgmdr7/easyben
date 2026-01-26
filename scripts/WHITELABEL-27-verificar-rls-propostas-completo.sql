-- ============================================
-- VERIFICAR RLS DE TODAS AS TABELAS DE PROPOSTAS
-- ============================================
-- Este script verifica o status de RLS e políticas
-- de todas as tabelas relacionadas a propostas
-- ============================================

BEGIN;

-- ============================================
-- 1. VERIFICAR STATUS DE RLS
-- ============================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename IN (
    'propostas',
    'propostas_corretores',
    'documentos_propostas',
    'documentos_propostas_corretores',
    'dependentes',
    'dependentes_propostas_corretores',
    'questionario_saude',
    'questionario_respostas',
    'respostas_questionario',
    'modelos_propostas',
    'produtos_corretores',
    'tabelas_precos_faixas'
)
ORDER BY tablename;

-- ============================================
-- 2. VERIFICAR POLÍTICAS RLS EXISTENTES
-- ============================================

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
WHERE tablename IN (
    'propostas',
    'propostas_corretores',
    'documentos_propostas',
    'documentos_propostas_corretores',
    'dependentes',
    'dependentes_propostas_corretores',
    'questionario_saude',
    'questionario_respostas',
    'respostas_questionario',
    'modelos_propostas',
    'produtos_corretores',
    'tabelas_precos_faixas'
)
ORDER BY tablename, policyname;

-- ============================================
-- 3. RESUMO POR TABELA
-- ============================================

DO $$
DECLARE
    tabela_nome TEXT;
    rls_status TEXT;
    num_policies INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMO DE RLS E POLÍTICAS';
    RAISE NOTICE '========================================';
    
    FOR tabela_nome IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename IN (
            'propostas',
            'propostas_corretores',
            'documentos_propostas',
            'documentos_propostas_corretores',
            'dependentes',
            'dependentes_propostas_corretores',
            'questionario_saude',
            'questionario_respostas',
            'respostas_questionario',
            'modelos_propostas'
        )
        ORDER BY tablename
    LOOP
        -- Verificar status RLS
        SELECT rowsecurity::TEXT INTO rls_status
        FROM pg_tables
        WHERE tablename = tabela_nome;
        
        -- Contar políticas
        SELECT COUNT(*) INTO num_policies
        FROM pg_policies
        WHERE tablename = tabela_nome;
        
        RAISE NOTICE '';
        RAISE NOTICE 'Tabela: %', tabela_nome;
        RAISE NOTICE '  RLS: %', CASE WHEN rls_status = 't' THEN 'HABILITADO ⚠️' ELSE 'DESABILITADO ✅' END;
        RAISE NOTICE '  Políticas: %', num_policies;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

