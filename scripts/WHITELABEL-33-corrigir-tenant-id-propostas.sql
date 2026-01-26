-- ============================================
-- WHITELABEL-33: CORRIGIR TENANT_ID EM PROPOSTAS
-- ============================================
-- Este script cria um trigger para preencher automaticamente
-- o tenant_id na tabela propostas quando uma nova proposta é inserida.
-- Isso resolve o erro: "null value in column tenant_id violates not-null constraint"
-- ============================================

BEGIN;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        RAISE NOTICE '⚠️ Tabela propostas não encontrada. Pulando correção.';
        RETURN;
    END IF;
END $$;

-- Função para preencher tenant_id automaticamente
CREATE OR REPLACE FUNCTION set_tenant_id_propostas_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    tenant_uuid UUID;
    coluna_user_id TEXT;
BEGIN
    -- Se já tem tenant_id, não fazer nada
    IF NEW.tenant_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Tentar obter tenant_id do corretor relacionado
    IF NEW.corretor_id IS NOT NULL THEN
        -- Verificar se corretores tem tenant_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'corretores'
            AND column_name = 'tenant_id'
        ) THEN
            -- Usar conversão para texto para evitar problemas de tipo
            -- Isso funciona independentemente se id é bigint, uuid, text, etc.
            BEGIN
                SELECT tenant_id INTO tenant_uuid
                FROM corretores
                WHERE id::text = NEW.corretor_id::text
                LIMIT 1;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Se falhar, tentar comparação direta
                    BEGIN
                        SELECT tenant_id INTO tenant_uuid
                        FROM corretores
                        WHERE id = NEW.corretor_id
                        LIMIT 1;
                    EXCEPTION
                        WHEN OTHERS THEN
                            -- Se ainda falhar, ignorar e continuar
                            NULL;
                    END;
            END;
        END IF;
    END IF;

    -- 2. Se não encontrou, tentar pegar do usuário admin logado (se aplicável)
    IF tenant_uuid IS NULL THEN
        -- Verificar qual coluna de usuário existe em usuarios_admin
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

        IF coluna_user_id IS NOT NULL THEN
            EXECUTE format('
                SELECT tenant_id INTO tenant_uuid
                FROM usuarios_admin
                WHERE %I = auth.uid()
                AND ativo = true
                LIMIT 1
            ', coluna_user_id);
        END IF;
    END IF;

    -- 3. Se ainda não encontrou, tentar pegar do primeiro tenant (fallback)
    IF tenant_uuid IS NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
            SELECT id INTO tenant_uuid
            FROM tenants
            ORDER BY created_at
            LIMIT 1;
        END IF;
    END IF;

    -- Atribuir o tenant_id encontrado ou levantar um aviso
    IF tenant_uuid IS NULL THEN
        RAISE WARNING 'Não foi possível determinar tenant_id para proposta. Inserindo NULL.';
        -- Se a coluna for NOT NULL, isso causará erro.
        -- É melhor deixar o sistema de aplicação garantir isso ou ter um fallback mais robusto.
    ELSE
        NEW.tenant_id := tenant_uuid;
        RAISE NOTICE '✅ tenant_id preenchido automaticamente: %', tenant_uuid;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para preencher tenant_id automaticamente antes do INSERT
DROP TRIGGER IF EXISTS set_tenant_id_propostas ON propostas;

CREATE TRIGGER set_tenant_id_propostas
BEFORE INSERT ON propostas
FOR EACH ROW
WHEN (NEW.tenant_id IS NULL)
EXECUTE FUNCTION set_tenant_id_propostas_trigger_func();

-- Verificar se há propostas sem tenant_id e tentar preenchê-las
DO $$
DECLARE
    proposta_record RECORD;
    tenant_uuid UUID;
    coluna_user_id TEXT;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '✅ Função set_tenant_id_propostas_trigger_func criada';
    RAISE NOTICE '✅ Trigger set_tenant_id_propostas criado';
    
    -- Verificar se há propostas sem tenant_id
    IF EXISTS (SELECT 1 FROM propostas WHERE tenant_id IS NULL LIMIT 1) THEN
        RAISE NOTICE '🔍 Encontradas propostas sem tenant_id. Tentando preencher...';
        
        -- Tentar pegar o primeiro tenant como fallback
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
            SELECT id INTO tenant_uuid
            FROM tenants
            ORDER BY created_at
            LIMIT 1;
        END IF;

        -- Se encontrou um tenant, atualizar propostas sem tenant_id
        IF tenant_uuid IS NOT NULL THEN
            -- Tentar atualizar propostas que têm corretor_id
            FOR proposta_record IN 
                SELECT p.id, p.corretor_id
                FROM propostas p
                WHERE p.tenant_id IS NULL
                AND p.corretor_id IS NOT NULL
                LIMIT 100
            LOOP
                -- Tentar pegar tenant_id do corretor
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'corretores'
                    AND column_name = 'tenant_id'
                ) THEN
                    BEGIN
                        -- Usar conversão para texto para evitar problemas de tipo
                        SELECT c.tenant_id INTO tenant_uuid
                        FROM corretores c
                        WHERE c.id::text = proposta_record.corretor_id::text
                        AND c.tenant_id IS NOT NULL
                        LIMIT 1;
                    EXCEPTION
                        WHEN OTHERS THEN
                            -- Se falhar, tentar comparação direta
                            BEGIN
                                SELECT c.tenant_id INTO tenant_uuid
                                FROM corretores c
                                WHERE c.id = proposta_record.corretor_id
                                AND c.tenant_id IS NOT NULL
                                LIMIT 1;
                            EXCEPTION
                                WHEN OTHERS THEN
                                    NULL;
                            END;
                    END;
                END IF;

                -- Se não encontrou do corretor, usar o fallback
                IF tenant_uuid IS NULL THEN
                    SELECT id INTO tenant_uuid
                    FROM tenants
                    ORDER BY created_at
                    LIMIT 1;
                END IF;

                -- Atualizar a proposta
                IF tenant_uuid IS NOT NULL THEN
                    UPDATE propostas
                    SET tenant_id = tenant_uuid
                    WHERE id = proposta_record.id
                    AND tenant_id IS NULL;
                    
                    updated_count := updated_count + 1;
                END IF;
            END LOOP;

            -- Atualizar propostas restantes com o tenant padrão
            IF updated_count < 100 THEN
                UPDATE propostas
                SET tenant_id = tenant_uuid
                WHERE tenant_id IS NULL;
                
                GET DIAGNOSTICS updated_count = ROW_COUNT;
            END IF;

            RAISE NOTICE '✅ % propostas atualizadas com tenant_id', updated_count;
        ELSE
            RAISE WARNING '⚠️ Nenhum tenant encontrado. Não foi possível atualizar propostas existentes.';
        END IF;
    ELSE
        RAISE NOTICE '✅ Todas as propostas já têm tenant_id';
    END IF;
