-- ============================================
-- ADICIONAR CAMPOS DE IMPLANTAÇÃO E CARTEIRINHA
-- ============================================
-- Este script adiciona campos para controlar
-- a implantação do plano e número da carteirinha
-- ============================================

BEGIN;

-- 1. Adicionar campo de número da carteirinha
ALTER TABLE clientes_administradoras
ADD COLUMN IF NOT EXISTS numero_carteirinha VARCHAR(50);

-- 2. Adicionar campo de implantado (boolean)
ALTER TABLE clientes_administradoras
ADD COLUMN IF NOT EXISTS implantado BOOLEAN DEFAULT false;

-- 3. Atualizar constraint de status para incluir "aguardando_implantacao"
ALTER TABLE clientes_administradoras
DROP CONSTRAINT IF EXISTS clientes_administradoras_status_check;

ALTER TABLE clientes_administradoras
ADD CONSTRAINT clientes_administradoras_status_check 
CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'inadimplente', 'aguardando_implantacao'));

-- 4. Criar comentários para documentação
COMMENT ON COLUMN clientes_administradoras.numero_carteirinha IS 'Número da carteirinha do cliente';
COMMENT ON COLUMN clientes_administradoras.implantado IS 'Indica se o plano foi implantado (true) ou está aguardando implantação (false)';

COMMIT;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute esta query para verificar se os campos foram adicionados:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'clientes_administradoras'
-- AND column_name IN ('numero_carteirinha', 'implantado');
-- ============================================

