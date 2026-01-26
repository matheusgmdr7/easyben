-- Script para adicionar campos necessários para unificação de produtos
-- Execute este script no Supabase SQL Editor

-- 1. ÁREA DE COMERCIALIZAÇÃO
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'area_comercializacao'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN area_comercializacao TEXT;
        
        RAISE NOTICE '✅ Campo area_comercializacao adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo area_comercializacao já existe';
    END IF;
END $$;

-- 2. BONIFICAÇÃO - TIPO (porcentagem ou valor)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'bonificacao_tipo'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN bonificacao_tipo TEXT CHECK (bonificacao_tipo IN ('porcentagem', 'valor') OR bonificacao_tipo IS NULL);
        
        RAISE NOTICE '✅ Campo bonificacao_tipo adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo bonificacao_tipo já existe';
    END IF;
END $$;

-- 3. BONIFICAÇÃO - VALOR/PORCENTAGEM
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'bonificacao_valor'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN bonificacao_valor DECIMAL(10,2) DEFAULT 0;
        
        RAISE NOTICE '✅ Campo bonificacao_valor adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo bonificacao_valor já existe';
    END IF;
END $$;

-- 4. BONIFICAÇÃO - PERÍODO (quantas vezes será pago)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'bonificacao_periodo'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN bonificacao_periodo INTEGER DEFAULT 0;
        
        RAISE NOTICE '✅ Campo bonificacao_periodo adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo bonificacao_periodo já existe';
    END IF;
END $$;

-- 5. COMISSIONAMENTO - PORCENTAGEM
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'comissionamento_porcentagem'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN comissionamento_porcentagem DECIMAL(5,2) DEFAULT 0;
        
        RAISE NOTICE '✅ Campo comissionamento_porcentagem adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo comissionamento_porcentagem já existe';
    END IF;
END $$;

-- 6. COMISSIONAMENTO - PERÍODO
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'comissionamento_periodo'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN comissionamento_periodo INTEGER DEFAULT 0;
        
        RAISE NOTICE '✅ Campo comissionamento_periodo adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo comissionamento_periodo já existe';
    END IF;
END $$;

-- 7. COMISSIONAMENTO - VITALÍCIA
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'comissionamento_vitalicia'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN comissionamento_vitalicia BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✅ Campo comissionamento_vitalicia adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo comissionamento_vitalicia já existe';
    END IF;
END $$;

-- 8. CAMPOS ADICIONAIS DO PRODUTO (baseado no print fornecido)
DO $$
BEGIN
    -- Código
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'codigo'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN codigo TEXT;
        
        RAISE NOTICE '✅ Campo codigo adicionado com sucesso!';
    END IF;
    
    -- Código Externo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'codigo_externo'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN codigo_externo TEXT;
        
        RAISE NOTICE '✅ Campo codigo_externo adicionado com sucesso!';
    END IF;
    
    -- Contratação
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'contratacao'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN contratacao TEXT;
        
        RAISE NOTICE '✅ Campo contratacao adicionado com sucesso!';
    END IF;
    
    -- Acomodações
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'acomodacoes'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN acomodacoes TEXT;
        
        RAISE NOTICE '✅ Campo acomodacoes adicionado com sucesso!';
    END IF;
    
    -- Co-participação
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'coparticipacao'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN coparticipacao TEXT;
        
        RAISE NOTICE '✅ Campo coparticipacao adicionado com sucesso!';
    END IF;
END $$;

-- 9. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_produtos_corretores_area_comercializacao 
ON produtos_corretores(area_comercializacao);

CREATE INDEX IF NOT EXISTS idx_produtos_corretores_codigo 
ON produtos_corretores(codigo);

-- 10. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN produtos_corretores.area_comercializacao IS 'Área de comercialização do produto (Nacional, Estadual, Regional)';
COMMENT ON COLUMN produtos_corretores.bonificacao_tipo IS 'Tipo de bonificação: porcentagem ou valor';
COMMENT ON COLUMN produtos_corretores.bonificacao_valor IS 'Valor ou porcentagem da bonificação';
COMMENT ON COLUMN produtos_corretores.bonificacao_periodo IS 'Quantas vezes a bonificação será paga';
COMMENT ON COLUMN produtos_corretores.comissionamento_porcentagem IS 'Porcentagem de comissionamento';
COMMENT ON COLUMN produtos_corretores.comissionamento_periodo IS 'Período de comissionamento (em meses)';
COMMENT ON COLUMN produtos_corretores.comissionamento_vitalicia IS 'Indica se a comissão é vitalícia';

-- Script executado com sucesso! Todos os campos foram adicionados.

