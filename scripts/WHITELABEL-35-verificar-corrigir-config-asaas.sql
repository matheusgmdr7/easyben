-- ============================================
-- WHITELABEL-35: VERIFICAR E CORRIGIR CONFIGURAÇÃO ASAAS
-- ============================================
-- Este script verifica e corrige problemas na configuração
-- financeira das administradoras, especialmente para integração Asaas
-- ============================================

BEGIN;

-- ============================================
-- 1. VERIFICAR CONFIGURAÇÕES EXISTENTES
-- ============================================

DO $$
DECLARE
    config_record RECORD;
    total_configs INTEGER;
    configs_sem_api_key INTEGER;
    configs_inativas INTEGER;
    tem_tenant_id BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 DIAGNÓSTICO DE CONFIGURAÇÕES FINANCEIRAS';
    RAISE NOTICE '============================================================';
    
    -- Verificar se a coluna tenant_id existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'administradoras_config_financeira' 
        AND column_name = 'tenant_id'
    ) INTO tem_tenant_id;
    
    -- Contar total de configurações
    SELECT COUNT(*) INTO total_configs
    FROM administradoras_config_financeira;
    
    -- Contar configurações sem API key
    SELECT COUNT(*) INTO configs_sem_api_key
    FROM administradoras_config_financeira
    WHERE api_key IS NULL OR api_key = '';
    
    -- Contar configurações inativas
    SELECT COUNT(*) INTO configs_inativas
    FROM administradoras_config_financeira
    WHERE status_integracao != 'ativa' OR status_integracao IS NULL;
    
    RAISE NOTICE 'Total de configurações: %', total_configs;
    RAISE NOTICE 'Configurações sem API key: %', configs_sem_api_key;
    RAISE NOTICE 'Configurações inativas: %', configs_inativas;
    IF tem_tenant_id THEN
        RAISE NOTICE 'Coluna tenant_id: EXISTE';
    ELSE
        RAISE NOTICE 'Coluna tenant_id: NÃO EXISTE (não é necessária para este diagnóstico)';
    END IF;
    RAISE NOTICE '';
    
    -- Listar todas as configurações
    IF total_configs > 0 THEN
        RAISE NOTICE '📋 Detalhes das configurações:';
        FOR config_record IN 
            SELECT 
                id,
                administradora_id,
                instituicao_financeira,
                status_integracao,
                ambiente,
                CASE 
                    WHEN api_key IS NULL OR api_key = '' THEN 'SEM API KEY'
                    WHEN LENGTH(api_key) < 10 THEN 'API KEY MUITO CURTA'
                    ELSE 'API KEY OK'
                END as status_api_key,
                created_at,
                updated_at
            FROM administradoras_config_financeira
            ORDER BY created_at DESC
        LOOP
            RAISE NOTICE '';
            RAISE NOTICE '   ID: %', config_record.id;
            RAISE NOTICE '   Administradora ID: %', config_record.administradora_id;
            RAISE NOTICE '   Instituição: %', COALESCE(config_record.instituicao_financeira, 'NULL');
            RAISE NOTICE '   Status: %', COALESCE(config_record.status_integracao, 'NULL');
            RAISE NOTICE '   Ambiente: %', COALESCE(config_record.ambiente, 'NULL');
            RAISE NOTICE '   API Key: %', config_record.status_api_key;
            RAISE NOTICE '   Criado em: %', config_record.created_at;
        END LOOP;
    ELSE
        RAISE NOTICE '⚠️ Nenhuma configuração encontrada!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- 2. ADICIONAR COLUNA TENANT_ID SE NÃO EXISTIR (OPCIONAL)
-- ============================================

