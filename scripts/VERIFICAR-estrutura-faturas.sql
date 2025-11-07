-- VERIFICAR ESTRUTURA DA TABELA FATURAS
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar estrutura da tabela faturas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'faturas' 
AND column_name IN ('valor', 'pagamento_valor', 'status', 'vencimento')
ORDER BY ordinal_position;

-- 2. Verificar se há dados na tabela
SELECT 
    '📊 RESUMO DA TABELA' as info,
    COUNT(*) as total_registros,
    COUNT(DISTINCT administradora_id) as administradoras_distintas,
    COUNT(CASE WHEN valor IS NOT NULL THEN 1 END) as com_valor,
    COUNT(CASE WHEN pagamento_valor IS NOT NULL THEN 1 END) as com_pagamento_valor
FROM faturas;

-- 3. Verificar valores nulos ou vazios
SELECT 
    '🚨 PROBLEMAS DE DADOS' as info,
    COUNT(CASE WHEN valor IS NULL THEN 1 END) as valor_null,
    COUNT(CASE WHEN valor = '' THEN 1 END) as valor_vazio,
    COUNT(CASE WHEN pagamento_valor IS NULL THEN 1 END) as pagamento_valor_null,
    COUNT(CASE WHEN pagamento_valor = '' THEN 1 END) as pagamento_valor_vazio,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as status_null,
    COUNT(CASE WHEN status = '' THEN 1 END) as status_vazio
FROM faturas;

-- 4. Verificar exemplos de dados
SELECT 
    '📋 EXEMPLOS DE DADOS' as info,
    id,
    numero_fatura,
    cliente_nome,
    status,
    valor,
    pagamento_valor,
    vencimento,
    pagamento_data,
    administradora_id
FROM faturas
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f'
ORDER BY created_at DESC
LIMIT 5;


