-- Script para adicionar campos necessários na tabela produtos_corretores
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar campo area_comercializacao
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'area_comercializacao'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN area_comercializacao VARCHAR(50);
        
        RAISE NOTICE '✅ Campo area_comercializacao adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo area_comercializacao já existe';
    END IF;
END $$;

-- 2. Adicionar campos de bonificação
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'bonificacao_tipo'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN bonificacao_tipo VARCHAR(20),
        ADD COLUMN bonificacao_valor DECIMAL(10,2),
        ADD COLUMN bonificacao_periodo INTEGER;
        
        RAISE NOTICE '✅ Campos de bonificação adicionados com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campos de bonificação já existem';
    END IF;
END $$;

-- 3. Adicionar campos de comissionamento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos_corretores' 
        AND column_name = 'comissao_porcentagem'
    ) THEN
        ALTER TABLE produtos_corretores 
        ADD COLUMN comissao_porcentagem DECIMAL(5,2),
        ADD COLUMN comissao_periodo INTEGER,
        ADD COLUMN comissao_vitalicia BOOLEAN DEFAULT false;
        
        RAISE NOTICE '✅ Campos de comissionamento adicionados com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campos de comissionamento já existem';
    END IF;
END $$;

-- 4. Criar tabela de autorização de produtos para corretores
CREATE TABLE IF NOT EXISTS produto_corretor_autorizacao (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES produtos_corretores(id) ON DELETE CASCADE,
  corretor_id BIGINT NOT NULL REFERENCES corretores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(produto_id, corretor_id, tenant_id)
);

-- 5. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_produto_corretor_autorizacao_produto_id 
ON produto_corretor_autorizacao(produto_id);

CREATE INDEX IF NOT EXISTS idx_produto_corretor_autorizacao_corretor_id 
ON produto_corretor_autorizacao(corretor_id);

CREATE INDEX IF NOT EXISTS idx_produto_corretor_autorizacao_tenant_id 
ON produto_corretor_autorizacao(tenant_id);

-- 6. Adicionar comentários para documentação
COMMENT ON COLUMN produtos_corretores.area_comercializacao IS 'Área de comercialização do produto: Nacional, Regional ou Estadual';
COMMENT ON COLUMN produtos_corretores.bonificacao_tipo IS 'Tipo de bonificação: porcentagem ou valor';
COMMENT ON COLUMN produtos_corretores.bonificacao_valor IS 'Valor da bonificação (porcentagem ou valor fixo)';
COMMENT ON COLUMN produtos_corretores.bonificacao_periodo IS 'Período da bonificação (quantas vezes será pago)';
COMMENT ON COLUMN produtos_corretores.comissao_porcentagem IS 'Porcentagem de comissão para o corretor';
COMMENT ON COLUMN produtos_corretores.comissao_periodo IS 'Período da comissão (quantas vezes será pago, null se vitalícia)';
COMMENT ON COLUMN produtos_corretores.comissao_vitalicia IS 'Indica se a comissão é vitalícia (paga enquanto o cliente estiver ativo)';

-- 7. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_produto_corretor_autorizacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_produto_corretor_autorizacao_updated_at_trigger 
ON produto_corretor_autorizacao;

CREATE TRIGGER update_produto_corretor_autorizacao_updated_at_trigger
BEFORE UPDATE ON produto_corretor_autorizacao
FOR EACH ROW
EXECUTE FUNCTION update_produto_corretor_autorizacao_updated_at();

RAISE NOTICE '✅ Script executado com sucesso!';









