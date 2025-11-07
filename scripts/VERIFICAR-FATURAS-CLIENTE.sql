-- Script para verificar faturas de clientes
-- 1. Verificar as últimas faturas criadas (últimas 10)
-- Execute esta query primeiro para ver as faturas mais recentes
SELECT 
    f.id,
    f.numero_fatura,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_nome,
    f.cliente_administradora_id,
    f.created_at,
    ca.administradora_id,
    ca.proposta_id
FROM faturas f
INNER JOIN clientes_administradoras ca ON f.cliente_administradora_id = ca.id
ORDER BY f.created_at DESC
LIMIT 10;

-- 2. Verificar faturas sem asaas_charge_id (faturas que podem não ter sido criadas no Asaas)
-- Execute esta query para encontrar faturas que não foram sincronizadas com o Asaas
SELECT 
    f.id,
    f.numero_fatura,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_nome,
    f.cliente_administradora_id,
    ca.administradora_id,
    ca.proposta_id,
    f.created_at
FROM faturas f
INNER JOIN clientes_administradoras ca ON f.cliente_administradora_id = ca.id
WHERE f.asaas_charge_id IS NULL
ORDER BY f.created_at DESC;

-- 3. Verificar todos os clientes e suas faturas (útil para encontrar um cliente específico)
-- Execute esta query para ver todos os clientes e quantas faturas cada um tem
SELECT 
    ca.id as cliente_administradora_id,
    ca.proposta_id,
    f.cliente_nome,
    COUNT(f.id) as total_faturas,
    COUNT(CASE WHEN f.status = 'pendente' THEN 1 END) as faturas_pendentes,
    COUNT(CASE WHEN f.status = 'paga' THEN 1 END) as faturas_pagas,
    MAX(f.created_at) as ultima_fatura_criada
FROM clientes_administradoras ca
LEFT JOIN faturas f ON f.cliente_administradora_id = ca.id
GROUP BY ca.id, ca.proposta_id, f.cliente_nome
ORDER BY ultima_fatura_criada DESC NULLS LAST
LIMIT 20;

-- 4. Verificar faturas de um cliente específico pelo nome
-- Substitua 'NOME_DO_CLIENTE' pelo nome do cliente (ou parte do nome)
-- Exemplo: WHERE f.cliente_nome ILIKE '%JACKLYNE%'
SELECT 
    f.id,
    f.numero_fatura,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_nome,
    f.cliente_administradora_id,
    f.created_at,
    f.updated_at,
    ca.administradora_id,
    ca.proposta_id
FROM faturas f
INNER JOIN clientes_administradoras ca ON f.cliente_administradora_id = ca.id
WHERE f.cliente_nome ILIKE '%NOME_DO_CLIENTE%'  -- Substitua pelo nome do cliente
ORDER BY f.vencimento DESC;

-- 5. Verificar faturas por proposta específica
-- Substitua 'PROPOSTA_ID' pelo ID da proposta (UUID)
-- Exemplo: WHERE ca.proposta_id = 'f9900023-4813-449d-a176-304804f3f5f8'
SELECT 
    f.id,
    f.numero_fatura,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_nome,
    ca.proposta_id,
    ca.id as cliente_administradora_id,
    f.created_at
FROM faturas f
INNER JOIN clientes_administradoras ca ON f.cliente_administradora_id = ca.id
WHERE ca.proposta_id = 'PROPOSTA_ID'::uuid  -- Substitua pelo ID da proposta
ORDER BY f.created_at DESC;

-- 6. Verificar faturas criadas hoje (útil para verificar se a fatura foi criada no último cadastro)
SELECT 
    f.id,
    f.numero_fatura,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_nome,
    f.cliente_administradora_id,
    f.created_at,
    ca.administradora_id,
    ca.proposta_id
FROM faturas f
INNER JOIN clientes_administradoras ca ON f.cliente_administradora_id = ca.id
WHERE DATE(f.created_at) = CURRENT_DATE
ORDER BY f.created_at DESC;

-- 7. Para verificar um cliente específico pelo ID do cliente_administradora_id:
-- Substitua 'UUID_DO_CLIENTE' pelo UUID do cliente
-- Exemplo: WHERE ca.id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f'::uuid
SELECT 
    f.id,
    f.numero_fatura,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_nome,
    f.cliente_administradora_id,
    f.created_at,
    f.updated_at,
    ca.administradora_id,
    ca.proposta_id
FROM faturas f
INNER JOIN clientes_administradoras ca ON f.cliente_administradora_id = ca.id
WHERE ca.id = 'UUID_DO_CLIENTE'::uuid  -- Substitua pelo UUID do cliente
ORDER BY f.vencimento DESC;