DO $$
DECLARE
    tem_tenant_id BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🔧 VERIFICANDO COLUNA TENANT_ID';
    RAISE NOTICE '============================================================';
    
    -- Verificar se a coluna tenant_id existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'administradoras_config_financeira' 
        AND column_name = 'tenant_id'
    ) INTO tem_tenant_id;
    
    IF NOT tem_tenant_id THEN
        RAISE NOTICE '⚠️ Coluna tenant_id não existe na tabela.';
        RAISE NOTICE '   Esta coluna não é obrigatória para o funcionamento';
        RAISE NOTICE '   da integração Asaas, mas pode ser útil para multi-tenancy.';
        RAISE NOTICE '   Pulando adição de tenant_id.';
    ELSE
        RAISE NOTICE '✅ Coluna tenant_id existe.';
        RAISE NOTICE '   (Não será atualizada neste script)';
    END IF;
    
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- 3. CORRIGIR STATUS DE INTEGRAÇÃO
-- ============================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🔧 CORRIGINDO STATUS DE INTEGRAÇÃO';
    RAISE NOTICE '============================================================';
    
    -- Atualizar status para "ativa" se tiver API key e for Asaas
    UPDATE administradoras_config_financeira
    SET status_integracao = 'ativa'
    WHERE (status_integracao IS NULL OR status_integracao != 'ativa')
    AND api_key IS NOT NULL
    AND api_key != ''
    AND LENGTH(api_key) >= 10
    AND instituicao_financeira = 'asaas';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE '✅ % configurações Asaas atualizadas para status "ativa"', updated_count;
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- 4. VERIFICAR E CORRIGIR INSTITUIÇÃO FINANCEIRA
-- ============================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🔧 CORRIGINDO INSTITUIÇÃO FINANCEIRA';
    RAISE NOTICE '============================================================';
    
    -- Se tiver API key mas não tiver instituição definida, definir como "asaas"
    UPDATE administradoras_config_financeira
    SET instituicao_financeira = 'asaas'
    WHERE (instituicao_financeira IS NULL OR instituicao_financeira = '')
    AND api_key IS NOT NULL
    AND api_key != ''
    AND LENGTH(api_key) >= 10;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE '✅ % configurações atualizadas com instituição "asaas"', updated_count;
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- 5. RELATÓRIO FINAL
-- ============================================

DO $$
DECLARE
    config_record RECORD;
    total_configs INTEGER;
    configs_ok INTEGER;
    configs_problema INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 RELATÓRIO FINAL';
    RAISE NOTICE '============================================================';
    
    SELECT COUNT(*) INTO total_configs
    FROM administradoras_config_financeira;
    
    -- Contar configurações OK (com todos os campos necessários)
    SELECT COUNT(*) INTO configs_ok
    FROM administradoras_config_financeira
    WHERE api_key IS NOT NULL
    AND api_key != ''
    AND LENGTH(api_key) >= 10
    AND instituicao_financeira = 'asaas'
    AND status_integracao = 'ativa';
    
    -- Contar configurações com problemas
    SELECT COUNT(*) INTO configs_problema
    FROM administradoras_config_financeira
    WHERE api_key IS NULL
    OR api_key = ''
    OR LENGTH(api_key) < 10
    OR instituicao_financeira != 'asaas'
    OR status_integracao != 'ativa';
    
    RAISE NOTICE 'Total de configurações: %', total_configs;
    RAISE NOTICE 'Configurações OK: %', configs_ok;
    RAISE NOTICE 'Configurações com problemas: %', configs_problema;
    RAISE NOTICE '';
    
    IF configs_problema > 0 THEN
        RAISE NOTICE '⚠️ Configurações que ainda precisam de atenção:';
        FOR config_record IN 
            SELECT 
                id,
                administradora_id,
                instituicao_financeira,
                status_integracao,
                CASE 
                    WHEN api_key IS NULL OR api_key = '' THEN 'Sem API key'
                    WHEN LENGTH(api_key) < 10 THEN 'API key muito curta'
                    WHEN instituicao_financeira != 'asaas' OR instituicao_financeira IS NULL THEN 'Instituição não é Asaas'
                    WHEN status_integracao != 'ativa' OR status_integracao IS NULL THEN 'Status não é ativa'
                    ELSE 'OK'
                END as problema
            FROM administradoras_config_financeira
            WHERE api_key IS NULL
            OR api_key = ''
            OR LENGTH(api_key) < 10
            OR instituicao_financeira != 'asaas'
            OR instituicao_financeira IS NULL
            OR status_integracao != 'ativa'
            OR status_integracao IS NULL
        LOOP
            RAISE NOTICE '   - ID: % | Admin: % | Problema: %', 
                config_record.id, 
                config_record.administradora_id, 
                config_record.problema;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ Todas as configurações estão corretas!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ VERIFICAÇÃO E CORREÇÃO CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Verifique se as configurações estão corretas acima';
    RAISE NOTICE '   2. Se ainda houver problemas, verifique se a API key';
    RAISE NOTICE '      foi salva corretamente na página de configurações';
    RAISE NOTICE '   3. Teste a integração novamente';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;


