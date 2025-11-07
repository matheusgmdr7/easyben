-- Script para CORRIGIR a fatura do cliente MATTEUS SILVA
-- Execute estas queries no Supabase SQL Editor

-- ============================================
-- PASSO 1: VERIFICAR O CLIENTE MATTEUS
-- ============================================
SELECT 
    ca.id as cliente_administradora_id,
    p.id as proposta_id,
    p.nome as cliente_nome,
    p.email,
    p.cpf,
    ca.administradora_id,
    ca.status,
    ca.created_at
FROM clientes_administradoras ca
INNER JOIN propostas p ON p.id = ca.proposta_id
WHERE p.nome ILIKE '%MATTEUS%SILVA%'
   OR p.nome ILIKE '%MATTEUS%'
ORDER BY ca.created_at DESC;

-- ============================================
-- PASSO 2: BUSCAR FATURAS SEM VÍNCULO OU COM VÍNCULO INCORRETO
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
        WHEN f.cliente_administradora_id IS NULL THEN '❌ SEM VÍNCULO - PRECISA CORRIGIR'
        WHEN f.cliente_administradora_id != '93e8bcd0-3a62-4abe-bdc6-46b6c7c60435'::uuid THEN '⚠️ VÍNCULO DIFERENTE'
        ELSE '✅ VÍNCULO CORRETO'
    END as situacao
FROM faturas f
WHERE (
    f.cliente_nome ILIKE '%MATTEUS%'
    OR f.cliente_nome ILIKE '%MATTEUS%SILVA%'
    OR f.asaas_charge_id IS NOT NULL -- Buscar todas as faturas com asaas_charge_id
)
AND (
    f.cliente_administradora_id IS NULL
    OR f.cliente_administradora_id != '93e8bcd0-3a62-4abe-bdc6-46b6c7c60435'::uuid
)
ORDER BY f.created_at DESC;

-- ============================================
-- PASSO 3: VERIFICAR ÚLTIMAS FATURAS CRIADAS (para encontrar a do Matteus)
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
    f.created_at
FROM faturas f
ORDER BY f.created_at DESC
LIMIT 10;

-- ============================================
-- PASSO 4: CORRIGIR FATURA (EXECUTAR APENAS SE ACHAR A FATURA ÓRFÃ)
-- ============================================
-- IMPORTANTE: Substitua 'FATURA_ID_AQUI' pelo ID da fatura encontrada no PASSO 2
-- IMPORTANTE: Substitua '93e8bcd0-3a62-4abe-bdc6-46b6c7c60435' se o cliente_administradora_id for diferente

-- Exemplo de UPDATE (descomente e ajuste):
/*
UPDATE faturas
SET 
    cliente_administradora_id = '93e8bcd0-3a62-4abe-bdc6-46b6c7c60435'::uuid,
    updated_at = NOW()
WHERE id = 'FATURA_ID_AQUI'::uuid
  AND (
    cliente_administradora_id IS NULL
    OR cliente_administradora_id != '93e8bcd0-3a62-4abe-bdc6-46b6c7c60435'::uuid
  );

-- Verificar se foi atualizada
SELECT * FROM faturas WHERE id = 'FATURA_ID_AQUI'::uuid;
*/

-- ============================================
-- PASSO 5: BUSCAR FATURAS POR ASAAS_CHARGE_ID (se você souber o ID)
-- ============================================
-- Se você souber o asaas_charge_id da fatura do Matteus, use esta query:
-- Substitua 'CHARGE_ID_AQUI' pelo ID da fatura no Asaas
/*
SELECT 
    f.*,
    ca.id as cliente_correto_id,
    p.nome as cliente_correto_nome
FROM faturas f
CROSS JOIN clientes_administradoras ca
INNER JOIN propostas p ON p.id = ca.proposta_id
WHERE f.asaas_charge_id = 'CHARGE_ID_AQUI'
  AND (p.nome ILIKE '%MATTEUS%' OR p.nome ILIKE '%MATTEUS%SILVA%');
*/

