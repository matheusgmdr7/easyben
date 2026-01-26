-- ============================================
-- REMOVER TODAS AS POLÍTICAS RLS DE PROPOSTAS
-- ============================================
-- Este script remove TODAS as políticas RLS existentes
-- e garante que RLS está desabilitado
-- ============================================

BEGIN;

-- ============================================
-- 1. REMOVER TODAS AS POLÍTICAS DA TABELA: propostas
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Remover todas as políticas existentes
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'propostas' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON propostas', policy_record.policyname);
        RAISE NOTICE 'Removida política: % da tabela propostas', policy_record.policyname;
    END LOOP;
    
    -- Desabilitar RLS
    ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS desabilitado na tabela propostas';
END $$;

-- ============================================
-- 2. REMOVER TODAS AS POLÍTICAS DA TABELA: dependentes
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Remover todas as políticas existentes
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'dependentes' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON dependentes', policy_record.policyname);
        RAISE NOTICE 'Removida política: % da tabela dependentes', policy_record.policyname;
    END LOOP;
    
    -- Desabilitar RLS
    ALTER TABLE dependentes DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS desabilitado na tabela dependentes';
END $$;

-- ============================================
-- 3. REMOVER TODAS AS POLÍTICAS DA TABELA: questionario_saude
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Remover todas as políticas existentes
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'questionario_saude' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON questionario_saude', policy_record.policyname);
        RAISE NOTICE 'Removida política: % da tabela questionario_saude', policy_record.policyname;
    END LOOP;
    
    -- Desabilitar RLS
    ALTER TABLE questionario_saude DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS desabilitado na tabela questionario_saude';
END $$;

-- ============================================
-- 4. REMOVER TODAS AS POLÍTICAS DA TABELA: propostas_corretores
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas_corretores') THEN
        -- Remover todas as políticas existentes
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'propostas_corretores' 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON propostas_corretores', policy_record.policyname);
            RAISE NOTICE 'Removida política: % da tabela propostas_corretores', policy_record.policyname;
        END LOOP;
        
        -- Desabilitar RLS
        ALTER TABLE propostas_corretores DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela propostas_corretores';
    END IF;
END $$;

-- ============================================
-- 5. REMOVER TODAS AS POLÍTICAS DA TABELA: documentos_propostas
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_propostas') THEN
        -- Remover todas as políticas existentes
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'documentos_propostas' 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON documentos_propostas', policy_record.policyname);
            RAISE NOTICE 'Removida política: % da tabela documentos_propostas', policy_record.policyname;
        END LOOP;
        
        -- Desabilitar RLS
        ALTER TABLE documentos_propostas DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela documentos_propostas';
    END IF;
END $$;

-- ============================================
-- 6. REMOVER TODAS AS POLÍTICAS DA TABELA: documentos_propostas_corretores
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_propostas_corretores') THEN
        -- Remover todas as políticas existentes
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'documentos_propostas_corretores' 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON documentos_propostas_corretores', policy_record.policyname);
            RAISE NOTICE 'Removida política: % da tabela documentos_propostas_corretores', policy_record.policyname;
        END LOOP;
        
        -- Desabilitar RLS
        ALTER TABLE documentos_propostas_corretores DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela documentos_propostas_corretores';
    END IF;
END $$;

-- ============================================
-- 7. REMOVER TODAS AS POLÍTICAS DA TABELA: dependentes_propostas_corretores
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dependentes_propostas_corretores') THEN
        -- Remover todas as políticas existentes
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'dependentes_propostas_corretores' 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON dependentes_propostas_corretores', policy_record.policyname);
            RAISE NOTICE 'Removida política: % da tabela dependentes_propostas_corretores', policy_record.policyname;
        END LOOP;
        
        -- Desabilitar RLS
        ALTER TABLE dependentes_propostas_corretores DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela dependentes_propostas_corretores';
    END IF;
END $$;