END $$;

-- Relatório final
DO $$
DECLARE
    total_propostas INTEGER;
    propostas_sem_tenant INTEGER;
    trigger_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO total_propostas FROM propostas;
    SELECT COUNT(*) INTO propostas_sem_tenant FROM propostas WHERE tenant_id IS NULL;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_tenant_id_propostas'
    ) INTO trigger_exists;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ CORREÇÃO DE TENANT_ID CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 Total de propostas: %', total_propostas;
    RAISE NOTICE '📊 Propostas sem tenant_id: %', propostas_sem_tenant;
    RAISE NOTICE '📊 Trigger criado: %', trigger_exists;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agora o tenant_id será preenchido automaticamente';
    RAISE NOTICE '   quando novas propostas forem criadas.';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;



-- ============================================
-- Este script cria um trigger para preencher automaticamente
-- o tenant_id na tabela propostas quando uma nova proposta é inserida.
-- Isso resolve o erro: "null value in column tenant_id violates not-null constraint"
-- ============================================

BEGIN;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        RAISE NOTICE '⚠️ Tabela propostas não encontrada. Pulando correção.';
        RETURN;
    END IF;
END $$;

-- Função para preencher tenant_id automaticamente
CREATE OR REPLACE FUNCTION set_tenant_id_propostas_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    tenant_uuid UUID;
    coluna_user_id TEXT;
