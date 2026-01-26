-- ============================================
-- WHITELABEL-31: CORRIGIR RLS ADMINISTRADORAS_CONFIG_FINANCEIRA
-- ============================================
-- Este script corrige as políticas RLS da tabela administradoras_config_financeira
-- para permitir acesso aos usuários admin autenticados, resolvendo o erro 406
-- que ocorre ao tentar buscar/salvar configurações financeiras.
-- ============================================

BEGIN;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras_config_financeira') THEN
        RAISE NOTICE '⚠️ Tabela administradoras_config_financeira não encontrada. Pulando correção de RLS.';
        RETURN;
    END IF;
END $$;

-- Remover políticas antigas que podem estar causando conflito
DROP POLICY IF EXISTS "Admins acesso total config financeira" ON administradoras_config_financeira;
DROP POLICY IF EXISTS "Admins podem ver config financeira" ON administradoras_config_financeira;
DROP POLICY IF EXISTS "Admins podem inserir config financeira" ON administradoras_config_financeira;
DROP POLICY IF EXISTS "Admins podem atualizar config financeira" ON administradoras_config_financeira;
DROP POLICY IF EXISTS "Admins podem deletar config financeira" ON administradoras_config_financeira;

-- Verificar qual coluna de usuário admin existe na tabela usuarios_admin
DO $$
DECLARE
    coluna_user_id TEXT;
BEGIN
    -- Verificar se existe auth_user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_admin' 
        AND column_name = 'auth_user_id'
    ) THEN
        coluna_user_id := 'auth_user_id';
    -- Verificar se existe user_id
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_admin' 
        AND column_name = 'user_id'
    ) THEN
        coluna_user_id := 'user_id';
    ELSE
        RAISE NOTICE '⚠️ Nenhuma coluna de user_id encontrada em usuarios_admin. Usando política permissiva.';
        coluna_user_id := NULL;
    END IF;

    -- Criar políticas RLS para SELECT
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem ver config financeira" 
            ON administradoras_config_financeira FOR SELECT 
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
        ', coluna_user_id);
        
        RAISE NOTICE '✅ Política SELECT criada usando coluna: %', coluna_user_id;
    ELSE
        -- Política permissiva se não encontrar coluna
        CREATE POLICY "Admins podem ver config financeira" 
        ON administradoras_config_financeira FOR SELECT 
        TO authenticated
        USING (true);
        
        RAISE NOTICE '✅ Política SELECT permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para INSERT
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem inserir config financeira" 
            ON administradoras_config_financeira FOR INSERT 
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
        ', coluna_user_id);
        
        RAISE NOTICE '✅ Política INSERT criada usando coluna: %', coluna_user_id;
    ELSE
        CREATE POLICY "Admins podem inserir config financeira" 
        ON administradoras_config_financeira FOR INSERT 
        TO authenticated
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Política INSERT permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para UPDATE
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem atualizar config financeira" 
            ON administradoras_config_financeira FOR UPDATE 
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
        ', coluna_user_id, coluna_user_id);
        
        RAISE NOTICE '✅ Política UPDATE criada usando coluna: %', coluna_user_id;
    ELSE
        CREATE POLICY "Admins podem atualizar config financeira" 
        ON administradoras_config_financeira FOR UPDATE 
        TO authenticated
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Política UPDATE permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para DELETE (opcional, mas incluído para completude)
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem deletar config financeira" 
            ON administradoras_config_financeira FOR DELETE 
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
        ', coluna_user_id);
        
        RAISE NOTICE '✅ Política DELETE criada usando coluna: %', coluna_user_id;
    ELSE
        CREATE POLICY "Admins podem deletar config financeira" 
        ON administradoras_config_financeira FOR DELETE 
        TO authenticated
        USING (true);
        
        RAISE NOTICE '✅ Política DELETE permissiva criada (sem verificação de admin)';
    END IF;
END $$;

-- Verificar se RLS está habilitado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'administradoras_config_financeira'
    ) THEN
        ALTER TABLE administradoras_config_financeira ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado na tabela administradoras_config_financeira';
    END IF;
END $$;

-- Verificar políticas criadas
DO $$
DECLARE
    policy_count INTEGER;
    policy_name TEXT;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'administradoras_config_financeira';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ CORREÇÃO DE RLS CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 Total de políticas criadas: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Políticas ativas na tabela administradoras_config_financeira:';
    
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'administradoras_config_financeira'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '   - %', policy_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agora os usuários admin autenticados podem acessar';
    RAISE NOTICE '   a tabela administradoras_config_financeira sem erro 406.';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;


