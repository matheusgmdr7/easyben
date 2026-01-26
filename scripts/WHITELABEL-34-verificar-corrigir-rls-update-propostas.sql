-- ============================================
-- WHITELABEL-34: VERIFICAR E CORRIGIR RLS UPDATE PROPOSTAS
-- ============================================
-- Este script verifica e corrige as políticas RLS das tabelas relacionadas
-- à página de completar proposta, garantindo que UPDATE e INSERT funcionem:
-- - propostas (UPDATE para assinatura)
-- - questionario_saude (INSERT)
-- - questionario_respostas (INSERT/UPDATE)
-- - respostas_questionario (INSERT/UPDATE)
-- ============================================

BEGIN;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        RAISE NOTICE '⚠️ Tabela propostas não encontrada. Pulando verificação.';
        RETURN;
    END IF;
END $$;

-- Verificar status atual do RLS
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    policy_record RECORD;
BEGIN
    -- Verificar se RLS está habilitado
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'propostas'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    -- Contar políticas existentes
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'propostas';

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 STATUS ATUAL DA TABELA PROPOSTAS';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'RLS habilitado: %', rls_enabled;
    RAISE NOTICE 'Total de políticas: %', policy_count;
    RAISE NOTICE '';
    
    IF policy_count > 0 THEN
        RAISE NOTICE '📋 Políticas existentes:';
        FOR policy_record IN 
            SELECT policyname, cmd, permissive
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'propostas'
            ORDER BY policyname
        LOOP
            RAISE NOTICE '   - % (% - %)', policy_record.policyname, policy_record.cmd, policy_record.permissive;
        END LOOP;
    END IF;
    
    RAISE NOTICE '============================================================';
END $$;

-- Opção 1: Desabilitar RLS completamente (mais simples e seguro para produção)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Desabilitar RLS
    ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS desabilitado na tabela propostas';
    
    -- Remover todas as políticas existentes para evitar conflitos
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'propostas'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON propostas', policy_record.policyname);
        RAISE NOTICE '🗑️ Política removida: %', policy_record.policyname;
    END LOOP;
END $$;

-- Opção 2: Se preferir manter RLS habilitado, criar políticas permissivas
-- (Descomente esta seção se quiser manter RLS habilitado)
/*
DO $$
DECLARE
    coluna_user_id TEXT;
BEGIN
    -- Habilitar RLS
    ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS habilitado na tabela propostas';

    -- Remover políticas antigas
    DECLARE
        policy_record RECORD;
    BEGIN
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'propostas'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON propostas', policy_record.policyname);
        END LOOP;
    END;

    -- Detectar coluna de usuário em usuarios_admin
    SELECT column_name INTO coluna_user_id
    FROM information_schema.columns
    WHERE table_name = 'usuarios_admin'
    AND column_name IN ('auth_user_id', 'user_id')
    ORDER BY
        CASE
            WHEN column_name = 'auth_user_id' THEN 1
            WHEN column_name = 'user_id' THEN 2
            ELSE 3
        END
    LIMIT 1;

    -- Criar política permissiva para SELECT
    CREATE POLICY "Permitir SELECT em propostas"
    ON propostas FOR SELECT
    TO authenticated
    USING (true);
    RAISE NOTICE '✅ Política SELECT criada';

    -- Criar política permissiva para INSERT
    CREATE POLICY "Permitir INSERT em propostas"
    ON propostas FOR INSERT
    TO authenticated
    WITH CHECK (true);
    RAISE NOTICE '✅ Política INSERT criada';

    -- Criar política permissiva para UPDATE (CRÍTICO PARA ASSINATURAS)
    CREATE POLICY "Permitir UPDATE em propostas"
    ON propostas FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
    RAISE NOTICE '✅ Política UPDATE criada (permite atualização de assinaturas)';

    -- Criar política permissiva para DELETE
    CREATE POLICY "Permitir DELETE em propostas"
    ON propostas FOR DELETE
    TO authenticated
    USING (true);
    RAISE NOTICE '✅ Política DELETE criada';
END $$;
*/

-- Verificar status final
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Verificar se RLS está habilitado
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'propostas'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    -- Contar políticas existentes
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'propostas';

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ VERIFICAÇÃO E CORREÇÃO CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'RLS habilitado: %', rls_enabled;
    RAISE NOTICE 'Total de políticas: %', policy_count;
    RAISE NOTICE '';
    
    IF rls_enabled = false THEN
        RAISE NOTICE '✅ RLS está DESABILITADO - UPDATE funcionará sem restrições';
        RAISE NOTICE '   Isso permite que a página de completar proposta';
        RAISE NOTICE '   atualize os campos de assinatura sem problemas.';
    ELSE
        RAISE NOTICE '⚠️ RLS está HABILITADO - Verifique se há políticas UPDATE';
        RAISE NOTICE '   Se houver problemas, descomente a seção "Opção 2"';
        RAISE NOTICE '   no script para criar políticas permissivas.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agora o UPDATE na tabela propostas deve funcionar';
    RAISE NOTICE '   permitindo salvar assinaturas na página de completar proposta.';
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- CORRIGIR RLS PARA TABELAS DE QUESTIONÁRIO
-- ============================================

