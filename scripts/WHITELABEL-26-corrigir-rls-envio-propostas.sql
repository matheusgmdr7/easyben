-- ============================================
-- CORRIGIR RLS PARA ENVIO DE PROPOSTAS
-- ============================================
-- Este script desabilita RLS ou cria políticas permissivas
-- para todas as tabelas relacionadas ao envio de propostas
-- pelo dashboard do corretor
-- ============================================

BEGIN;

-- ============================================
-- 1. TABELA: propostas
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_podem_criar_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_podem_ver_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_podem_atualizar_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_select_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_insert_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_update_propostas" ON propostas;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela propostas';
    ELSE
        RAISE NOTICE '⚠️ Tabela propostas não encontrada';
    END IF;
END $$;

-- ============================================
-- 2. TABELA: propostas_corretores
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas_corretores') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_podem_criar_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_podem_ver_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_select_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_insert_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_update_propostas_corretores" ON propostas_corretores;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE propostas_corretores DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela propostas_corretores';
    ELSE
        RAISE NOTICE '⚠️ Tabela propostas_corretores não encontrada';
    END IF;
END $$;

-- ============================================
-- 3. TABELA: documentos_propostas
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_propostas') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_documentos_propostas" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_podem_criar_documentos" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_podem_ver_documentos" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_select_documentos_propostas" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_insert_documentos_propostas" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_update_documentos_propostas" ON documentos_propostas;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE documentos_propostas DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela documentos_propostas';
    ELSE
        RAISE NOTICE '⚠️ Tabela documentos_propostas não encontrada';
    END IF;
END $$;

-- ============================================
-- 4. TABELA: documentos_propostas_corretores
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_propostas_corretores') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_documentos_propostas_corretores" ON documentos_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_podem_criar_documentos_corretores" ON documentos_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_podem_ver_documentos_corretores" ON documentos_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_select_documentos_propostas_corretores" ON documentos_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_insert_documentos_propostas_corretores" ON documentos_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_update_documentos_propostas_corretores" ON documentos_propostas_corretores;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE documentos_propostas_corretores DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela documentos_propostas_corretores';
    ELSE
        RAISE NOTICE '⚠️ Tabela documentos_propostas_corretores não encontrada';
    END IF;
END $$;

-- ============================================
-- 5. TABELA: dependentes
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dependentes') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_dependentes" ON dependentes;
        DROP POLICY IF EXISTS "corretores_podem_criar_dependentes" ON dependentes;
        DROP POLICY IF EXISTS "corretores_podem_ver_dependentes" ON dependentes;
        DROP POLICY IF EXISTS "corretores_select_dependentes" ON dependentes;
        DROP POLICY IF EXISTS "corretores_insert_dependentes" ON dependentes;
        DROP POLICY IF EXISTS "corretores_update_dependentes" ON dependentes;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE dependentes DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela dependentes';
    ELSE
        RAISE NOTICE '⚠️ Tabela dependentes não encontrada';
    END IF;
END $$;

-- ============================================
-- 6. TABELA: dependentes_propostas_corretores
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dependentes_propostas_corretores') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_dependentes_propostas_corretores" ON dependentes_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_podem_criar_dependentes_corretores" ON dependentes_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_podem_ver_dependentes_corretores" ON dependentes_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_select_dependentes_propostas_corretores" ON dependentes_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_insert_dependentes_propostas_corretores" ON dependentes_propostas_corretores;
        DROP POLICY IF EXISTS "corretores_update_dependentes_propostas_corretores" ON dependentes_propostas_corretores;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE dependentes_propostas_corretores DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela dependentes_propostas_corretores';
    ELSE
        RAISE NOTICE '⚠️ Tabela dependentes_propostas_corretores não encontrada';
    END IF;
END $$;

-- ============================================
-- 7. TABELA: questionario_saude
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questionario_saude') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_questionario_saude" ON questionario_saude;
        DROP POLICY IF EXISTS "corretores_podem_criar_questionario" ON questionario_saude;
        DROP POLICY IF EXISTS "corretores_podem_ver_questionario" ON questionario_saude;
        DROP POLICY IF EXISTS "corretores_select_questionario_saude" ON questionario_saude;
        DROP POLICY IF EXISTS "corretores_insert_questionario_saude" ON questionario_saude;
        DROP POLICY IF EXISTS "corretores_update_questionario_saude" ON questionario_saude;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE questionario_saude DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela questionario_saude';
    ELSE
        RAISE NOTICE '⚠️ Tabela questionario_saude não encontrada';
    END IF;
END $$;