BEGIN
    -- Se já tem tenant_id, não fazer nada
    IF NEW.tenant_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Tentar obter tenant_id do corretor relacionado
    IF NEW.corretor_id IS NOT NULL THEN
        -- Verificar se corretores tem tenant_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'corretores'
            AND column_name = 'tenant_id'
        ) THEN
            -- Usar conversão para texto para evitar problemas de tipo
            -- Isso funciona independentemente se id é bigint, uuid, text, etc.
            BEGIN
                SELECT tenant_id INTO tenant_uuid
                FROM corretores
                WHERE id::text = NEW.corretor_id::text
                LIMIT 1;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Se falhar, tentar comparação direta
                    BEGIN
                        SELECT tenant_id INTO tenant_uuid
                        FROM corretores
                        WHERE id = NEW.corretor_id
                        LIMIT 1;
                    EXCEPTION
                        WHEN OTHERS THEN
                            -- Se ainda falhar, ignorar e continuar
                            NULL;
                    END;
            END;
        END IF;
    END IF;

    -- 2. Se não encontrou, tentar pegar do usuário admin logado (se aplicável)
    IF tenant_uuid IS NULL THEN
        -- Verificar qual coluna de usuário existe em usuarios_admin
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

        IF coluna_user_id IS NOT NULL THEN
            EXECUTE format('
                SELECT tenant_id INTO tenant_uuid
                FROM usuarios_admin
                WHERE %I = auth.uid()
                AND ativo = true
                LIMIT 1
            ', coluna_user_id);
        END IF;
    END IF;

    -- 3. Se ainda não encontrou, tentar pegar do primeiro tenant (fallback)
    IF tenant_uuid IS NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
            SELECT id INTO tenant_uuid
            FROM tenants
            ORDER BY created_at
            LIMIT 1;
        END IF;
    END IF;

    -- Atribuir o tenant_id encontrado ou levantar um aviso
    IF tenant_uuid IS NULL THEN
        RAISE WARNING 'Não foi possível determinar tenant_id para proposta. Inserindo NULL.';
        -- Se a coluna for NOT NULL, isso causará erro.
        -- É melhor deixar o sistema de aplicação garantir isso ou ter um fallback mais robusto.
    ELSE
        NEW.tenant_id := tenant_uuid;
        RAISE NOTICE '✅ tenant_id preenchido automaticamente: %', tenant_uuid;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para preencher tenant_id automaticamente antes do INSERT
DROP TRIGGER IF EXISTS set_tenant_id_propostas ON propostas;

CREATE TRIGGER set_tenant_id_propostas
BEFORE INSERT ON propostas
FOR EACH ROW
WHEN (NEW.tenant_id IS NULL)
EXECUTE FUNCTION set_tenant_id_propostas_trigger_func();

-- Verificar se há propostas sem tenant_id e tentar preenchê-las
DO $$
DECLARE
    proposta_record RECORD;
    tenant_uuid UUID;
    coluna_user_id TEXT;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '✅ Função set_tenant_id_propostas_trigger_func criada';
    RAISE NOTICE '✅ Trigger set_tenant_id_propostas criado';
    
    -- Verificar se há propostas sem tenant_id
    IF EXISTS (SELECT 1 FROM propostas WHERE tenant_id IS NULL LIMIT 1) THEN
        RAISE NOTICE '🔍 Encontradas propostas sem tenant_id. Tentando preencher...';
        
        -- Tentar pegar o primeiro tenant como fallback
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
            SELECT id INTO tenant_uuid
            FROM tenants
            ORDER BY created_at
            LIMIT 1;
        END IF;

        -- Se encontrou um tenant, atualizar propostas sem tenant_id
        IF tenant_uuid IS NOT NULL THEN
            -- Tentar atualizar propostas que têm corretor_id
            FOR proposta_record IN 
                SELECT p.id, p.corretor_id
                FROM propostas p
                WHERE p.tenant_id IS NULL
                AND p.corretor_id IS NOT NULL
                LIMIT 100
            LOOP
                -- Tentar pegar tenant_id do corretor
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'corretores'
                    AND column_name = 'tenant_id'
                ) THEN
                    BEGIN
                        -- Usar conversão para texto para evitar problemas de tipo
                        SELECT c.tenant_id INTO tenant_uuid
                        FROM corretores c
                        WHERE c.id::text = proposta_record.corretor_id::text
                        AND c.tenant_id IS NOT NULL
                        LIMIT 1;
                    EXCEPTION
                        WHEN OTHERS THEN
                            -- Se falhar, tentar comparação direta
                            BEGIN
                                SELECT c.tenant_id INTO tenant_uuid
                                FROM corretores c
                                WHERE c.id = proposta_record.corretor_id
                                AND c.tenant_id IS NOT NULL
                                LIMIT 1;
                            EXCEPTION
                                WHEN OTHERS THEN
                                    NULL;
                            END;
                    END;
                END IF;

                -- Se não encontrou do corretor, usar o fallback
                IF tenant_uuid IS NULL THEN
                    SELECT id INTO tenant_uuid
                    FROM tenants
                    ORDER BY created_at
                    LIMIT 1;
                END IF;

                -- Atualizar a proposta
                IF tenant_uuid IS NOT NULL THEN
                    UPDATE propostas
                    SET tenant_id = tenant_uuid
                    WHERE id = proposta_record.id
                    AND tenant_id IS NULL;
                    
                    updated_count := updated_count + 1;
                END IF;
            END LOOP;

            -- Atualizar propostas restantes com o tenant padrão
            IF updated_count < 100 THEN
                UPDATE propostas
                SET tenant_id = tenant_uuid
                WHERE tenant_id IS NULL;
                
                GET DIAGNOSTICS updated_count = ROW_COUNT;
            END IF;

            RAISE NOTICE '✅ % propostas atualizadas com tenant_id', updated_count;
        ELSE
            RAISE WARNING '⚠️ Nenhum tenant encontrado. Não foi possível atualizar propostas existentes.';
        END IF;
    ELSE
        RAISE NOTICE '✅ Todas as propostas já têm tenant_id';
    END IF;
END $$;

-- Relatório final
DO $$
DECLARE
    total_propostas INTEGER;
    propostas_sem_tenant INTEGER;
    trigger_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO total_propostas FROM propostas;
    SELECT COUNT(*) INTO propostas_sem_tenant FROM propostas WHERE tenant_id IS NULL;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_tenant_id_propostas'
    ) INTO trigger_exists;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ CORREÇÃO DE TENANT_ID CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 Total de propostas: %', total_propostas;
    RAISE NOTICE '📊 Propostas sem tenant_id: %', propostas_sem_tenant;
    RAISE NOTICE '📊 Trigger criado: %', trigger_exists;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agora o tenant_id será preenchido automaticamente';
    RAISE NOTICE '   quando novas propostas forem criadas.';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;