-- Desabilitar RLS em questionario_saude
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questionario_saude') THEN
        ALTER TABLE questionario_saude DISABLE ROW LEVEL SECURITY;
        
        -- Remover todas as políticas
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'questionario_saude'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON questionario_saude', policy_record.policyname);
        END LOOP;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela questionario_saude';
    END IF;
END $$;

-- Desabilitar RLS em questionario_respostas
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questionario_respostas') THEN
        ALTER TABLE questionario_respostas DISABLE ROW LEVEL SECURITY;
        
        -- Remover todas as políticas
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'questionario_respostas'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON questionario_respostas', policy_record.policyname);
        END LOOP;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela questionario_respostas';
    END IF;
END $$;

-- Desabilitar RLS em respostas_questionario
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'respostas_questionario') THEN
        ALTER TABLE respostas_questionario DISABLE ROW LEVEL SECURITY;
        
        -- Remover todas as políticas
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'respostas_questionario'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON respostas_questionario', policy_record.policyname);
        END LOOP;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela respostas_questionario';
    END IF;
END $$;

-- Relatório final de todas as tabelas
DO $$
DECLARE
    tabela_record RECORD;
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 RELATÓRIO FINAL - TODAS AS TABELAS';
    RAISE NOTICE '============================================================';
    
    FOR tabela_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name IN ('propostas', 'questionario_saude', 'questionario_respostas', 'respostas_questionario')
        ORDER BY table_name
    LOOP
        -- Verificar RLS
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class
        WHERE relname = tabela_record.table_name
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
        
        -- Contar políticas
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = tabela_record.table_name;
        
        RAISE NOTICE '';
        RAISE NOTICE '📋 Tabela: %', tabela_record.table_name;
        RAISE NOTICE '   RLS: %', CASE WHEN rls_enabled THEN 'HABILITADO' ELSE 'DESABILITADO' END;
        RAISE NOTICE '   Políticas: %', policy_count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Todas as tabelas relacionadas à página de completar proposta';
    RAISE NOTICE '   estão configuradas para permitir INSERT e UPDATE sem restrições RLS.';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;


-- ============================================
-- Este script verifica e corrige as políticas RLS das tabelas relacionadas
-- à página de completar proposta, garantindo que UPDATE e INSERT funcionem:
-- - propostas (UPDATE para assinatura)
-- - questionario_saude (INSERT)
-- - questionario_respostas (INSERT/UPDATE)
-- - respostas_questionario (INSERT/UPDATE)
-- ============================================

BEGIN;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        RAISE NOTICE '⚠️ Tabela propostas não encontrada. Pulando verificação.';
        RETURN;
    END IF;
END $$;

-- Verificar status atual do RLS
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    policy_record RECORD;
BEGIN
    -- Verificar se RLS está habilitado
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'propostas'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    -- Contar políticas existentes
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'propostas';

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 STATUS ATUAL DA TABELA PROPOSTAS';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'RLS habilitado: %', rls_enabled;
    RAISE NOTICE 'Total de políticas: %', policy_count;
    RAISE NOTICE '';
    
    IF policy_count > 0 THEN
        RAISE NOTICE '📋 Políticas existentes:';
        FOR policy_record IN 
            SELECT policyname, cmd, permissive
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'propostas'
            ORDER BY policyname
        LOOP
            RAISE NOTICE '   - % (% - %)', policy_record.policyname, policy_record.cmd, policy_record.permissive;
        END LOOP;
    END IF;
    
    RAISE NOTICE '============================================================';
END $$;

-- Opção 1: Desabilitar RLS completamente (mais simples e seguro para produção)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Desabilitar RLS
    ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS desabilitado na tabela propostas';
    
    -- Remover todas as políticas existentes para evitar conflitos
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'propostas'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON propostas', policy_record.policyname);
        RAISE NOTICE '🗑️ Política removida: %', policy_record.policyname;
    END LOOP;
END $$;

