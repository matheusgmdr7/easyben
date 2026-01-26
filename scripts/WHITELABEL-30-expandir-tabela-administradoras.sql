-- ============================================
-- EXPANDIR TABELA ADMINISTRADORAS
-- ============================================
-- Este script adiciona campos completos de empresa
-- para o cadastro de administradoras
-- ============================================

BEGIN;

-- ============================================
-- 1. ADICIONAR CAMPOS DE EMPRESA
-- ============================================

-- Razão Social e Nome Fantasia
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'razao_social') THEN
        ALTER TABLE administradoras ADD COLUMN razao_social VARCHAR(255);
        RAISE NOTICE '✅ Coluna razao_social adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'nome_fantasia') THEN
        ALTER TABLE administradoras ADD COLUMN nome_fantasia VARCHAR(255);
        RAISE NOTICE '✅ Coluna nome_fantasia adicionada';
    END IF;
    
    -- Se nome já existe, copiar para nome_fantasia se estiver vazio
    UPDATE administradoras 
    SET nome_fantasia = nome 
    WHERE nome_fantasia IS NULL AND nome IS NOT NULL;
    
    -- Se razao_social está vazio, copiar de nome
    UPDATE administradoras 
    SET razao_social = nome 
    WHERE razao_social IS NULL AND nome IS NOT NULL;
END $$;

-- Inscrição Estadual e Municipal
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'inscricao_estadual') THEN
        ALTER TABLE administradoras ADD COLUMN inscricao_estadual VARCHAR(50);
        RAISE NOTICE '✅ Coluna inscricao_estadual adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'inscricao_municipal') THEN
        ALTER TABLE administradoras ADD COLUMN inscricao_municipal VARCHAR(50);
        RAISE NOTICE '✅ Coluna inscricao_municipal adicionada';
    END IF;
END $$;

-- Dados de Contato Adicionais
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'email_contato') THEN
        ALTER TABLE administradoras ADD COLUMN email_contato VARCHAR(255);
        RAISE NOTICE '✅ Coluna email_contato adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'telefone_contato') THEN
        ALTER TABLE administradoras ADD COLUMN telefone_contato VARCHAR(20);
        RAISE NOTICE '✅ Coluna telefone_contato adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'whatsapp') THEN
        ALTER TABLE administradoras ADD COLUMN whatsapp VARCHAR(20);
        RAISE NOTICE '✅ Coluna whatsapp adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'site') THEN
        ALTER TABLE administradoras ADD COLUMN site VARCHAR(255);
        RAISE NOTICE '✅ Coluna site adicionada';
    END IF;
END $$;

-- Endereço Completo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'numero') THEN
        ALTER TABLE administradoras ADD COLUMN numero VARCHAR(20);
        RAISE NOTICE '✅ Coluna numero adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'complemento') THEN
        ALTER TABLE administradoras ADD COLUMN complemento VARCHAR(255);
        RAISE NOTICE '✅ Coluna complemento adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'bairro') THEN
        ALTER TABLE administradoras ADD COLUMN bairro VARCHAR(100);
        RAISE NOTICE '✅ Coluna bairro adicionada';
    END IF;
END $$;

-- Dados Financeiros e Bancários
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'banco') THEN
        ALTER TABLE administradoras ADD COLUMN banco VARCHAR(100);
        RAISE NOTICE '✅ Coluna banco adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'agencia') THEN
        ALTER TABLE administradoras ADD COLUMN agencia VARCHAR(20);
        RAISE NOTICE '✅ Coluna agencia adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'conta') THEN
        ALTER TABLE administradoras ADD COLUMN conta VARCHAR(20);
        RAISE NOTICE '✅ Coluna conta adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'tipo_conta') THEN
        ALTER TABLE administradoras ADD COLUMN tipo_conta VARCHAR(20) CHECK (tipo_conta IN ('corrente', 'poupanca', 'salario'));
        RAISE NOTICE '✅ Coluna tipo_conta adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'chave_pix') THEN
        ALTER TABLE administradoras ADD COLUMN chave_pix VARCHAR(255);
        RAISE NOTICE '✅ Coluna chave_pix adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'tipo_chave_pix') THEN
        ALTER TABLE administradoras ADD COLUMN tipo_chave_pix VARCHAR(20) CHECK (tipo_chave_pix IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));
        RAISE NOTICE '✅ Coluna tipo_chave_pix adicionada';
    END IF;
END $$;

-- Dados de Representante Legal
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'representante_legal_nome') THEN
        ALTER TABLE administradoras ADD COLUMN representante_legal_nome VARCHAR(255);
        RAISE NOTICE '✅ Coluna representante_legal_nome adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'representante_legal_cpf') THEN
        ALTER TABLE administradoras ADD COLUMN representante_legal_cpf VARCHAR(14);
        RAISE NOTICE '✅ Coluna representante_legal_cpf adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'representante_legal_cargo') THEN
        ALTER TABLE administradoras ADD COLUMN representante_legal_cargo VARCHAR(100);
        RAISE NOTICE '✅ Coluna representante_legal_cargo adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'representante_legal_email') THEN
        ALTER TABLE administradoras ADD COLUMN representante_legal_email VARCHAR(255);
        RAISE NOTICE '✅ Coluna representante_legal_email adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'representante_legal_telefone') THEN
        ALTER TABLE administradoras ADD COLUMN representante_legal_telefone VARCHAR(20);
        RAISE NOTICE '✅ Coluna representante_legal_telefone adicionada';
    END IF;
END $$;

-- Sistema de Login/Autenticação
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'senha_hash') THEN
        ALTER TABLE administradoras ADD COLUMN senha_hash TEXT;
        RAISE NOTICE '✅ Coluna senha_hash adicionada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'email_login') THEN
        ALTER TABLE administradoras ADD COLUMN email_login VARCHAR(255) UNIQUE;
        RAISE NOTICE '✅ Coluna email_login adicionada';
    END IF;
    
    -- Se email já existe, copiar para email_login se estiver vazio
    UPDATE administradoras 
    SET email_login = email 
    WHERE email_login IS NULL AND email IS NOT NULL;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'administradoras' AND column_name = 'status_login') THEN
        ALTER TABLE administradoras ADD COLUMN status_login VARCHAR(20) DEFAULT 'pendente' CHECK (status_login IN ('pendente', 'ativo', 'bloqueado'));
        RAISE NOTICE '✅ Coluna status_login adicionada';
    END IF;
END $$;

-- ============================================
-- 2. CRIAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_administradoras_email_login ON administradoras(email_login);
CREATE INDEX IF NOT EXISTS idx_administradoras_status_login ON administradoras(status_login);
CREATE INDEX IF NOT EXISTS idx_administradoras_cnpj ON administradoras(cnpj);

-- ============================================
-- 3. COMENTÁRIOS
-- ============================================

COMMENT ON COLUMN administradoras.razao_social IS 'Razão social da empresa';
COMMENT ON COLUMN administradoras.nome_fantasia IS 'Nome fantasia da empresa';
COMMENT ON COLUMN administradoras.email_login IS 'Email usado para login no portal da administradora';
COMMENT ON COLUMN administradoras.senha_hash IS 'Hash da senha para autenticação';
COMMENT ON COLUMN administradoras.status_login IS 'Status do acesso ao portal (pendente, ativo, bloqueado)';

COMMIT;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Script executado com sucesso!';
    RAISE NOTICE '   Tabela administradoras expandida';
    RAISE NOTICE '   Campos de empresa adicionados';
    RAISE NOTICE '   Sistema de login preparado';
    RAISE NOTICE '========================================';
END $$;

