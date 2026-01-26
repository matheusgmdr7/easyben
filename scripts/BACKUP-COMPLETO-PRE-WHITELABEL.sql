-- ============================================
-- SCRIPT DE BACKUP COMPLETO - ANTES DE WHITE-LABEL
-- ============================================
-- ⚠️ EXECUTE ESTE SCRIPT ANTES DE QUALQUER MIGRAÇÃO!
-- ⚠️ Este script cria backups de todas as tabelas importantes
-- ============================================
-- Data sugerida de execução: [PREENCHER DATA]
-- ============================================

BEGIN;

-- Criar schema de backup
CREATE SCHEMA IF NOT EXISTS backup_pre_whitelabel;

-- Comentário no schema
COMMENT ON SCHEMA backup_pre_whitelabel IS 'Backup completo antes da migração para white-label multi-tenant';

-- Função para criar backup de tabela com timestamp
CREATE OR REPLACE FUNCTION backup_table(p_table_name TEXT, p_schema_name TEXT DEFAULT 'public')
RETURNS TEXT AS $$
DECLARE
    backup_table_name TEXT;
    timestamp_suffix TEXT;
    row_count BIGINT;
BEGIN
    -- Criar sufixo com timestamp
    timestamp_suffix := to_char(now(), 'YYYYMMDD_HH24MISS');
    backup_table_name := 'backup_pre_whitelabel.' || p_table_name || '_' || timestamp_suffix;
    
    -- Verificar se a tabela existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables t
        WHERE t.table_schema = p_schema_name 
        AND t.table_name = p_table_name
    ) THEN
        RAISE NOTICE '⚠️ Tabela % não existe, pulando...', p_table_name;
        RETURN NULL;
    END IF;
    
    -- Criar backup
    EXECUTE format('CREATE TABLE %I AS SELECT * FROM %I.%I', 
        backup_table_name, p_schema_name, p_table_name);
    
    -- Obter contagem de registros
    EXECUTE format('SELECT COUNT(*) FROM %I', backup_table_name) INTO row_count;
    RAISE NOTICE '✅ Backup criado: % (% registros)', backup_table_name, row_count;
    
    RETURN backup_table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INICIAR BACKUP DAS TABELAS PRINCIPAIS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🚀 Iniciando backup completo do banco de dados...';
    RAISE NOTICE '📅 Data/Hora: %', NOW();
END $$;

-- ============================================
-- TABELAS CRÍTICAS (Sempre fazer backup)
-- ============================================

-- 1. PROPOSTAS (CRÍTICO)
DO $$
BEGIN
    PERFORM backup_table('propostas');
    RAISE NOTICE '✅ Backup de propostas concluído';
END $$;

-- 2. CORRETORES (CRÍTICO)
DO $$
BEGIN
    PERFORM backup_table('corretores');
    RAISE NOTICE '✅ Backup de corretores concluído';
END $$;

-- 3. PRODUTOS (CRÍTICO)
DO $$
BEGIN
    PERFORM backup_table('produtos_corretores');
    RAISE NOTICE '✅ Backup de produtos_corretores concluído';
END $$;

-- 4. TABELAS DE PREÇOS (CRÍTICO)
DO $$
BEGIN
    PERFORM backup_table('tabelas_precos');
    PERFORM backup_table('tabelas_precos_faixas');
    RAISE NOTICE '✅ Backup de tabelas_precos concluído';
END $$;

-- ============================================
-- TABELAS IMPORTANTES (Se existirem)
-- ============================================

-- ADMINISTRADORAS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'administradoras') THEN
        PERFORM backup_table('administradoras');
        RAISE NOTICE '✅ Backup de administradoras concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela administradoras não existe, pulando...';
    END IF;
END $$;

-- CLIENTES_ADMINISTRADORAS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes_administradoras') THEN
        PERFORM backup_table('clientes_administradoras');
        RAISE NOTICE '✅ Backup de clientes_administradoras concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela clientes_administradoras não existe, pulando...';
    END IF;
END $$;

-- FATURAS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faturas') THEN
        PERFORM backup_table('faturas');
        RAISE NOTICE '✅ Backup de faturas concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela faturas não existe, pulando...';
    END IF;
END $$;

-- COMISSÕES
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comissoes') THEN
        PERFORM backup_table('comissoes');
        RAISE NOTICE '✅ Backup de comissoes concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela comissoes não existe, pulando...';
    END IF;
END $$;

-- USUÁRIOS ADMIN
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuarios_admin') THEN
        PERFORM backup_table('usuarios_admin');
        RAISE NOTICE '✅ Backup de usuarios_admin concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela usuarios_admin não existe, pulando...';
    END IF;