-- ============================================
-- Este script verifica e corrige problemas na configuração
-- financeira das administradoras, especialmente para integração Asaas
-- ============================================

BEGIN;

-- ============================================
-- 1. VERIFICAR CONFIGURAÇÕES EXISTENTES
-- ============================================

DO $$
DECLARE
    config_record RECORD;
    total_configs INTEGER;
    configs_sem_api_key INTEGER;
    configs_inativas INTEGER;
    tem_tenant_id BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 DIAGNÓSTICO DE CONFIGURAÇÕES FINANCEIRAS';
    RAISE NOTICE '============================================================';
    
    -- Verificar se a coluna tenant_id existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'administradoras_config_financeira' 
        AND column_name = 'tenant_id'
    ) INTO tem_tenant_id;
    
    -- Contar total de configurações
    SELECT COUNT(*) INTO total_configs
    FROM administradoras_config_financeira;
    
    -- Contar configurações sem API key
    SELECT COUNT(*) INTO configs_sem_api_key
    FROM administradoras_config_financeira
    WHERE api_key IS NULL OR api_key = '';
    
    -- Contar configurações inativas
    SELECT COUNT(*) INTO configs_inativas
    FROM administradoras_config_financeira
    WHERE status_integracao != 'ativa' OR status_integracao IS NULL;
    
    RAISE NOTICE 'Total de configurações: %', total_configs;
    RAISE NOTICE 'Configurações sem API key: %', configs_sem_api_key;
    RAISE NOTICE 'Configurações inativas: %', configs_inativas;
    IF tem_tenant_id THEN
        RAISE NOTICE 'Coluna tenant_id: EXISTE';
    ELSE
        RAISE NOTICE 'Coluna tenant_id: NÃO EXISTE (não é necessária para este diagnóstico)';
    END IF;
    RAISE NOTICE '';
    
    -- Listar todas as configurações
    IF total_configs > 0 THEN
        RAISE NOTICE '📋 Detalhes das configurações:';
        FOR config_record IN 
            SELECT 
                id,
                administradora_id,
                instituicao_financeira,
                status_integracao,
                ambiente,
                CASE 
                    WHEN api_key IS NULL OR api_key = '' THEN 'SEM API KEY'
                    WHEN LENGTH(api_key) < 10 THEN 'API KEY MUITO CURTA'
                    ELSE 'API KEY OK'
                END as status_api_key,
                created_at,
                updated_at
            FROM administradoras_config_financeira
            ORDER BY created_at DESC
        LOOP
            RAISE NOTICE '';
            RAISE NOTICE '   ID: %', config_record.id;
            RAISE NOTICE '   Administradora ID: %', config_record.administradora_id;
            RAISE NOTICE '   Instituição: %', COALESCE(config_record.instituicao_financeira, 'NULL');
            RAISE NOTICE '   Status: %', COALESCE(config_record.status_integracao, 'NULL');
            RAISE NOTICE '   Ambiente: %', COALESCE(config_record.ambiente, 'NULL');
            RAISE NOTICE '   API Key: %', config_record.status_api_key;
            RAISE NOTICE '   Criado em: %', config_record.created_at;
        END LOOP;
    ELSE
        RAISE NOTICE '⚠️ Nenhuma configuração encontrada!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- 2. ADICIONAR COLUNA TENANT_ID SE NÃO EXISTIR (OPCIONAL)
-- ============================================

