-- Script para buscar TODAS as faturas recentes e identificar a do Matteus
-- Execute estas queries no Supabase SQL Editor

-- ============================================
-- QUERY 1: TODAS AS FATURAS (últimas 50) - SEM FILTRO
-- ============================================
SELECT 
    f.id as fatura_id,
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
LIMIT 50;

-- ============================================
-- QUERY 2: FATURAS SEM CLIENTE_ADMINISTRADORA_ID (ÓRFÃS)
-- ============================================
SELECT 
    f.id as fatura_id,
    f.numero_fatura,
    f.cliente_nome,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.created_at,
    '❌ SEM VÍNCULO - PRECISA CORRIGIR' as situacao
FROM faturas f
WHERE f.cliente_administradora_id IS NULL
ORDER BY f.created_at DESC;

-- ============================================
-- QUERY 3: FATURAS CRIADAS HOJE
-- ============================================
SELECT 
    f.id as fatura_id,
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
WHERE DATE(f.created_at) = CURRENT_DATE
ORDER BY f.created_at DESC;

-- ============================================
-- QUERY 4: VERIFICAR SE HÁ ALGUMA FATURA COM VALOR SIMILAR AO DO MATTEUS
-- ============================================
-- Execute esta query se você souber o valor aproximado da fatura do Matteus
-- Substitua 'VALOR_APROXIMADO' pelo valor (ex: 847.50)
/*
SELECT 
    f.id as fatura_id,
    f.numero_fatura,
    f.cliente_nome,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.created_at
FROM faturas f
WHERE ABS(f.valor - VALOR_APROXIMADO) < 0.01
ORDER BY f.created_at DESC;
*/

-- ============================================
-- QUERY 5: CONTAR TOTAL DE FATURAS E FATURAS SEM VÍNCULO
-- ============================================
SELECT 
    COUNT(*) as total_faturas,
    COUNT(CASE WHEN cliente_administradora_id IS NULL THEN 1 END) as faturas_sem_vinculo,
    COUNT(CASE WHEN cliente_administradora_id IS NOT NULL THEN 1 END) as faturas_com_vinculo
FROM faturas;

-- ============================================
-- QUERY 6: VERIFICAR LOGS/RESULTADO DA INTEGRAÇÃO (se houver tabela de logs)
-- ============================================
-- Esta query só funciona se houver uma tabela de logs
-- Verifique se existe alguma tabela que registra as integrações
-- SELECT * FROM integracoes_asaas ORDER BY created_at DESC LIMIT 10;

