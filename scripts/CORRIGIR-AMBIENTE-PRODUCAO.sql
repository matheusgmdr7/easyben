-- Corrigir o ambiente para 'producao' já que a chave é de produção
UPDATE administradoras_config_financeira 
SET ambiente = 'producao',
    updated_at = NOW()
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';

-- Verificar se foi corrigido
SELECT 
    administradora_id,
    status_integracao,
    ambiente,
    LENGTH(api_key) as tamanho_api_key,
    updated_at
FROM administradoras_config_financeira 
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';



