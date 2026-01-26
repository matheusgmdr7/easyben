-- ============================================
-- SCRIPT PARA CORRIGIR tenant_id EM ADMINISTRADORAS
-- ============================================
-- Este script verifica e corrige administradoras que não têm tenant_id
-- ============================================

-- Verificar administradoras sem tenant_id
SELECT 
    id,
    nome,
    cnpj,
    tenant_id,
    created_at
FROM administradoras
WHERE tenant_id IS NULL;

-- Se houver administradoras sem tenant_id, você precisa:
-- 1. Identificar qual tenant elas pertencem
-- 2. Atualizar manualmente ou usar o script abaixo

-- ATENÇÃO: Execute apenas se tiver certeza de qual tenant_id usar
-- Substitua 'SEU_TENANT_ID_AQUI' pelo UUID correto do tenant

-- Exemplo de atualização (DESCOMENTE E AJUSTE SE NECESSÁRIO):
/*
UPDATE administradoras
SET tenant_id = 'SEU_TENANT_ID_AQUI'::UUID
WHERE tenant_id IS NULL;

-- Depois de atualizar, tornar a coluna obrigatória (se todas tiverem tenant_id)
ALTER TABLE administradoras 
ALTER COLUMN tenant_id SET NOT NULL;
*/

-- Verificar se todas as administradoras agora têm tenant_id
SELECT 
    COUNT(*) as total,
    COUNT(tenant_id) as com_tenant_id,
    COUNT(*) - COUNT(tenant_id) as sem_tenant_id
FROM administradoras;







