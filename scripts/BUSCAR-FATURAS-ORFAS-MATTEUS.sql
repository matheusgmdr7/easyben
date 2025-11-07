-- Script para buscar faturas órfãs ou com problema de vínculo para MATTEUS SILVA
-- Execute estas queries no Supabase SQL Editor

-- ============================================
-- 1. BUSCAR FATURAS SEM CLIENTE_ADMINISTRADORA_ID (ÓRFÃS)
-- ============================================
SELECT 
    f.id,
    f.numero_fatura,
    f.cliente_nome,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.created_at,
    '❌ SEM VÍNCULO' as situacao
FROM faturas f
WHERE f.cliente_administradora_id IS NULL
ORDER BY f.created_at DESC
LIMIT 20;

-- ============================================
-- 2. BUSCAR FATURAS POR NOME DO CLIENTE (MATTEUS)
-- ============================================
SELECT 
    f.id,
    f.numero_fatura,
    f.cliente_nome,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.created_at,
    CASE 
        WHEN f.cliente_administradora_id IS NULL THEN '❌ SEM VÍNCULO'
        WHEN f.cliente_administradora_id != '93e8bcd0-3a62-4abe-bdc6-46b6c7c60435'::uuid THEN '⚠️ VÍNCULO DIFERENTE'
        ELSE '✅ VÍNCULO CORRETO'
    END as situacao
FROM faturas f
WHERE f.cliente_nome ILIKE '%MATTEUS%'
   OR f.cliente_nome ILIKE '%MATTEUS%SILVA%'
ORDER BY f.created_at DESC;

-- ============================================
-- 3. BUSCAR FATURAS RECENTES (últimas 30) PARA VERIFICAR
-- ============================================
SELECT 
    f.id,
    f.numero_fatura,
    f.cliente_nome,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.created_at,
    CASE 
        WHEN f.cliente_administradora_id IS NULL THEN '❌ SEM VÍNCULO'
        ELSE '✅ COM VÍNCULO'
    END as situacao
FROM faturas f
ORDER BY f.created_at DESC
LIMIT 30;

-- ============================================
-- 4. VERIFICAR PROPOSTA DO MATTEUS PARA CONFIRMAR ID
-- ============================================
SELECT 
    p.id as proposta_id,
    p.nome as cliente_nome,
    p.email,
    p.cpf,
    ca.id as cliente_administradora_id,
    ca.administradora_id,
    ca.status as status_cliente,
    ca.created_at as data_vinculacao
FROM propostas p
LEFT JOIN clientes_administradoras ca ON ca.proposta_id = p.id
WHERE p.nome ILIKE '%MATTEUS%SILVA%'
   OR p.nome ILIKE '%MATTEUS%'
ORDER BY ca.created_at DESC;

-- ============================================
-- 5. BUSCAR FATURAS POR ASAAS_CHARGE_ID (se você souber o ID da fatura no Asaas)
-- ============================================
-- Substitua 'CHARGE_ID_DO_ASAAS' pelo ID da fatura no Asaas
-- SELECT * FROM faturas 
-- WHERE asaas_charge_id = 'CHARGE_ID_DO_ASAAS'
-- ORDER BY created_at DESC;

