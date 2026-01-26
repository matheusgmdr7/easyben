-- ============================================
-- ADICIONAR CAMPOS FINANCEIROS E CNPJ NA TABELA CORRETORES
-- ============================================
-- Este script adiciona campos para dados financeiros (PIX e bancários)
-- e CNPJ para gestores (empresas)
-- ============================================

BEGIN;

-- ============================================
-- 1. ADICIONAR CAMPOS FINANCEIROS
-- ============================================

-- CNPJ (para gestores que são empresas)
DO $$
BEGIN
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

-- Chave PIX
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'chave_pix'
    ) THEN
        ALTER TABLE corretores ADD COLUMN chave_pix VARCHAR(255);
        RAISE NOTICE '✅ Coluna chave_pix adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna chave_pix já existe na tabela corretores';
    END IF;
END $$;

-- Tipo de chave PIX (CPF, CNPJ, Email, Telefone, Chave Aleatória)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'tipo_chave_pix'
    ) THEN
        ALTER TABLE corretores ADD COLUMN tipo_chave_pix VARCHAR(20);
        RAISE NOTICE '✅ Coluna tipo_chave_pix adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna tipo_chave_pix já existe na tabela corretores';
    END IF;
END $$;

-- Dados Bancários: Banco
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'banco'
    ) THEN
        ALTER TABLE corretores ADD COLUMN banco VARCHAR(100);
        RAISE NOTICE '✅ Coluna banco adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna banco já existe na tabela corretores';
    END IF;
END $$;

-- Dados Bancários: Agência
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'agencia'
    ) THEN
        ALTER TABLE corretores ADD COLUMN agencia VARCHAR(20);
        RAISE NOTICE '✅ Coluna agencia adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna agencia já existe na tabela corretores';
    END IF;
END $$;

-- Dados Bancários: Conta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'conta'
    ) THEN
        ALTER TABLE corretores ADD COLUMN conta VARCHAR(20);
        RAISE NOTICE '✅ Coluna conta adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna conta já existe na tabela corretores';
    END IF;
END $$;

-- Dados Bancários: Tipo de Conta (Corrente, Poupança)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'tipo_conta'
    ) THEN
        ALTER TABLE corretores ADD COLUMN tipo_conta VARCHAR(20);
        RAISE NOTICE '✅ Coluna tipo_conta adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna tipo_conta já existe na tabela corretores';
    END IF;
END $$;

-- Dados Bancários: Nome do Titular da Conta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'nome_titular_conta'
    ) THEN
        ALTER TABLE corretores ADD COLUMN nome_titular_conta VARCHAR(255);
        RAISE NOTICE '✅ Coluna nome_titular_conta adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna nome_titular_conta já existe na tabela corretores';
    END IF;
END $$;

-- Dados Bancários: CPF/CNPJ do Titular da Conta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'cpf_cnpj_titular_conta'
    ) THEN
        ALTER TABLE corretores ADD COLUMN cpf_cnpj_titular_conta VARCHAR(18);
        RAISE NOTICE '✅ Coluna cpf_cnpj_titular_conta adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna cpf_cnpj_titular_conta já existe na tabela corretores';
    END IF;
END $$;

-- ============================================
-- 2. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN corretores.cnpj IS 'CNPJ do gestor (quando for empresa)';
COMMENT ON COLUMN corretores.chave_pix IS 'Chave PIX para recebimento de comissões';
COMMENT ON COLUMN corretores.tipo_chave_pix IS 'Tipo da chave PIX: CPF, CNPJ, Email, Telefone, Chave Aleatória';
COMMENT ON COLUMN corretores.banco IS 'Nome do banco para recebimento';
COMMENT ON COLUMN corretores.agencia IS 'Agência bancária';
COMMENT ON COLUMN corretores.conta IS 'Número da conta bancária';
COMMENT ON COLUMN corretores.tipo_conta IS 'Tipo de conta: Corrente ou Poupança';
COMMENT ON COLUMN corretores.nome_titular_conta IS 'Nome do titular da conta bancária';
COMMENT ON COLUMN corretores.cpf_cnpj_titular_conta IS 'CPF ou CNPJ do titular da conta bancária';

-- ============================================
-- 3. VERIFICAR ESTRUTURA CRIADA
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CAMPOS FINANCEIROS ADICIONADOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CNPJ';
    RAISE NOTICE '✅ Chave PIX';
    RAISE NOTICE '✅ Tipo de Chave PIX';
    RAISE NOTICE '✅ Banco';
    RAISE NOTICE '✅ Agência';
    RAISE NOTICE '✅ Conta';
    RAISE NOTICE '✅ Tipo de Conta';
    RAISE NOTICE '✅ Nome do Titular da Conta';
    RAISE NOTICE '✅ CPF/CNPJ do Titular da Conta';
    RAISE NOTICE '========================================';
END $$;

COMMIT;

