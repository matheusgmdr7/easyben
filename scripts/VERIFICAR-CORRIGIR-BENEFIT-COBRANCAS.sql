-- scripts/VERIFICAR-CORRIGIR-BENEFIT-COBRANCAS.sql
-- Script para verificar e corrigir a configuração do Asaas para BENEFIT COBRANCAS

BEGIN;

DO $$
DECLARE
    administradora_id_benefit UUID;
    config_id UUID;
    config_existe BOOLEAN := false;
    api_key_existe BOOLEAN := false;
    status_correto BOOLEAN := false;
    instituicao_correta BOOLEAN := false;
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🔍 VERIFICANDO CONFIGURAÇÃO BENEFIT COBRANCAS';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';

    -- 1. Buscar ID da administradora BENEFIT COBRANCAS
    SELECT id INTO administradora_id_benefit
    FROM administradoras
    WHERE nome ILIKE '%BENEFIT%COBRANCAS%'
       OR nome ILIKE '%BENEFIT COBRANCAS%'
    LIMIT 1;

    IF administradora_id_benefit IS NULL THEN
        RAISE NOTICE '❌ Administradora BENEFIT COBRANCAS não encontrada!';
        RAISE NOTICE '   Verifique se o nome está correto no banco de dados.';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Lista de administradoras disponíveis:';
        FOR rec IN 
            SELECT id, nome 
            FROM administradoras 
            ORDER BY nome
        LOOP
            RAISE NOTICE '   - % (ID: %)', rec.nome, rec.id;
        END LOOP;
        RETURN;
    END IF;

    RAISE NOTICE '✅ Administradora encontrada:';
    RAISE NOTICE '   ID: %', administradora_id_benefit;
    
    -- Buscar nome completo
    DECLARE
        nome_administradora TEXT;
    BEGIN
        SELECT nome INTO nome_administradora
        FROM administradoras
        WHERE id = administradora_id_benefit;
        
        RAISE NOTICE '   Nome: %', nome_administradora;
    END;

    RAISE NOTICE '';

    -- 2. Verificar se existe configuração financeira
    SELECT EXISTS (
        SELECT 1 FROM administradoras_config_financeira
        WHERE administradora_id = administradora_id_benefit
    ) INTO config_existe;

    IF NOT config_existe THEN
        RAISE NOTICE '⚠️ Configuração financeira NÃO encontrada!';
        RAISE NOTICE '   Criando configuração básica...';
        
        INSERT INTO administradoras_config_financeira (
            administradora_id,
            instituicao_financeira,
            status_integracao,
            ambiente
        ) VALUES (
            administradora_id_benefit,
            'asaas',
            'inativa',
            'producao'
        )
        RETURNING id INTO config_id;
        
        RAISE NOTICE '✅ Configuração básica criada (ID: %)', config_id;
        RAISE NOTICE '   ⚠️ ATENÇÃO: Configure a API Key na página de configurações!';
        RAISE NOTICE '';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Configuração financeira encontrada!';
    RAISE NOTICE '';

    -- 3. Verificar detalhes da configuração
    DECLARE
        config_record RECORD;
    BEGIN
        SELECT 
            id,
            instituicao_financeira,
            api_key,
            ambiente,
            status_integracao
        INTO config_record
        FROM administradoras_config_financeira
        WHERE administradora_id = administradora_id_benefit;

        config_id := config_record.id;

        RAISE NOTICE '📋 Detalhes da configuração atual:';
        RAISE NOTICE '   ID: %', config_record.id;
        RAISE NOTICE '   Instituição: %', COALESCE(config_record.instituicao_financeira, 'NULL');
        RAISE NOTICE '   API Key: %', 
            CASE 
                WHEN config_record.api_key IS NULL OR config_record.api_key = '' 
                THEN '❌ NÃO CONFIGURADA'
                ELSE '✅ Configurada (' || LENGTH(config_record.api_key) || ' caracteres)'
            END;
        RAISE NOTICE '   Ambiente: %', COALESCE(config_record.ambiente, 'NULL');
        RAISE NOTICE '   Status: %', COALESCE(config_record.status_integracao, 'NULL');
        RAISE NOTICE '';

        -- Verificar cada campo
        api_key_existe := (config_record.api_key IS NOT NULL AND config_record.api_key != '');
        status_correto := (config_record.status_integracao = 'ativa');
        instituicao_correta := (config_record.instituicao_financeira = 'asaas' OR config_record.instituicao_financeira IS NULL);

        -- 4. Aplicar correções necessárias
        IF NOT api_key_existe THEN
            RAISE NOTICE '⚠️ API Key não configurada!';
            RAISE NOTICE '   Configure a API Key na página de configurações da administradora.';
        END IF;

        IF NOT instituicao_correta THEN
            RAISE NOTICE '🔧 Corrigindo instituição financeira para "asaas"...';
            UPDATE administradoras_config_financeira
            SET 
                instituicao_financeira = 'asaas',
                updated_at = NOW()
            WHERE id = config_id;
            RAISE NOTICE '✅ Instituição financeira corrigida!';
        END IF;

        IF api_key_existe AND NOT status_correto THEN
            RAISE NOTICE '🔧 Corrigindo status da integração para "ativa"...';
            UPDATE administradoras_config_financeira
            SET 
                status_integracao = 'ativa',
                updated_at = NOW()
            WHERE id = config_id;
            RAISE NOTICE '✅ Status da integração corrigido para "ativa"!';
        END IF;

        -- 5. Verificação final
        RAISE NOTICE '';
        RAISE NOTICE '============================================================';
        RAISE NOTICE '📊 VERIFICAÇÃO FINAL';
        RAISE NOTICE '============================================================';

        SELECT 
            instituicao_financeira,
            CASE 
                WHEN api_key IS NOT NULL AND api_key != '' THEN '✅ Configurada'
                ELSE '❌ Não configurada'
            END as api_key_status,
            ambiente,
            status_integracao
        INTO config_record
        FROM administradoras_config_financeira
        WHERE id = config_id;

        RAISE NOTICE '   Instituição: %', COALESCE(config_record.instituicao_financeira, 'NULL');
        RAISE NOTICE '   API Key: %', config_record.api_key_status;
        RAISE NOTICE '   Ambiente: %', COALESCE(config_record.ambiente, 'NULL');
        RAISE NOTICE '   Status: %', COALESCE(config_record.status_integracao, 'NULL');
        RAISE NOTICE '';

        IF api_key_existe AND status_correto AND instituicao_correta THEN
            RAISE NOTICE '✅ CONFIGURAÇÃO CORRETA!';
            RAISE NOTICE '   A integração com Asaas deve funcionar corretamente.';
        ELSIF NOT api_key_existe THEN
            RAISE NOTICE '⚠️ CONFIGURAÇÃO INCOMPLETA!';
            RAISE NOTICE '   Configure a API Key na página de configurações.';
        ELSE
            RAISE NOTICE '⚠️ CONFIGURAÇÃO PARCIALMENTE CORRIGIDA!';
            RAISE NOTICE '   Verifique se a API Key está correta.';
        END IF;

        RAISE NOTICE '============================================================';
    END;
END;
$$ LANGUAGE plpgsql;

COMMIT;