-- ============================================
-- Este script corrige as políticas RLS da tabela administradoras_config_financeira
-- para permitir acesso aos usuários admin autenticados, resolvendo o erro 406
-- que ocorre ao tentar buscar/salvar configurações financeiras.
-- ============================================

BEGIN;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras_config_financeira') THEN
        RAISE NOTICE '⚠️ Tabela administradoras_config_financeira não encontrada. Pulando correção de RLS.';
        RETURN;
    END IF;
END $$;

-- Remover políticas antigas que podem estar causando conflito
DROP POLICY IF EXISTS "Admins acesso total config financeira" ON administradoras_config_financeira;
DROP POLICY IF EXISTS "Admins podem ver config financeira" ON administradoras_config_financeira;
DROP POLICY IF EXISTS "Admins podem inserir config financeira" ON administradoras_config_financeira;
DROP POLICY IF EXISTS "Admins podem atualizar config financeira" ON administradoras_config_financeira;
DROP POLICY IF EXISTS "Admins podem deletar config financeira" ON administradoras_config_financeira;

-- Verificar qual coluna de usuário admin existe na tabela usuarios_admin
DO $$
DECLARE
    coluna_user_id TEXT;
BEGIN
    -- Verificar se existe auth_user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_admin' 
        AND column_name = 'auth_user_id'
    ) THEN
        coluna_user_id := 'auth_user_id';
    -- Verificar se existe user_id
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_admin' 
        AND column_name = 'user_id'
    ) THEN
        coluna_user_id := 'user_id';
    ELSE
        RAISE NOTICE '⚠️ Nenhuma coluna de user_id encontrada em usuarios_admin. Usando política permissiva.';
        coluna_user_id := NULL;
    END IF;

    -- Criar políticas RLS para SELECT
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem ver config financeira" 
            ON administradoras_config_financeira FOR SELECT 
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
        ', coluna_user_id);
        
        RAISE NOTICE '✅ Política SELECT criada usando coluna: %', coluna_user_id;
    ELSE
        -- Política permissiva se não encontrar coluna
        CREATE POLICY "Admins podem ver config financeira" 
        ON administradoras_config_financeira FOR SELECT 
        TO authenticated
        USING (true);
        
        RAISE NOTICE '✅ Política SELECT permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para INSERT
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem inserir config financeira" 
            ON administradoras_config_financeira FOR INSERT 
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
        ', coluna_user_id);
        
        RAISE NOTICE '✅ Política INSERT criada usando coluna: %', coluna_user_id;
    ELSE
        CREATE POLICY "Admins podem inserir config financeira" 
        ON administradoras_config_financeira FOR INSERT 
        TO authenticated
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Política INSERT permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para UPDATE
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem atualizar config financeira" 
            ON administradoras_config_financeira FOR UPDATE 
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
        ', coluna_user_id, coluna_user_id);
        
        RAISE NOTICE '✅ Política UPDATE criada usando coluna: %', coluna_user_id;
    ELSE
        CREATE POLICY "Admins podem atualizar config financeira" 
        ON administradoras_config_financeira FOR UPDATE 
        TO authenticated
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Política UPDATE permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para DELETE (opcional, mas incluído para completude)
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem deletar config financeira" 
            ON administradoras_config_financeira FOR DELETE 
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM usuarios_admin 
                    WHERE usuarios_admin.%I = auth.uid()
                    AND usuarios_admin.ativo = true
                )
            )
        ', coluna_user_id);
        
        RAISE NOTICE '✅ Política DELETE criada usando coluna: %', coluna_user_id;
    ELSE
        CREATE POLICY "Admins podem deletar config financeira" 
        ON administradoras_config_financeira FOR DELETE 
        TO authenticated
        USING (true);
        
        RAISE NOTICE '✅ Política DELETE permissiva criada (sem verificação de admin)';
    END IF;
END $$;

-- Verificar se RLS está habilitado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'administradoras_config_financeira'
    ) THEN
        ALTER TABLE administradoras_config_financeira ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado na tabela administradoras_config_financeira';
    END IF;
END $$;

-- Verificar políticas criadas
DO $$
DECLARE
    policy_count INTEGER;
    policy_name TEXT;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'administradoras_config_financeira';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ CORREÇÃO DE RLS CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 Total de políticas criadas: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Políticas ativas na tabela administradoras_config_financeira:';
    
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'administradoras_config_financeira'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '   - %', policy_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agora os usuários admin autenticados podem acessar';
    RAISE NOTICE '   a tabela administradoras_config_financeira sem erro 406.';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;





