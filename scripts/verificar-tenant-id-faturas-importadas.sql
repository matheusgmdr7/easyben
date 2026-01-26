-- ============================================
-- VERIFICAR TENANT_ID DAS FATURAS IMPORTADAS
-- ============================================
-- Este script verifica se as faturas importadas têm o tenant_id correto

-- 1. Verificar tenant_id da administradora
SELECT 
    'ADMINISTRADORA' as tipo,
    id,
    nome,
    tenant_id
FROM administradoras
WHERE id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 2. Verificar tenant_id das faturas importadas
SELECT 
    'FATURAS IMPORTADAS' as tipo,
    COUNT(*) as total_faturas,
    COUNT(DISTINCT tenant_id) as tenant_ids_distintos,
    STRING_AGG(DISTINCT tenant_id::text, ', ') as tenant_ids_encontrados
FROM faturas
WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 3. Verificar se há faturas sem tenant_id
SELECT 
    'FATURAS SEM TENANT_ID' as tipo,
    COUNT(*) as total
FROM faturas
WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
AND tenant_id IS NULL;

-- 4. Comparar tenant_id da administradora com tenant_id das faturas
SELECT 
    a.id as administradora_id,
    a.nome as administradora_nome,
    a.tenant_id as admin_tenant_id,
    COUNT(f.id) as total_faturas,
    COUNT(CASE WHEN f.tenant_id = a.tenant_id THEN 1 END) as faturas_com_tenant_correto,
    COUNT(CASE WHEN f.tenant_id != a.tenant_id OR f.tenant_id IS NULL THEN 1 END) as faturas_com_tenant_incorreto
FROM administradoras a
LEFT JOIN faturas f ON f.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1'
GROUP BY a.id, a.nome, a.tenant_id;

-- 5. Mostrar exemplos de faturas com tenant_id
SELECT 
    id,
    numero_fatura,
    cliente_nome,
    valor,
    status,
    tenant_id,
    administradora_id,
    created_at
FROM faturas
WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
ORDER BY created_at DESC
LIMIT 10;







