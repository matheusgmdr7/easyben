-- scripts/DEBUG-CONFIG-ASAAS.sql
-- Debug detalhado da configuração do Asaas

DO $$
DECLARE
    administradora_id_clube_ben UUID := 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';
BEGIN
    RAISE NOTICE '--- 🔍 DEBUG CONFIGURAÇÃO ASAAS ---';
    RAISE NOTICE 'Administradora ID: %', administradora_id_clube_ben;
    RAISE NOTICE '';

    -- 1. Verificar se a tabela existe
    RAISE NOTICE '📋 1. Verificando se a tabela existe...';
    PERFORM 1
    FROM information_schema.tables
    WHERE table_name = 'administradoras_config_financeira';
    
    IF FOUND THEN
        RAISE NOTICE '   ✅ Tabela administradoras_config_financeira existe';
    ELSE
        RAISE NOTICE '   ❌ Tabela administradoras_config_financeira NÃO existe!';
        RETURN;
    END IF;
    RAISE NOTICE '';

    -- 2. Verificar TODAS as configurações (sem filtro)
    RAISE NOTICE '📋 2. TODAS as configurações na tabela:';
    PERFORM
        '   ID: ' || id::TEXT as info,
        '   Administradora: ' || administradora_id::TEXT,
        '   Instituição: ' || COALESCE(instituicao_financeira, 'NULL'),
        '   API Key: ' || CASE WHEN api_key IS NOT NULL AND api_key != '' THEN 'Configurada (' || LENGTH(api_key) || ' chars)' ELSE 'NULL ou vazia' END,
        '   Ambiente: ' || COALESCE(ambiente, 'NULL'),
        '   Status: ' || COALESCE(status_integracao, 'NULL')
    FROM administradoras_config_financeira;
    RAISE NOTICE '';

    -- 3. Buscar configuração ESPECÍFICA da Clube Ben (sem filtro de status)
    RAISE NOTICE '📋 3. Configuração da Clube Ben (SEM filtro de status):';
    PERFORM
        '   ✅ ENCONTRADA!' as resultado,
        '   ID: ' || id::TEXT,
        '   Instituição: ' || COALESCE(instituicao_financeira, 'NULL'),
        '   API Key: ' || CASE WHEN api_key IS NOT NULL AND api_key != '' THEN 'Configurada (' || LENGTH(api_key) || ' chars)' ELSE 'NULL ou vazia' END,
        '   Ambiente: ' || COALESCE(ambiente, 'NULL'),
        '   Status Integração: ' || COALESCE(status_integracao, 'NULL'),
        '   Created: ' || created_at::TEXT,
        '   Updated: ' || COALESCE(updated_at::TEXT, 'NULL')
    FROM administradoras_config_financeira
    WHERE administradora_id = administradora_id_clube_ben;

    IF NOT FOUND THEN
        RAISE NOTICE '   ❌ Nenhuma configuração encontrada para esta administradora!';
    END IF;
    RAISE NOTICE '';

    -- 4. Buscar configuração COM filtro de status (como o código faz)
    RAISE NOTICE '📋 4. Configuração da Clube Ben (COM filtro status = "ativa"):';
    PERFORM
        '   ✅ ENCONTRADA!' as resultado,
        '   ID: ' || id::TEXT,
        '   Instituição: ' || COALESCE(instituicao_financeira, 'NULL'),
        '   API Key: ' || CASE WHEN api_key IS NOT NULL AND api_key != '' THEN 'Configurada (' || LENGTH(api_key) || ' chars)' ELSE 'NULL ou vazia' END,
        '   Ambiente: ' || COALESCE(ambiente, 'NULL'),
        '   Status Integração: ' || COALESCE(status_integracao, 'NULL')
    FROM administradoras_config_financeira
    WHERE administradora_id = administradora_id_clube_ben
    AND status_integracao = 'ativa';

    IF NOT FOUND THEN
        RAISE NOTICE '   ❌ Nenhuma configuração ATIVA encontrada!';
        RAISE NOTICE '   ⚠️ POSSÍVEL PROBLEMA: O status_integracao não está como "ativa"';
    END IF;
    RAISE NOTICE '';

    -- 5. Verificar estrutura da tabela
    RAISE NOTICE '📋 5. Estrutura da tabela:';
    PERFORM
        '   Coluna: ' || column_name,
        '   Tipo: ' || data_type,
        '   Nullable: ' || is_nullable,
        '   Default: ' || COALESCE(column_default, 'NULL')
    FROM information_schema.columns
    WHERE table_name = 'administradoras_config_financeira'
    ORDER BY ordinal_position;

    RAISE NOTICE '';
    RAISE NOTICE '--- ✅ DEBUG CONCLUÍDO ---';
END $$;