-- ============================================
-- 8. REMOVER TODAS AS POLÍTICAS DA TABELA: questionario_respostas
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questionario_respostas') THEN
        -- Remover todas as políticas existentes
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'questionario_respostas' 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON questionario_respostas', policy_record.policyname);
            RAISE NOTICE 'Removida política: % da tabela questionario_respostas', policy_record.policyname;
        END LOOP;
        
        -- Desabilitar RLS
        ALTER TABLE questionario_respostas DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela questionario_respostas';
    END IF;
END $$;

-- ============================================
-- 9. REMOVER TODAS AS POLÍTICAS DA TABELA: respostas_questionario
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'respostas_questionario') THEN
        -- Remover todas as políticas existentes
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'respostas_questionario' 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON respostas_questionario', policy_record.policyname);
            RAISE NOTICE 'Removida política: % da tabela respostas_questionario', policy_record.policyname;
        END LOOP;
        
        -- Desabilitar RLS
        ALTER TABLE respostas_questionario DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela respostas_questionario';
    END IF;
END $$;

-- ============================================
-- 10. REMOVER TODAS AS POLÍTICAS DA TABELA: modelos_propostas
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modelos_propostas') THEN
        -- Remover todas as políticas existentes
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'modelos_propostas' 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON modelos_propostas', policy_record.policyname);
            RAISE NOTICE 'Removida política: % da tabela modelos_propostas', policy_record.policyname;
        END LOOP;
        
        -- Desabilitar RLS
        ALTER TABLE modelos_propostas DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela modelos_propostas';
    END IF;
END $$;

-- ============================================
-- 11. REMOVER TODAS AS POLÍTICAS DA TABELA: produtos_corretores
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produtos_corretores') THEN
        -- Remover todas as políticas existentes
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'produtos_corretores' 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON produtos_corretores', policy_record.policyname);
            RAISE NOTICE 'Removida política: % da tabela produtos_corretores', policy_record.policyname;
        END LOOP;
        
        -- Desabilitar RLS
        ALTER TABLE produtos_corretores DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela produtos_corretores';
    END IF;
END $$;

-- ============================================
-- 12. REMOVER TODAS AS POLÍTICAS DA TABELA: tabelas_precos_faixas
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tabelas_precos_faixas') THEN
        -- Remover todas as políticas existentes
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'tabelas_precos_faixas' 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON tabelas_precos_faixas', policy_record.policyname);
            RAISE NOTICE 'Removida política: % da tabela tabelas_precos_faixas', policy_record.policyname;
        END LOOP;
        
        -- Desabilitar RLS
        ALTER TABLE tabelas_precos_faixas DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS desabilitado na tabela tabelas_precos_faixas';
    END IF;
END $$;

-- ============================================
-- 13. VERIFICAR RESULTADO FINAL
-- ============================================

DO $$
DECLARE
    rls_status TEXT;
    num_policies INTEGER;
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
    RAISE NOTICE 'RESULTADO FINAL DA LIMPEZA';
    RAISE NOTICE '========================================';
    
    FOREACH tabela_nome IN ARRAY tabelas_verificadas
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tabela_nome) THEN
            -- Verificar status RLS
            SELECT rowsecurity::TEXT INTO rls_status
            FROM pg_tables
            WHERE tablename = tabela_nome;
            
            -- Contar políticas restantes
            SELECT COUNT(*) INTO num_policies
            FROM pg_policies
            WHERE tablename = tabela_nome;
            
            RAISE NOTICE '';
            RAISE NOTICE 'Tabela: %', tabela_nome;
            RAISE NOTICE '  RLS: %', CASE WHEN rls_status = 'f' THEN 'DESABILITADO ✅' ELSE 'HABILITADO ⚠️' END;
            RAISE NOTICE '  Políticas restantes: %', num_policies;
            
            IF num_policies > 0 THEN
                RAISE WARNING '  ⚠️ ATENÇÃO: Ainda existem % políticas na tabela %!', num_policies, tabela_nome;
            END IF;
        ELSE
            RAISE NOTICE 'Tabela: % - NÃO ENCONTRADA', tabela_nome;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Script executado com sucesso!';
    RAISE NOTICE '   Todas as políticas foram removidas';
    RAISE NOTICE '   RLS foi desabilitado nas tabelas';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