DO $$
DECLARE
    tem_tenant_id BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🔧 VERIFICANDO COLUNA TENANT_ID';
    RAISE NOTICE '============================================================';
    
    -- Verificar se a coluna tenant_id existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'administradoras_config_financeira' 
        AND column_name = 'tenant_id'
    ) INTO tem_tenant_id;
    
    IF NOT tem_tenant_id THEN
        RAISE NOTICE '⚠️ Coluna tenant_id não existe na tabela.';
        RAISE NOTICE '   Esta coluna não é obrigatória para o funcionamento';
        RAISE NOTICE '   da integração Asaas, mas pode ser útil para multi-tenancy.';
        RAISE NOTICE '   Pulando adição de tenant_id.';
    ELSE
        RAISE NOTICE '✅ Coluna tenant_id existe.';
        RAISE NOTICE '   (Não será atualizada neste script)';
    END IF;
    
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- 3. CORRIGIR STATUS DE INTEGRAÇÃO
-- ============================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🔧 CORRIGINDO STATUS DE INTEGRAÇÃO';
    RAISE NOTICE '============================================================';
    
    -- Atualizar status para "ativa" se tiver API key e for Asaas
    UPDATE administradoras_config_financeira
    SET status_integracao = 'ativa'
    WHERE (status_integracao IS NULL OR status_integracao != 'ativa')
    AND api_key IS NOT NULL
    AND api_key != ''
    AND LENGTH(api_key) >= 10
    AND instituicao_financeira = 'asaas';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE '✅ % configurações Asaas atualizadas para status "ativa"', updated_count;
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- 4. VERIFICAR E CORRIGIR INSTITUIÇÃO FINANCEIRA
-- ============================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🔧 CORRIGINDO INSTITUIÇÃO FINANCEIRA';
    RAISE NOTICE '============================================================';
    
    -- Se tiver API key mas não tiver instituição definida, definir como "asaas"
    UPDATE administradoras_config_financeira
    SET instituicao_financeira = 'asaas'
    WHERE (instituicao_financeira IS NULL OR instituicao_financeira = '')
    AND api_key IS NOT NULL
    AND api_key != ''
    AND LENGTH(api_key) >= 10;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE '✅ % configurações atualizadas com instituição "asaas"', updated_count;
    RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- 5. RELATÓRIO FINAL
-- ============================================

DO $$
DECLARE
    config_record RECORD;
    total_configs INTEGER;
    configs_ok INTEGER;
    configs_problema INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '📊 RELATÓRIO FINAL';
    RAISE NOTICE '============================================================';
    
    SELECT COUNT(*) INTO total_configs
    FROM administradoras_config_financeira;
    
    -- Contar configurações OK (com todos os campos necessários)
    SELECT COUNT(*) INTO configs_ok
    FROM administradoras_config_financeira
    WHERE api_key IS NOT NULL
    AND api_key != ''
    AND LENGTH(api_key) >= 10
    AND instituicao_financeira = 'asaas'
    AND status_integracao = 'ativa';
    
    -- Contar configurações com problemas
    SELECT COUNT(*) INTO configs_problema
    FROM administradoras_config_financeira
    WHERE api_key IS NULL
    OR api_key = ''
    OR LENGTH(api_key) < 10
    OR instituicao_financeira != 'asaas'
    OR status_integracao != 'ativa';
    
    RAISE NOTICE 'Total de configurações: %', total_configs;
    RAISE NOTICE 'Configurações OK: %', configs_ok;
    RAISE NOTICE 'Configurações com problemas: %', configs_problema;
    RAISE NOTICE '';
    
    IF configs_problema > 0 THEN
        RAISE NOTICE '⚠️ Configurações que ainda precisam de atenção:';
        FOR config_record IN 
            SELECT 
                id,
                administradora_id,
                instituicao_financeira,
                status_integracao,
                CASE 
                    WHEN api_key IS NULL OR api_key = '' THEN 'Sem API key'
                    WHEN LENGTH(api_key) < 10 THEN 'API key muito curta'
                    WHEN instituicao_financeira != 'asaas' OR instituicao_financeira IS NULL THEN 'Instituição não é Asaas'
                    WHEN status_integracao != 'ativa' OR status_integracao IS NULL THEN 'Status não é ativa'
                    ELSE 'OK'
                END as problema
            FROM administradoras_config_financeira
            WHERE api_key IS NULL
            OR api_key = ''
            OR LENGTH(api_key) < 10
            OR instituicao_financeira != 'asaas'
            OR instituicao_financeira IS NULL
            OR status_integracao != 'ativa'
            OR status_integracao IS NULL
        LOOP
            RAISE NOTICE '   - ID: % | Admin: % | Problema: %', 
                config_record.id, 
                config_record.administradora_id, 
                config_record.problema;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ Todas as configurações estão corretas!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ VERIFICAÇÃO E CORREÇÃO CONCLUÍDA';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Verifique se as configurações estão corretas acima';
    RAISE NOTICE '   2. Se ainda houver problemas, verifique se a API key';
    RAISE NOTICE '      foi salva corretamente na página de configurações';
    RAISE NOTICE '   3. Teste a integração novamente';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;





