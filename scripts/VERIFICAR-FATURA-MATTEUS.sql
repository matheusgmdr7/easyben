-- Script para verificar fatura do cliente MATTEUS SILVA
-- Execute esta query no Supabase SQL Editor

-- ============================================
-- 1. BUSCAR CLIENTE "MATTEUS SILVA" 
-- ============================================
SELECT 
    ca.id as cliente_administradora_id,
    ca.administradora_id,
    ca.proposta_id,
    p.nome as cliente_nome,
    p.email as cliente_email,
    p.cpf,
    ca.status as status_cliente,
    ca.created_at as data_vinculacao
FROM clientes_administradoras ca
LEFT JOIN propostas p ON p.id = ca.proposta_id
WHERE p.nome ILIKE '%MATTEUS%SILVA%'
   OR p.nome ILIKE '%MATTEUS%'
ORDER BY ca.created_at DESC;

-- ============================================
-- 2. BUSCAR FATURAS DO CLIENTE MATTEUS
-- ============================================
SELECT 
    f.id,
    f.numero_fatura,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.created_at,
    f.updated_at,
    ca.id as cliente_administradora_id_verificacao,
    p.nome as cliente_nome
FROM faturas f
LEFT JOIN clientes_administradoras ca ON ca.id = f.cliente_administradora_id
LEFT JOIN propostas p ON p.id = ca.proposta_id
WHERE p.nome ILIKE '%MATTEUS%SILVA%'
   OR p.nome ILIKE '%MATTEUS%'
   OR f.cliente_nome ILIKE '%MATTEUS%SILVA%'
   OR f.cliente_nome ILIKE '%MATTEUS%'
ORDER BY f.created_at DESC;

-- ============================================
-- 3. VERIFICAR FATURAS POR CLIENTE_ADMINISTRADORA_ID
-- (Substitua CLIENTE_ADMINISTRADORA_ID pelo ID encontrado na Query 1)
-- ============================================
-- Exemplo:
-- SELECT * FROM faturas 
-- WHERE cliente_administradora_id = 'CLIENTE_ADMINISTRADORA_ID'::uuid
-- ORDER BY created_at DESC;

-- ============================================
-- 4. VERIFICAR TODAS AS FATURAS RECENTES (últimas 20)
-- ============================================
SELECT 
    f.id,
    f.numero_fatura,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.cliente_nome,
    f.created_at
FROM faturas f
ORDER BY f.created_at DESC
LIMIT 20;

-- ============================================
-- 5. VERIFICAR SE HÁ FATURAS SEM CLIENTE_ADMINISTRADORA_ID
-- ============================================
SELECT 
    f.id,
    f.numero_fatura,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.cliente_nome,
    f.created_at
FROM faturas f
WHERE f.cliente_administradora_id IS NULL
ORDER BY f.created_at DESC;

-- ============================================
-- 6. COMPARAR: Faturas do Asaas vs Banco de Dados
-- (Busca por cliente_nome para ver se há divergência)
-- ============================================
SELECT 
    f.id,
    f.numero_fatura,
    f.cliente_nome,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.status,
    f.valor,
    f.vencimento,
    f.created_at,
    CASE 
        WHEN f.cliente_administradora_id IS NULL THEN '❌ SEM VÍNCULO'
        WHEN f.asaas_charge_id IS NULL THEN '❌ SEM ASAAS_CHARGE_ID'
        ELSE '✅ OK'
    END as situacao
FROM faturas f
WHERE f.cliente_nome ILIKE '%MATTEUS%'
   OR f.cliente_nome ILIKE '%MATTEUS%SILVA%'
ORDER BY f.created_at DESC;

-- ============================================
-- 7. VERIFICAR VÍNCULO CORRETO ENTRE CLIENTE E FATURA
-- ============================================
SELECT 
    ca.id as cliente_administradora_id,
    p.nome as cliente_nome_proposta,
    f.id as fatura_id,
    f.numero_fatura,
    f.cliente_nome as fatura_cliente_nome,
    f.asaas_charge_id,
    f.cliente_administradora_id as fatura_cliente_id,
    CASE 
        WHEN f.cliente_administradora_id = ca.id THEN '✅ VÍNCULO CORRETO'
        WHEN f.cliente_administradora_id IS NULL THEN '❌ SEM VÍNCULO'
        ELSE '⚠️ VÍNCULO DIFERENTE'
    END as status_vinculo
FROM clientes_administradoras ca
LEFT JOIN propostas p ON p.id = ca.proposta_id
LEFT JOIN faturas f ON f.cliente_administradora_id = ca.id
WHERE p.nome ILIKE '%MATTEUS%SILVA%'
   OR p.nome ILIKE '%MATTEUS%'
ORDER BY f.created_at DESC;

