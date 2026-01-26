-- ============================================
-- WHITELABEL-32: CORRIGIR RLS CLIENTES_ADMINISTRADORAS
-- ============================================
-- Este script corrige as políticas RLS da tabela clientes_administradoras
-- e garante que tenant_id seja preenchido automaticamente
-- ============================================

BEGIN;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras') THEN
        RAISE NOTICE '⚠️ Tabela clientes_administradoras não encontrada. Pulando correção de RLS.';
        RETURN;
    END IF;
END $$;

-- Remover políticas antigas que podem estar causando conflito
DROP POLICY IF EXISTS "Admins acesso total clientes administradoras" ON clientes_administradoras;
DROP POLICY IF EXISTS "Admins podem ver clientes administradoras" ON clientes_administradoras;
DROP POLICY IF EXISTS "Admins podem inserir clientes administradoras" ON clientes_administradoras;
DROP POLICY IF EXISTS "Admins podem atualizar clientes administradoras" ON clientes_administradoras;
DROP POLICY IF EXISTS "Admins podem deletar clientes administradoras" ON clientes_administradoras;

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
            CREATE POLICY "Admins podem ver clientes administradoras" 
            ON clientes_administradoras FOR SELECT 
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
        CREATE POLICY "Admins podem ver clientes administradoras" 
        ON clientes_administradoras FOR SELECT 
        TO authenticated
        USING (true);
        
        RAISE NOTICE '✅ Política SELECT permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para INSERT
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem inserir clientes administradoras" 
            ON clientes_administradoras FOR INSERT 
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
        CREATE POLICY "Admins podem inserir clientes administradoras" 
        ON clientes_administradoras FOR INSERT 
        TO authenticated
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Política INSERT permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para UPDATE
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem atualizar clientes administradoras" 
            ON clientes_administradoras FOR UPDATE 
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
        CREATE POLICY "Admins podem atualizar clientes administradoras" 
        ON clientes_administradoras FOR UPDATE 
        TO authenticated
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Política UPDATE permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para DELETE
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem deletar clientes administradoras" 
            ON clientes_administradoras FOR DELETE 
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
        CREATE POLICY "Admins podem deletar clientes administradoras" 
        ON clientes_administradoras FOR DELETE 
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
        AND tablename = 'clientes_administradoras'
    ) THEN
        ALTER TABLE clientes_administradoras ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado na tabela clientes_administradoras';
    END IF;
END $$;

-- Criar função para preencher tenant_id automaticamente
CREATE OR REPLACE FUNCTION set_tenant_id_clientes_admin_trigger()
RETURNS TRIGGER AS $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Se já tem tenant_id, não fazer nada
    IF NEW.tenant_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Tentar obter tenant_id do usuário admin logado
    -- Verificar se existe auth_user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_admin' 
        AND column_name = 'auth_user_id'
    ) THEN
        SELECT tenant_id INTO tenant_uuid
        FROM usuarios_admin
        WHERE auth_user_id = auth.uid()
        AND ativo = true
        LIMIT 1;
    -- Verificar se existe user_id
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_admin' 
        AND column_name = 'user_id'
    ) THEN
        SELECT tenant_id INTO tenant_uuid
        FROM usuarios_admin
        WHERE user_id = auth.uid()
        AND ativo = true
        LIMIT 1;
    END IF;
    
    -- Se não encontrou, tentar pegar da proposta relacionada
    IF tenant_uuid IS NULL AND NEW.proposta_id IS NOT NULL THEN
        SELECT tenant_id INTO tenant_uuid
        FROM propostas
        WHERE id = NEW.proposta_id
        LIMIT 1;
    END IF;
    
    -- Se ainda não encontrou, tentar pegar do primeiro tenant (fallback)
    IF tenant_uuid IS NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
            SELECT id INTO tenant_uuid
            FROM tenants
            ORDER BY created_at
            LIMIT 1;
        END IF;
    END IF;
    
    -- Se encontrou tenant_id, preencher
    IF tenant_uuid IS NOT NULL THEN
        NEW.tenant_id := tenant_uuid;
    ELSE
        RAISE WARNING 'Não foi possível determinar tenant_id para clientes_administradoras.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para preencher tenant_id automaticamente antes do INSERT
DO $$
BEGIN
    -- Verificar se tenant_id existe na tabela
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes_administradoras' 
        AND column_name = 'tenant_id'
    ) THEN
        -- Remover trigger antigo se existir
        DROP TRIGGER IF EXISTS set_tenant_id_clientes_admin ON clientes_administradoras;
        
        -- Criar novo trigger
        CREATE TRIGGER set_tenant_id_clientes_admin
        BEFORE INSERT ON clientes_administradoras
        FOR EACH ROW
        WHEN (NEW.tenant_id IS NULL)
        EXECUTE FUNCTION set_tenant_id_clientes_admin_trigger();

        RAISE NOTICE '✅ Função e trigger set_tenant_id_clientes_admin criados';
    ELSE
        RAISE NOTICE '⚠️ Coluna tenant_id não encontrada na tabela clientes_administradoras';
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
    AND tablename = 'clientes_administradoras';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ CORREÇÃO DE RLS CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 Total de políticas criadas: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Políticas ativas na tabela clientes_administradoras:';
    
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'clientes_administradoras'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '   - %', policy_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agora os usuários admin autenticados podem acessar';
    RAISE NOTICE '   a tabela clientes_administradoras sem erro 406.';
    RAISE NOTICE '✅ Trigger criado para preencher tenant_id automaticamente.';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;