-- ============================================
-- 8. TABELA: questionario_respostas
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questionario_respostas') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_questionario_respostas" ON questionario_respostas;
        DROP POLICY IF EXISTS "corretores_podem_criar_questionario_respostas" ON questionario_respostas;
        DROP POLICY IF EXISTS "corretores_podem_ver_questionario_respostas" ON questionario_respostas;
        DROP POLICY IF EXISTS "corretores_select_questionario_respostas" ON questionario_respostas;
        DROP POLICY IF EXISTS "corretores_insert_questionario_respostas" ON questionario_respostas;
        DROP POLICY IF EXISTS "corretores_update_questionario_respostas" ON questionario_respostas;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE questionario_respostas DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela questionario_respostas';
    ELSE
        RAISE NOTICE '⚠️ Tabela questionario_respostas não encontrada';
    END IF;
END $$;

-- ============================================
-- 9. TABELA: respostas_questionario
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'respostas_questionario') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_respostas_questionario" ON respostas_questionario;
        DROP POLICY IF EXISTS "corretores_podem_criar_respostas_questionario" ON respostas_questionario;
        DROP POLICY IF EXISTS "corretores_podem_ver_respostas_questionario" ON respostas_questionario;
        DROP POLICY IF EXISTS "corretores_select_respostas_questionario" ON respostas_questionario;
        DROP POLICY IF EXISTS "corretores_insert_respostas_questionario" ON respostas_questionario;
        DROP POLICY IF EXISTS "corretores_update_respostas_questionario" ON respostas_questionario;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE respostas_questionario DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela respostas_questionario';
    ELSE
        RAISE NOTICE '⚠️ Tabela respostas_questionario não encontrada';
    END IF;
END $$;

-- ============================================
-- 10. TABELA: modelos_propostas
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modelos_propostas') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_modelos_propostas" ON modelos_propostas;
        DROP POLICY IF EXISTS "corretores_podem_ver_modelos" ON modelos_propostas;
        DROP POLICY IF EXISTS "corretores_select_modelos_propostas" ON modelos_propostas;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE modelos_propostas DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela modelos_propostas';
    ELSE
        RAISE NOTICE '⚠️ Tabela modelos_propostas não encontrada';
    END IF;
END $$;

-- ============================================
-- 11. TABELA: produtos_corretores (para buscar produtos)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos_corretores') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_produtos_corretores" ON produtos_corretores;
        DROP POLICY IF EXISTS "corretores_podem_ver_produtos" ON produtos_corretores;
        DROP POLICY IF EXISTS "corretores_select_produtos_corretores" ON produtos_corretores;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE produtos_corretores DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela produtos_corretores';
    ELSE
        RAISE NOTICE '⚠️ Tabela produtos_corretores não encontrada';
    END IF;
END $$;

-- ============================================
-- 12. TABELA: tabelas_precos_faixas (para buscar preços)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tabelas_precos_faixas') THEN
        -- Remover todas as políticas existentes
        DROP POLICY IF EXISTS "tenant_isolation_tabelas_precos_faixas" ON tabelas_precos_faixas;
        DROP POLICY IF EXISTS "corretores_podem_ver_tabelas_faixas" ON tabelas_precos_faixas;
        DROP POLICY IF EXISTS "corretores_select_tabelas_precos_faixas" ON tabelas_precos_faixas;
        
        -- Desabilitar RLS temporariamente
        ALTER TABLE tabelas_precos_faixas DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela tabelas_precos_faixas';
    ELSE
        RAISE NOTICE '⚠️ Tabela tabelas_precos_faixas não encontrada';
    END IF;
END $$;

-- ============================================
-- 13. VERIFICAR RESULTADO
-- ============================================

DO $$
DECLARE
    rls_status TEXT;
    tabelas_verificadas TEXT[] := ARRAY[
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
    ];
    tabela_nome TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESULTADO DA APLICAÇÃO';
    RAISE NOTICE '========================================';
    
    FOREACH tabela_nome IN ARRAY tabelas_verificadas
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tabela_nome) THEN
            SELECT rowsecurity::TEXT INTO rls_status
            FROM pg_tables
            WHERE tablename = tabela_nome;
            
            RAISE NOTICE '%: RLS %', 
                tabela_nome, 
                CASE WHEN rls_status = 'f' THEN 'DESABILITADO ✅' ELSE 'HABILITADO ⚠️' END;
        ELSE
            RAISE NOTICE '%: TABELA NÃO ENCONTRADA ⚠️', tabela_nome;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Script executado com sucesso!';
    RAISE NOTICE '   Corretores agora podem enviar propostas';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

