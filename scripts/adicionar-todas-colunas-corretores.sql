-- ============================================
-- SCRIPT: Adicionar TODAS as Colunas Necessárias na Tabela corretores
-- ============================================
-- Este script adiciona todas as colunas que podem estar faltando:
-- - Colunas básicas: nome, email, whatsapp, estado, cidade, cpf, data_nascimento
-- - Colunas de controle: ativo, status, is_gestor, acesso_portal_gestor, tenant_id
-- - Colunas empresariais: razao_social, nome_fantasia, cnpj
-- - Colunas financeiras: chave_pix, tipo_chave_pix, banco, agencia, conta, tipo_conta, nome_titular_conta, cpf_cnpj_titular_conta
-- ============================================

DO $$
BEGIN
    -- ============================================
    -- COLUNAS BÁSICAS
    -- ============================================
    
    -- Adicionar coluna whatsapp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE corretores ADD COLUMN whatsapp VARCHAR(20);
        RAISE NOTICE '✅ Coluna whatsapp adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna whatsapp já existe na tabela corretores';
    END IF;

    -- Adicionar coluna estado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'estado'
    ) THEN
        ALTER TABLE corretores ADD COLUMN estado VARCHAR(2);
        RAISE NOTICE '✅ Coluna estado adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna estado já existe na tabela corretores';
    END IF;

    -- Adicionar coluna cidade
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'cidade'
    ) THEN
        ALTER TABLE corretores ADD COLUMN cidade VARCHAR(255);
        RAISE NOTICE '✅ Coluna cidade adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna cidade já existe na tabela corretores';
    END IF;

    -- Adicionar coluna cpf
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'cpf'
    ) THEN
        ALTER TABLE corretores ADD COLUMN cpf VARCHAR(14);
        RAISE NOTICE '✅ Coluna cpf adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna cpf já existe na tabela corretores';
    END IF;

    -- Adicionar coluna data_nascimento
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'data_nascimento'
    ) THEN
        ALTER TABLE corretores ADD COLUMN data_nascimento DATE;
        RAISE NOTICE '✅ Coluna data_nascimento adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna data_nascimento já existe na tabela corretores';
    END IF;

    -- ============================================
    -- COLUNAS DE CONTROLE
    -- ============================================
    
    -- Adicionar coluna ativo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'ativo'
    ) THEN
        ALTER TABLE corretores ADD COLUMN ativo BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Coluna ativo adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna ativo já existe na tabela corretores';
    END IF;

    -- Adicionar coluna status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'status'
    ) THEN
        ALTER TABLE corretores ADD COLUMN status VARCHAR(50) DEFAULT 'pendente';
        RAISE NOTICE '✅ Coluna status adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna status já existe na tabela corretores';
    END IF;

    -- Adicionar coluna is_gestor
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'is_gestor'
    ) THEN
        ALTER TABLE corretores ADD COLUMN is_gestor BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Coluna is_gestor adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna is_gestor já existe na tabela corretores';
    END IF;

    -- Adicionar coluna acesso_portal_gestor
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'acesso_portal_gestor'
    ) THEN
        ALTER TABLE corretores ADD COLUMN acesso_portal_gestor BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Coluna acesso_portal_gestor adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna acesso_portal_gestor já existe na tabela corretores';
    END IF;

    -- Adicionar coluna tenant_id
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
    -- COLUNAS EMPRESARIAIS
    -- ============================================
    
    -- Adicionar coluna razao_social
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'razao_social'
    ) THEN
        ALTER TABLE corretores ADD COLUMN razao_social VARCHAR(255);
        RAISE NOTICE '✅ Coluna razao_social adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna razao_social já existe na tabela corretores';
    END IF;

    -- Adicionar coluna nome_fantasia
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'nome_fantasia'
    ) THEN
        ALTER TABLE corretores ADD COLUMN nome_fantasia VARCHAR(255);
        RAISE NOTICE '✅ Coluna nome_fantasia adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna nome_fantasia já existe na tabela corretores';
    END IF;

    -- Adicionar coluna cnpj (se não existir)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'cnpj'
    ) THEN
        ALTER TABLE corretores ADD COLUMN cnpj VARCHAR(18);
        RAISE NOTICE '✅ Coluna cnpj adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna cnpj já existe na tabela corretores';
    END IF;
END $$;

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN corretores.whatsapp IS 'Número do WhatsApp do corretor';
COMMENT ON COLUMN corretores.estado IS 'Estado (UF) do corretor';
COMMENT ON COLUMN corretores.cidade IS 'Cidade do corretor';
COMMENT ON COLUMN corretores.cpf IS 'CPF do corretor';
COMMENT ON COLUMN corretores.data_nascimento IS 'Data de nascimento do corretor';
COMMENT ON COLUMN corretores.ativo IS 'Indica se o corretor está ativo no sistema';
COMMENT ON COLUMN corretores.status IS 'Status do corretor: pendente, aprovado, reprovado';
COMMENT ON COLUMN corretores.is_gestor IS 'Indica se o corretor é um gestor';
COMMENT ON COLUMN corretores.acesso_portal_gestor IS 'Indica se o gestor tem acesso autorizado ao portal do gestor';
COMMENT ON COLUMN corretores.tenant_id IS 'ID do tenant (multi-tenancy)';
COMMENT ON COLUMN corretores.razao_social IS 'Razão social da empresa (para gestores que são empresas)';
COMMENT ON COLUMN corretores.nome_fantasia IS 'Nome fantasia da empresa (para gestores que são empresas)';
COMMENT ON COLUMN corretores.cnpj IS 'CNPJ do gestor (quando for empresa)';

-- ============================================
-- VERIFICAR ESTRUTURA CRIADA
-- ============================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'corretores' 
AND column_name IN (
    'whatsapp', 'estado', 'cidade', 'cpf', 'data_nascimento',
    'ativo', 'status', 'is_gestor', 'acesso_portal_gestor', 'tenant_id',
    'razao_social', 'nome_fantasia', 'cnpj'
)
ORDER BY column_name;

-- ============================================
-- ✅ Script executado com sucesso!
-- ============================================

