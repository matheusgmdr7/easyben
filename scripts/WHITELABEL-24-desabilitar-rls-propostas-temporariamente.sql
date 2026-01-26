-- ============================================
-- DESABILITAR RLS TEMPORARIAMENTE PARA PROPOSTAS
-- ============================================
-- Este script desabilita RLS nas tabelas de propostas
-- para permitir que corretores possam enviar propostas
-- Similar à solução aplicada para login e admin sidebar
-- ============================================

BEGIN;

-- ============================================
-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES
-- ============================================

-- Tabela propostas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        -- Remover todas as políticas
        DROP POLICY IF EXISTS "tenant_isolation_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_podem_criar_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_podem_ver_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_podem_atualizar_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_select_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_insert_propostas" ON propostas;
        DROP POLICY IF EXISTS "corretores_update_propostas" ON propostas;
        
        -- Desabilitar RLS
        ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela propostas';
    ELSE
        RAISE NOTICE '⚠️ Tabela propostas não encontrada';
    END IF;
END $$;

-- Tabela documentos_propostas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_propostas') THEN
        -- Remover todas as políticas
        DROP POLICY IF EXISTS "tenant_isolation_documentos_propostas" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_podem_criar_documentos" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_podem_ver_documentos" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_select_documentos_propostas" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_insert_documentos_propostas" ON documentos_propostas;
        DROP POLICY IF EXISTS "corretores_update_documentos_propostas" ON documentos_propostas;
        
        -- Desabilitar RLS
        ALTER TABLE documentos_propostas DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela documentos_propostas';
    ELSE
        RAISE NOTICE '⚠️ Tabela documentos_propostas não encontrada';
    END IF;
END $$;

-- Tabela propostas_corretores
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas_corretores') THEN
        -- Remover todas as políticas
        DROP POLICY IF EXISTS "tenant_isolation_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_podem_criar_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_podem_ver_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_select_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_insert_propostas_corretores" ON propostas_corretores;
        DROP POLICY IF EXISTS "corretores_update_propostas_corretores" ON propostas_corretores;
        
        -- Desabilitar RLS
        ALTER TABLE propostas_corretores DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela propostas_corretores';
    ELSE
        RAISE NOTICE '⚠️ Tabela propostas_corretores não encontrada';
    END IF;
END $$;

-- Tabela modelos_propostas (usada para buscar templates)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modelos_propostas') THEN
        -- Remover todas as políticas
        DROP POLICY IF EXISTS "tenant_isolation_modelos_propostas" ON modelos_propostas;
        
        -- Desabilitar RLS
        ALTER TABLE modelos_propostas DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela modelos_propostas';
    ELSE
        RAISE NOTICE '⚠️ Tabela modelos_propostas não encontrada';
    END IF;
END $$;

-- ============================================
-- 2. VERIFICAR RESULTADO
-- ============================================

DO $$
DECLARE
    rls_status TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESULTADO DA APLICAÇÃO';
    RAISE NOTICE '========================================';
    
    -- Verificar propostas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        SELECT rowsecurity::TEXT INTO rls_status
        FROM pg_tables
        WHERE tablename = 'propostas';
        RAISE NOTICE 'propostas: RLS %', CASE WHEN rls_status = 'f' THEN 'DESABILITADO ✅' ELSE 'HABILITADO ⚠️' END;
    END IF;
    
    -- Verificar documentos_propostas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_propostas') THEN
        SELECT rowsecurity::TEXT INTO rls_status
        FROM pg_tables
        WHERE tablename = 'documentos_propostas';
        RAISE NOTICE 'documentos_propostas: RLS %', CASE WHEN rls_status = 'f' THEN 'DESABILITADO ✅' ELSE 'HABILITADO ⚠️' END;
    END IF;
    
    -- Verificar propostas_corretores
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas_corretores') THEN
        SELECT rowsecurity::TEXT INTO rls_status
        FROM pg_tables
        WHERE tablename = 'propostas_corretores';
        RAISE NOTICE 'propostas_corretores: RLS %', CASE WHEN rls_status = 'f' THEN 'DESABILITADO ✅' ELSE 'HABILITADO ⚠️' END;
    END IF;
    
    -- Verificar modelos_propostas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modelos_propostas') THEN
        SELECT rowsecurity::TEXT INTO rls_status
        FROM pg_tables
        WHERE tablename = 'modelos_propostas';
        RAISE NOTICE 'modelos_propostas: RLS %', CASE WHEN rls_status = 'f' THEN 'DESABILITADO ✅' ELSE 'HABILITADO ⚠️' END;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Script executado com sucesso!';
    RAISE NOTICE '   Corretores agora podem enviar propostas';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

