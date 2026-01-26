-- ============================================
-- CORRIGIR TENANT_ID DAS FATURAS IMPORTADAS
-- ============================================
-- Este script corrige o tenant_id das faturas importadas
-- para corresponder ao tenant_id da administradora

-- 1. Verificar situação atual
SELECT 
    'SITUAÇÃO ATUAL' as info,
    a.id as administradora_id,
    a.nome as administradora_nome,
    a.tenant_id as admin_tenant_id,
    COUNT(f.id) as total_faturas,
    COUNT(CASE WHEN f.tenant_id = a.tenant_id THEN 1 END) as faturas_corretas,
    COUNT(CASE WHEN f.tenant_id != a.tenant_id OR f.tenant_id IS NULL THEN 1 END) as faturas_incorretas
FROM administradoras a
LEFT JOIN faturas f ON f.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1'
GROUP BY a.id, a.nome, a.tenant_id;

-- 2. Atualizar tenant_id das faturas para corresponder ao tenant_id da administradora
UPDATE faturas f
SET tenant_id = a.tenant_id
FROM administradoras a
WHERE f.administradora_id = a.id
  AND a.id = '050be541-db3b-4d3c-be95-df80b68747f1'
  AND (f.tenant_id IS NULL OR f.tenant_id != a.tenant_id);

-- 3. Verificar resultado após correção
SELECT 
    'APÓS CORREÇÃO' as info,
    a.id as administradora_id,
    a.nome as administradora_nome,
    a.tenant_id as admin_tenant_id,
    COUNT(f.id) as total_faturas,
    COUNT(CASE WHEN f.tenant_id = a.tenant_id THEN 1 END) as faturas_corretas,
    COUNT(CASE WHEN f.tenant_id != a.tenant_id OR f.tenant_id IS NULL THEN 1 END) as faturas_incorretas
FROM administradoras a
LEFT JOIN faturas f ON f.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1'
GROUP BY a.id, a.nome, a.tenant_id;

-- 4. Mostrar algumas faturas corrigidas
SELECT 
    f.id,
    f.numero_fatura,
    f.cliente_nome,
    f.valor,
    f.status,
    f.tenant_id,
    f.administradora_id,
    f.created_at
FROM faturas f
WHERE f.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
ORDER BY f.created_at DESC
LIMIT 10;







