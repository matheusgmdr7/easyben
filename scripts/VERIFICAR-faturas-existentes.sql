-- VERIFICAR FATURAS EXISTENTES NO SISTEMA
-- Execute este script no SQL Editor do Supabase

-- 1. Contar total de faturas
SELECT 'Total de faturas' as tipo, COUNT(*) as quantidade FROM faturas;

-- 2. Contar por status
SELECT 'Por status' as tipo, status, COUNT(*) as quantidade 
FROM faturas 
GROUP BY status 
ORDER BY quantidade DESC;

-- 3. Verificar faturas da administradora específica
SELECT 'Administradora clube ben' as tipo, COUNT(*) as quantidade 
FROM faturas 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';

-- 4. Verificar faturas com status 'paga' da administradora
SELECT 'Faturas pagas - clube ben' as tipo, COUNT(*) as quantidade 
FROM faturas 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f' 
AND status = 'paga';

-- 5. Verificar faturas com status 'pago' da administradora
SELECT 'Faturas pagas (pago) - clube ben' as tipo, COUNT(*) as quantidade 
FROM faturas 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f' 
AND status = 'pago';

-- 6. Verificar faturas pendentes da administradora
SELECT 'Faturas pendentes - clube ben' as tipo, COUNT(*) as quantidade 
FROM faturas 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f' 
AND status = 'pendente';

-- 7. Verificar se há faturas com numero_fatura
SELECT 'Faturas com numero_fatura' as tipo, COUNT(*) as quantidade 
FROM faturas 
WHERE numero_fatura IS NOT NULL AND numero_fatura != '';

-- 8. Verificar algumas faturas de exemplo
SELECT 
    id,
    numero_fatura,
    cliente_nome,
    status,
    valor,
    vencimento,
    created_at
FROM faturas 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f'
ORDER BY created_at DESC
LIMIT 5;


