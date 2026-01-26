-- ============================================
-- SCRIPT: Verificar e Corrigir Problemas no Cadastro de Corretor
-- ============================================
-- Este script verifica e adiciona todas as colunas necessárias
-- para o cadastro de corretor funcionar corretamente
-- ============================================

DO $$
BEGIN
    -- ============================================
    -- COLUNAS BÁSICAS OBRIGATÓRIAS
    -- ============================================
    
    -- Adicionar coluna cidade se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'cidade'
    ) THEN
        ALTER TABLE corretores ADD COLUMN cidade VARCHAR(255);
        RAISE NOTICE '✅ Coluna cidade adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna cidade já existe na tabela corretores';
    END IF;

    -- Adicionar coluna ativo se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'ativo'
    ) THEN
        ALTER TABLE corretores ADD COLUMN ativo BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Coluna ativo adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna ativo já existe na tabela corretores';
    END IF;

    -- Adicionar coluna acesso_portal_gestor se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'acesso_portal_gestor'
    ) THEN
        ALTER TABLE corretores ADD COLUMN acesso_portal_gestor BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Coluna acesso_portal_gestor adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna acesso_portal_gestor já existe na tabela corretores';
    END IF;

    -- Adicionar coluna razao_social se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'razao_social'
    ) THEN
        ALTER TABLE corretores ADD COLUMN razao_social VARCHAR(255);
        RAISE NOTICE '✅ Coluna razao_social adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna razao_social já existe na tabela corretores';
    END IF;

    -- Adicionar coluna nome_fantasia se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'nome_fantasia'
    ) THEN
        ALTER TABLE corretores ADD COLUMN nome_fantasia VARCHAR(255);
        RAISE NOTICE '✅ Coluna nome_fantasia adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna nome_fantasia já existe na tabela corretores';
    END IF;

    -- Adicionar coluna cnpj se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'cnpj'
    ) THEN
        ALTER TABLE corretores ADD COLUMN cnpj VARCHAR(18);
        RAISE NOTICE '✅ Coluna cnpj adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna cnpj já existe na tabela corretores';
    END IF;

    -- Adicionar coluna cpf se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'cpf'
    ) THEN
        ALTER TABLE corretores ADD COLUMN cpf VARCHAR(14);
        RAISE NOTICE '✅ Coluna cpf adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna cpf já existe na tabela corretores';
    END IF;

    -- Adicionar coluna data_nascimento se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'data_nascimento'
    ) THEN
        ALTER TABLE corretores ADD COLUMN data_nascimento DATE;
        RAISE NOTICE '✅ Coluna data_nascimento adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna data_nascimento já existe na tabela corretores';
    END IF;

    -- Adicionar coluna whatsapp se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE corretores ADD COLUMN whatsapp VARCHAR(20);
        RAISE NOTICE '✅ Coluna whatsapp adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna whatsapp já existe na tabela corretores';
    END IF;

    -- Adicionar coluna estado se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'estado'
    ) THEN
        ALTER TABLE corretores ADD COLUMN estado VARCHAR(2);
        RAISE NOTICE '✅ Coluna estado adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna estado já existe na tabela corretores';
    END IF;

    -- Adicionar coluna status se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'status'
    ) THEN
        ALTER TABLE corretores ADD COLUMN status VARCHAR(50) DEFAULT 'pendente';
        RAISE NOTICE '✅ Coluna status adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna status já existe na tabela corretores';
    END IF;

    -- Adicionar coluna is_gestor se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'is_gestor'
    ) THEN
        ALTER TABLE corretores ADD COLUMN is_gestor BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Coluna is_gestor adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna is_gestor já existe na tabela corretores';
    END IF;

    -- Adicionar coluna tenant_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE corretores ADD COLUMN tenant_id UUID;
        RAISE NOTICE '✅ Coluna tenant_id adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna tenant_id já existe na tabela corretores';
    END IF;

    -- ============================================
    -- COLUNAS FINANCEIRAS
    -- ============================================
    
    -- Adicionar coluna chave_pix se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'chave_pix'
    ) THEN
        ALTER TABLE corretores ADD COLUMN chave_pix VARCHAR(255);
        RAISE NOTICE '✅ Coluna chave_pix adicionada na tabela corretores';
    END IF;

    -- Adicionar coluna tipo_chave_pix se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'tipo_chave_pix'
    ) THEN
        ALTER TABLE corretores ADD COLUMN tipo_chave_pix VARCHAR(50);
        RAISE NOTICE '✅ Coluna tipo_chave_pix adicionada na tabela corretores';
    END IF;

    -- Adicionar coluna banco se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'banco'
    ) THEN
        ALTER TABLE corretores ADD COLUMN banco VARCHAR(100);
        RAISE NOTICE '✅ Coluna banco adicionada na tabela corretores';
    END IF;

    -- Adicionar coluna agencia se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'agencia'
    ) THEN
        ALTER TABLE corretores ADD COLUMN agencia VARCHAR(20);
        RAISE NOTICE '✅ Coluna agencia adicionada na tabela corretores';
    END IF;

    -- Adicionar coluna conta se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'conta'
    ) THEN
        ALTER TABLE corretores ADD COLUMN conta VARCHAR(20);
        RAISE NOTICE '✅ Coluna conta adicionada na tabela corretores';
    END IF;

    -- Adicionar coluna tipo_conta se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'tipo_conta'
    ) THEN
        ALTER TABLE corretores ADD COLUMN tipo_conta VARCHAR(20);
        RAISE NOTICE '✅ Coluna tipo_conta adicionada na tabela corretores';
    END IF;

    -- Adicionar coluna nome_titular_conta se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'nome_titular_conta'
    ) THEN
        ALTER TABLE corretores ADD COLUMN nome_titular_conta VARCHAR(255);
        RAISE NOTICE '✅ Coluna nome_titular_conta adicionada na tabela corretores';
    END IF;

    -- Adicionar coluna cpf_cnpj_titular_conta se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'cpf_cnpj_titular_conta'
    ) THEN
        ALTER TABLE corretores ADD COLUMN cpf_cnpj_titular_conta VARCHAR(18);
        RAISE NOTICE '✅ Coluna cpf_cnpj_titular_conta adicionada na tabela corretores';
    END IF;

    RAISE NOTICE '✅ Verificação e correção de colunas concluída!';
END $$;

-- ============================================
-- VERIFICAR SE HÁ REGISTROS COM VALORES NULL PROBLEMÁTICOS
-- ============================================

-- Atualizar registros existentes que podem ter problemas
UPDATE corretores 
SET 
    ativo = COALESCE(ativo, true),
    status = COALESCE(status, 'pendente'),
    is_gestor = COALESCE(is_gestor, false),
    acesso_portal_gestor = COALESCE(acesso_portal_gestor, false)
WHERE 
    ativo IS NULL 
    OR status IS NULL 
    OR is_gestor IS NULL 
    OR acesso_portal_gestor IS NULL;

-- ============================================
-- VERIFICAR POLÍTICAS RLS
-- ============================================

-- Verificar se as políticas RLS permitem INSERT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'corretores' 
        AND policyname LIKE '%insert%'
    ) THEN
        RAISE NOTICE '⚠️ ATENÇÃO: Não foram encontradas políticas RLS de INSERT para a tabela corretores';
        RAISE NOTICE '⚠️ É necessário criar políticas RLS para permitir o cadastro de corretores';
    ELSE
        RAISE NOTICE '✅ Políticas RLS de INSERT encontradas para a tabela corretores';
    END IF;
END $$;