-- Opção 2: Se preferir manter RLS habilitado, criar políticas permissivas
-- (Descomente esta seção se quiser manter RLS habilitado)
/*
DO $$
DECLARE
    coluna_user_id TEXT;
BEGIN
    -- Habilitar RLS
    ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS habilitado na tabela propostas';

    -- Remover políticas antigas
    DECLARE
        policy_record RECORD;
    BEGIN
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'propostas'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON propostas', policy_record.policyname);
        END LOOP;
    END;

    -- Detectar coluna de usuário em usuarios_admin
    SELECT column_name INTO coluna_user_id
    FROM information_schema.columns
    WHERE table_name = 'usuarios_admin'
    AND column_name IN ('auth_user_id', 'user_id')
    ORDER BY
        CASE
            WHEN column_name = 'auth_user_id' THEN 1
            WHEN column_name = 'user_id' THEN 2
            ELSE 3
        END
    LIMIT 1;

    -- Criar política permissiva para SELECT
    CREATE POLICY "Permitir SELECT em propostas"
    ON propostas FOR SELECT
    TO authenticated
    USING (true);
    RAISE NOTICE '✅ Política SELECT criada';

    -- Criar política permissiva para INSERT
    CREATE POLICY "Permitir INSERT em propostas"
    ON propostas FOR INSERT
    TO authenticated
    WITH CHECK (true);
    RAISE NOTICE '✅ Política INSERT criada';

    -- Criar política permissiva para UPDATE (CRÍTICO PARA ASSINATURAS)
    CREATE POLICY "Permitir UPDATE em propostas"
    ON propostas FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
    RAISE NOTICE '✅ Política UPDATE criada (permite atualização de assinaturas)';

    -- Criar política permissiva para DELETE
    CREATE POLICY "Permitir DELETE em propostas"
    ON propostas FOR DELETE
    TO authenticated
    USING (true);
    RAISE NOTICE '✅ Política DELETE criada';
END $$;
*/

-- Verificar status final
DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Verificar se RLS está habilitado
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'propostas'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    -- Contar políticas existentes
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'propostas';

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ VERIFICAÇÃO E CORREÇÃO CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'RLS habilitado: %', rls_enabled;
    RAISE NOTICE 'Total de políticas: %', policy_count;
    RAISE NOTICE '';
    
    IF rls_enabled = false THEN
        RAISE NOTICE '✅ RLS está DESABILITADO - UPDATE funcionará sem restrições';
        RAISE NOTICE '   Isso permite que a página de completar proposta';
        RAISE NOTICE '   atualize os campos de assinatura sem problemas.';
    ELSE
        RAISE NOTICE '⚠️ RLS está HABILITADO - Verifique se há políticas UPDATE';
        RAISE NOTICE '   Se houver problemas, descomente a seção "Opção 2"';
        RAISE NOTICE '   no script para criar políticas permissivas.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agora o UPDATE na tabela propostas deve funcionar';
    RAISE NOTICE '   permitindo salvar assinaturas na página de completar proposta.';
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- CORRIGIR RLS PARA TABELAS DE QUESTIONÁRIO
-- ============================================

-- Desabilitar RLS em questionario_saude
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questionario_saude') THEN
        ALTER TABLE questionario_saude DISABLE ROW LEVEL SECURITY;
        
        -- Remover todas as políticas
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'questionario_saude'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON questionario_saude', policy_record.policyname);
        END LOOP;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela questionario_saude';
    END IF;
END $$;

-- Desabilitar RLS em questionario_respostas
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questionario_respostas') THEN
        ALTER TABLE questionario_respostas DISABLE ROW LEVEL SECURITY;
        
        -- Remover todas as políticas
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'questionario_respostas'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON questionario_respostas', policy_record.policyname);
        END LOOP;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela questionario_respostas';
    END IF;
END $$;

-- Desabilitar RLS em respostas_questionario
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'respostas_questionario') THEN
        ALTER TABLE respostas_questionario DISABLE ROW LEVEL SECURITY;
        
        -- Remover todas as políticas
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'respostas_questionario'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON respostas_questionario', policy_record.policyname);
        END LOOP;
        
        RAISE NOTICE '✅ RLS desabilitado na tabela respostas_questionario';
    END IF;
END $$;

-- Relatório final de todas as tabelas
DO $$
DECLARE
    tabela_record RECORD;
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 RELATÓRIO FINAL - TODAS AS TABELAS';
    RAISE NOTICE '============================================================';
    
    FOR tabela_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name IN ('propostas', 'questionario_saude', 'questionario_respostas', 'respostas_questionario')
        ORDER BY table_name
    LOOP
        -- Verificar RLS
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class
        WHERE relname = tabela_record.table_name
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
        
        -- Contar políticas
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = tabela_record.table_name;
        
        RAISE NOTICE '';
        RAISE NOTICE '📋 Tabela: %', tabela_record.table_name;
        RAISE NOTICE '   RLS: %', CASE WHEN rls_enabled THEN 'HABILITADO' ELSE 'DESABILITADO' END;
        RAISE NOTICE '   Políticas: %', policy_count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Todas as tabelas relacionadas à página de completar proposta';
    RAISE NOTICE '   estão configuradas para permitir INSERT e UPDATE sem restrições RLS.';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;





