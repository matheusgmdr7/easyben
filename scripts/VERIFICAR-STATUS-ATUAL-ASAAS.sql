-- 🔍 Verificar Status Atual da Configuração Asaas
-- Execute este script para verificar se a configuração foi inserida corretamente

-- 1. Verificar se existe configuração para Clube Ben
SELECT 
    'VERIFICAÇÃO 1: Configuração existe?' as verificacao,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Sim'
        ELSE '❌ Não'
    END as resultado,
    COUNT(*) as total_registros
FROM administradoras_config_financeira 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';

-- 2. Verificar status da integração
SELECT 
    'VERIFICAÇÃO 2: Status da integração' as verificacao,
    status_integracao as resultado,
    CASE 
        WHEN status_integracao = 'ativa' THEN '✅ Correto'
        ELSE '❌ Incorreto - deve ser "ativa"'
    END as status_correto
FROM administradoras_config_financeira 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';

-- 3. Verificar se API key está presente
SELECT 
    'VERIFICAÇÃO 3: API Key presente?' as verificacao,
    CASE 
        WHEN api_key IS NOT NULL AND LENGTH(api_key) > 10 THEN '✅ Sim'
        ELSE '❌ Não ou muito curta'
    END as resultado,
    CASE 
        WHEN api_key IS NOT NULL THEN LENGTH(api_key)
        ELSE 0
    END as tamanho_api_key
FROM administradoras_config_financeira 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';

-- 4. Verificar ambiente
SELECT 
    'VERIFICAÇÃO 4: Ambiente configurado' as verificacao,
    COALESCE(ambiente, 'sandbox') as resultado,
    CASE 
        WHEN ambiente IS NOT NULL THEN '✅ Configurado'
        ELSE '⚠️ Usando padrão (sandbox)'
    END as status_ambiente
FROM administradoras_config_financeira 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';

-- 5. Verificação completa da configuração
SELECT 
    'VERIFICAÇÃO 5: Configuração completa' as verificacao,
    CASE 
        WHEN status_integracao = 'ativa' 
             AND api_key IS NOT NULL 
             AND LENGTH(api_key) > 10 
        THEN '✅ Configuração válida'
        ELSE '❌ Configuração inválida'
    END as resultado,
    CONCAT(
        'Status: ', COALESCE(status_integracao, 'NULL'), 
        ', API Key: ', CASE WHEN api_key IS NOT NULL THEN 'Presente' ELSE 'Ausente' END,
        ', Ambiente: ', COALESCE(ambiente, 'sandbox')
    ) as detalhes
FROM administradoras_config_financeira 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';