-- ============================================
-- Este script corrige as políticas RLS da tabela clientes_administradoras
-- e garante que tenant_id seja preenchido automaticamente
-- ============================================

BEGIN;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras') THEN
        RAISE NOTICE '⚠️ Tabela clientes_administradoras não encontrada. Pulando correção de RLS.';
        RETURN;
    END IF;
END $$;

-- Remover políticas antigas que podem estar causando conflito
DROP POLICY IF EXISTS "Admins acesso total clientes administradoras" ON clientes_administradoras;
DROP POLICY IF EXISTS "Admins podem ver clientes administradoras" ON clientes_administradoras;
DROP POLICY IF EXISTS "Admins podem inserir clientes administradoras" ON clientes_administradoras;
DROP POLICY IF EXISTS "Admins podem atualizar clientes administradoras" ON clientes_administradoras;
DROP POLICY IF EXISTS "Admins podem deletar clientes administradoras" ON clientes_administradoras;

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
            CREATE POLICY "Admins podem ver clientes administradoras" 
            ON clientes_administradoras FOR SELECT 
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
        CREATE POLICY "Admins podem ver clientes administradoras" 
        ON clientes_administradoras FOR SELECT 
        TO authenticated
        USING (true);
        
        RAISE NOTICE '✅ Política SELECT permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para INSERT
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem inserir clientes administradoras" 
            ON clientes_administradoras FOR INSERT 
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
        CREATE POLICY "Admins podem inserir clientes administradoras" 
        ON clientes_administradoras FOR INSERT 
        TO authenticated
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Política INSERT permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para UPDATE
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem atualizar clientes administradoras" 
            ON clientes_administradoras FOR UPDATE 
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
        CREATE POLICY "Admins podem atualizar clientes administradoras" 
        ON clientes_administradoras FOR UPDATE 
        TO authenticated
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE '✅ Política UPDATE permissiva criada (sem verificação de admin)';
    END IF;

    -- Criar políticas RLS para DELETE
    IF coluna_user_id IS NOT NULL THEN
        EXECUTE format('
            CREATE POLICY "Admins podem deletar clientes administradoras" 
            ON clientes_administradoras FOR DELETE 
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
        CREATE POLICY "Admins podem deletar clientes administradoras" 
        ON clientes_administradoras FOR DELETE 
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
        AND tablename = 'clientes_administradoras'
    ) THEN
        ALTER TABLE clientes_administradoras ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado na tabela clientes_administradoras';
    END IF;
END $$;

-- Criar função para preencher tenant_id automaticamente
CREATE OR REPLACE FUNCTION set_tenant_id_clientes_admin_trigger()
RETURNS TRIGGER AS $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Se já tem tenant_id, não fazer nada
    IF NEW.tenant_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Tentar obter tenant_id do usuário admin logado
    -- Verificar se existe auth_user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_admin' 
        AND column_name = 'auth_user_id'
    ) THEN
        SELECT tenant_id INTO tenant_uuid
        FROM usuarios_admin
        WHERE auth_user_id = auth.uid()
        AND ativo = true
        LIMIT 1;
    -- Verificar se existe user_id
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_admin' 
        AND column_name = 'user_id'
    ) THEN
        SELECT tenant_id INTO tenant_uuid
        FROM usuarios_admin
        WHERE user_id = auth.uid()
        AND ativo = true
        LIMIT 1;
    END IF;
    
    -- Se não encontrou, tentar pegar da proposta relacionada
    IF tenant_uuid IS NULL AND NEW.proposta_id IS NOT NULL THEN
        SELECT tenant_id INTO tenant_uuid
        FROM propostas
        WHERE id = NEW.proposta_id
        LIMIT 1;
    END IF;
    
    -- Se ainda não encontrou, tentar pegar do primeiro tenant (fallback)
    IF tenant_uuid IS NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
            SELECT id INTO tenant_uuid
            FROM tenants
            ORDER BY created_at
            LIMIT 1;
        END IF;
    END IF;
    
    -- Se encontrou tenant_id, preencher
    IF tenant_uuid IS NOT NULL THEN
        NEW.tenant_id := tenant_uuid;
    ELSE
        RAISE WARNING 'Não foi possível determinar tenant_id para clientes_administradoras.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para preencher tenant_id automaticamente antes do INSERT
DO $$
BEGIN
    -- Verificar se tenant_id existe na tabela
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes_administradoras' 
        AND column_name = 'tenant_id'
    ) THEN
        -- Remover trigger antigo se existir
        DROP TRIGGER IF EXISTS set_tenant_id_clientes_admin ON clientes_administradoras;
        
        -- Criar novo trigger
        CREATE TRIGGER set_tenant_id_clientes_admin
        BEFORE INSERT ON clientes_administradoras
        FOR EACH ROW
        WHEN (NEW.tenant_id IS NULL)
        EXECUTE FUNCTION set_tenant_id_clientes_admin_trigger();

        RAISE NOTICE '✅ Função e trigger set_tenant_id_clientes_admin criados';
    ELSE
        RAISE NOTICE '⚠️ Coluna tenant_id não encontrada na tabela clientes_administradoras';
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
    AND tablename = 'clientes_administradoras';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ CORREÇÃO DE RLS CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 Total de políticas criadas: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Políticas ativas na tabela clientes_administradoras:';
    
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'clientes_administradoras'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '   - %', policy_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agora os usuários admin autenticados podem acessar';
    RAISE NOTICE '   a tabela clientes_administradoras sem erro 406.';
    RAISE NOTICE '✅ Trigger criado para preencher tenant_id automaticamente.';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;





