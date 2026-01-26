-- ============================================
-- SCRIPT: ADICIONAR CAMPOS NA TABELA TABELAS_PRECOS
-- ============================================
-- Este script adiciona os novos campos necessários
-- para o novo processo de criação de tabelas
-- ============================================

BEGIN;

-- ============================================
-- 1. ADICIONAR COLUNAS DE DATAS
-- ============================================

-- Data de Fechamento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tabelas_precos' 
        AND column_name = 'data_fechamento'
    ) THEN
        ALTER TABLE tabelas_precos 
        ADD COLUMN data_fechamento DATE;
        
        RAISE NOTICE '✅ Coluna data_fechamento adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna data_fechamento já existe';
    END IF;
END $$;

-- Data de Vencimento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tabelas_precos' 
        AND column_name = 'data_vencimento'
    ) THEN
        ALTER TABLE tabelas_precos 
        ADD COLUMN data_vencimento DATE;
        
        RAISE NOTICE '✅ Coluna data_vencimento adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna data_vencimento já existe';
    END IF;
END $$;

-- Data de Vigência
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tabelas_precos' 
        AND column_name = 'data_vigencia'
    ) THEN
        ALTER TABLE tabelas_precos 
        ADD COLUMN data_vigencia DATE;
        
        RAISE NOTICE '✅ Coluna data_vigencia adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna data_vigencia já existe';
    END IF;
END $$;

-- ============================================
-- 2. ADICIONAR COLUNAS DE IDS (SE NÃO EXISTIREM)
-- ============================================

-- Operadora ID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tabelas_precos' 
        AND column_name = 'operadora_id'
    ) THEN
        ALTER TABLE tabelas_precos 
        ADD COLUMN operadora_id UUID REFERENCES operadoras(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Coluna operadora_id adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna operadora_id já existe';
    END IF;
END $$;

-- Produto ID (opcional, para referência direta)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tabelas_precos' 
        AND column_name = 'produto_id'
    ) THEN
        ALTER TABLE tabelas_precos 
        ADD COLUMN produto_id BIGINT REFERENCES produtos_corretores(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Coluna produto_id adicionada';
    ELSE
        RAISE NOTICE '⚠️ Coluna produto_id já existe';
    END IF;
END $$;

-- ============================================
-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON COLUMN tabelas_precos.data_fechamento IS 'Data de fechamento da tabela';
COMMENT ON COLUMN tabelas_precos.data_vencimento IS 'Data de vencimento da tabela';
COMMENT ON COLUMN tabelas_precos.data_vigencia IS 'Data de vigência da tabela';
COMMENT ON COLUMN tabelas_precos.operadora_id IS 'ID da operadora vinculada (referência à tabela operadoras)';
COMMENT ON COLUMN tabelas_precos.produto_id IS 'ID do produto vinculado (referência à tabela produtos_corretores)';

COMMIT;

-- ============================================
-- ✅ Script executado com sucesso!
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Campos adicionados com sucesso!';
  RAISE NOTICE '📊 Colunas adicionadas: data_fechamento, data_vencimento, data_vigencia, operadora_id, produto_id';
END $$;