END $$;

-- LEADS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
        PERFORM backup_table('leads');
        RAISE NOTICE '✅ Backup de leads concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela leads não existe, pulando...';
    END IF;
END $$;

-- DEPENDENTES
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dependentes') THEN
        PERFORM backup_table('dependentes');
        RAISE NOTICE '✅ Backup de dependentes concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela dependentes não existe, pulando...';
    END IF;
END $$;

-- QUESTIONÁRIO
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questionario_respostas') THEN
        PERFORM backup_table('questionario_respostas');
        RAISE NOTICE '✅ Backup de questionario_respostas concluído';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'respostas_questionario') THEN
        PERFORM backup_table('respostas_questionario');
        RAISE NOTICE '✅ Backup de respostas_questionario concluído';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questionario_saude') THEN
        PERFORM backup_table('questionario_saude');
        RAISE NOTICE '✅ Backup de questionario_saude concluído';
    END IF;
END $$;

-- DOCUMENTOS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documentos') THEN
        PERFORM backup_table('documentos');
        RAISE NOTICE '✅ Backup de documentos concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela documentos não existe, pulando...';
    END IF;
END $$;

-- RELAÇÕES PRODUTO-TABELA
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produto_tabela_relacao') THEN
        PERFORM backup_table('produto_tabela_relacao');
        RAISE NOTICE '✅ Backup de produto_tabela_relacao concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela produto_tabela_relacao não existe, pulando...';
    END IF;
END $$;

-- CONFIGURAÇÕES FINANCEIRAS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'administradoras_config_financeira') THEN
        PERFORM backup_table('administradoras_config_financeira');
        RAISE NOTICE '✅ Backup de administradoras_config_financeira concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela administradoras_config_financeira não existe, pulando...';
    END IF;
END $$;

-- CONTRATOS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contratos') THEN
        PERFORM backup_table('contratos');
        RAISE NOTICE '✅ Backup de contratos concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela contratos não existe, pulando...';
    END IF;
END $$;

-- PAGAMENTOS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pagamentos') THEN
        PERFORM backup_table('pagamentos');
        RAISE NOTICE '✅ Backup de pagamentos concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela pagamentos não existe, pulando...';
    END IF;
END $$;

-- LOGS DE INTEGRAÇÃO
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logs_integracao_financeira') THEN
        PERFORM backup_table('logs_integracao_financeira');
        RAISE NOTICE '✅ Backup de logs_integracao_financeira concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela logs_integracao_financeira não existe, pulando...';
    END IF;
END $$;

-- MODELOS DE PROPOSTA
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'proposta_modelos') THEN
        PERFORM backup_table('proposta_modelos');
        RAISE NOTICE '✅ Backup de proposta_modelos concluído';
    ELSE
        RAISE NOTICE '⚠️ Tabela proposta_modelos não existe, pulando...';
    END IF;
END $$;

-- ============================================
-- RESUMO DO BACKUP
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ BACKUP COMPLETO FINALIZADO!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📅 Data/Hora: %', NOW();
    RAISE NOTICE '📁 Schema: backup_pre_whitelabel';
    RAISE NOTICE '';
    RAISE NOTICE 'Para verificar as tabelas de backup criadas, execute:';
    RAISE NOTICE 'SELECT tablename FROM pg_tables WHERE schemaname = ''backup_pre_whitelabel'' ORDER BY tablename;';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO DO BACKUP
-- ============================================
-- Execute após o backup para verificar:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho,
--     (SELECT COUNT(*) FROM backup_pre_whitelabel.propostas_*) as registros
-- FROM pg_tables
-- WHERE schemaname = 'backup_pre_whitelabel'
-- ORDER BY tablename;
-- 
-- ============================================
-- 📊 CONTAGEM DE REGISTROS POR TABELA
-- ============================================
-- Execute para ver quantos registros foram salvos:
-- 
-- DO $$
-- DECLARE
--     r RECORD;
--     count_result BIGINT;
-- BEGIN
--     FOR r IN 
--         SELECT tablename 
--         FROM pg_tables 
--         WHERE schemaname = 'backup_pre_whitelabel'
--     LOOP
--         EXECUTE format('SELECT COUNT(*) FROM backup_pre_whitelabel.%I', r.tablename) INTO count_result;
--         RAISE NOTICE 'Tabela: % | Registros: %', r.tablename, count_result;
--     END LOOP;
-- END $$;
-- ============================================

