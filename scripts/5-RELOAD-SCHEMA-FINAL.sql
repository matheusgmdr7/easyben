-- ============================================
-- RECARREGAR SCHEMA DO SUPABASE (FINAL)
-- ============================================

-- 1. Forçar reload do schema cache
NOTIFY pgrst, 'reload schema';

-- 2. Verificar se a tabela administradoras_config_financeira está acessível
SELECT 
    '✅ TABELA ACESSÍVEL' as status,
    COUNT(*) as total_registros
FROM administradoras_config_financeira;

-- 3. Verificar configuração da Clube Ben
SELECT 
    '🔑 CONFIGURAÇÃO CLUBE BEN' as status,
    administradora_id,
    instituicao_financeira,
    CASE 
        WHEN api_key IS NOT NULL AND api_key != '' 
        THEN '✅ API Key configurada'
        ELSE '❌ API Key não configurada'
    END as api_key_status,
    ambiente,
    status_integracao,
    created_at,
    updated_at
FROM administradoras_config_financeira
WHERE administradora_id = 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f';

-- ============================================
-- 🎉 SCHEMA RECARREGADO!
-- ============================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Aguarde 10 segundos
-- 2. Limpe o cache do navegador (Cmd+Shift+R)
-- 3. Acesse: /admin/cadastrado
-- 4. Clique em "Completar Cadastro" em algum cliente
-- 5. Preencha os dados e finalize
-- 6. Verifique se a fatura foi gerada!
-- ============================================
