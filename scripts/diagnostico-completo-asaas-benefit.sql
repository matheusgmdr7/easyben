-- ============================================
-- DIAGNÓSTICO COMPLETO - API ASAAS BENEFIT COBRANÇAS
-- ============================================
-- Este script verifica TODOS os aspectos da configuração
-- e identifica possíveis problemas

-- 1. VERIFICAÇÃO COMPLETA DA CONFIGURAÇÃO
SELECT 
  '=== CONFIGURAÇÃO API ASAAS ===' as secao,
  a.id as administradora_id,
  a.nome as administradora_nome,
  acf.id as config_id,
  acf.instituicao_financeira,
  CASE 
    WHEN acf.api_key IS NULL THEN '❌ NULL'
    WHEN acf.api_key = '' THEN '❌ VAZIA'
    WHEN LENGTH(TRIM(acf.api_key)) < 20 THEN '⚠️ MUITO CURTA'
    WHEN acf.api_key LIKE '$aact_%' THEN '✅ FORMATO OK (Produção)'
    WHEN acf.api_key LIKE '$aact_YTU%' THEN '✅ FORMATO OK (Sandbox)'
    WHEN acf.api_key LIKE 'aact_%' THEN '⚠️ FALTA $ NO INÍCIO'
    ELSE '⚠️ FORMATO DESCONHECIDO'
  END as status_api_key,
  LENGTH(acf.api_key) as tamanho_api_key,
  LENGTH(TRIM(acf.api_key)) as tamanho_sem_espacos,
  SUBSTRING(acf.api_key, 1, 20) as inicio_api_key,
  acf.ambiente,
  acf.status_integracao,
  acf.ultima_sincronizacao,
  acf.mensagem_erro
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 2. VERIFICAR SE HÁ ESPAÇOS OU CARACTERES ESPECIAIS
SELECT 
  '=== VERIFICAÇÃO DE CARACTERES ===' as secao,
  CASE 
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN acf.api_key LIKE '% %' THEN '❌ CONTÉM ESPAÇOS'
    WHEN acf.api_key != TRIM(acf.api_key) THEN '⚠️ ESPAÇOS NO INÍCIO/FIM'
    WHEN acf.api_key LIKE '%' || CHR(10) || '%' OR acf.api_key LIKE '%' || CHR(13) || '%' THEN '❌ CONTÉM QUEBRAS DE LINHA'
    ELSE '✅ SEM PROBLEMAS'
  END as status_caracteres,
  acf.api_key = TRIM(acf.api_key) as sem_espacos_inicio_fim,
  POSITION(' ' IN acf.api_key) > 0 as tem_espacos,
  POSITION(CHR(10) IN acf.api_key) > 0 as tem_quebra_linha
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 3. VERIFICAR CLIENTES E CPFs
SELECT 
  '=== CLIENTES E CPFs ===' as secao,
  vw.id as cliente_id,
  vw.cliente_nome,
  vw.cliente_cpf as cpf_original,
  REPLACE(REPLACE(REPLACE(vw.cliente_cpf, '.', ''), '-', ''), ' ', '') as cpf_limpo,
  LENGTH(REPLACE(REPLACE(REPLACE(vw.cliente_cpf, '.', ''), '-', ''), ' ', '')) as tamanho_cpf_limpo,
  CASE 
    WHEN vw.cliente_cpf IS NULL OR vw.cliente_cpf = '' THEN '❌ SEM CPF'
    WHEN LENGTH(REPLACE(REPLACE(REPLACE(vw.cliente_cpf, '.', ''), '-', ''), ' ', '')) < 11 THEN '⚠️ CPF INVÁLIDO'
    WHEN LENGTH(REPLACE(REPLACE(REPLACE(vw.cliente_cpf, '.', ''), '-', ''), ' ', '')) = 11 THEN '✅ CPF OK'
    ELSE '⚠️ CPF MUITO LONGO'
  END as status_cpf
FROM vw_clientes_administradoras_completo vw
WHERE vw.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
ORDER BY vw.cliente_nome;

-- 4. COMPARAR COM OUTRAS ADMINISTRADORAS QUE FUNCIONAM
SELECT 
  '=== COMPARAÇÃO COM OUTRAS ===' as secao,
  a.nome as administradora,
  acf.instituicao_financeira,
  CASE WHEN acf.api_key IS NOT NULL THEN '✅' ELSE '❌' END as tem_api_key,
  LENGTH(acf.api_key) as tamanho_key,
  acf.ambiente,
  acf.status_integracao,
  (SELECT COUNT(*) FROM faturas f WHERE f.administradora_id = a.id AND f.asaas_charge_id IS NOT NULL) as faturas_com_asaas_id
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE acf.instituicao_financeira = 'asaas'
ORDER BY a.nome;

-- 5. RESUMO E DIAGNÓSTICO
DO $$
DECLARE
  tem_config BOOLEAN;
  tem_api_key BOOLEAN;
  status_config TEXT;
  instituicao TEXT;
  ambiente TEXT;
  api_key_formatada TEXT;
  tem_espacos BOOLEAN;
  formato_correto BOOLEAN;
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'DIAGNÓSTICO COMPLETO - API ASAAS';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
  
  -- Buscar configuração
  SELECT 
    (acf.id IS NOT NULL) as tem_config,
    (acf.api_key IS NOT NULL AND acf.api_key != '') as tem_key,
    COALESCE(acf.status_integracao, 'sem_config') as status,
    COALESCE(acf.instituicao_financeira, 'NULL') as instituicao,
    COALESCE(acf.ambiente, 'NULL') as ambiente,
    TRIM(acf.api_key) as key_trim,
    (acf.api_key LIKE '% %') as tem_esp,
    (acf.api_key LIKE '$aact_%' OR acf.api_key LIKE '$aact_YTU%') as formato_ok
  INTO tem_config, tem_api_key, status_config, instituicao, ambiente, api_key_formatada, tem_espacos, formato_correto
  FROM administradoras a
  LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
  WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  RAISE NOTICE '📊 CONFIGURAÇÃO:';
  RAISE NOTICE '   - Existe: %', CASE WHEN tem_config THEN 'SIM ✅' ELSE 'NÃO ❌' END;
  RAISE NOTICE '   - Tem API Key: %', CASE WHEN tem_api_key THEN 'SIM ✅' ELSE 'NÃO ❌' END;
  RAISE NOTICE '   - Instituição: %', instituicao;
  RAISE NOTICE '   - Ambiente: %', ambiente;
  RAISE NOTICE '   - Status: %', status_config;
  RAISE NOTICE '   - Formato correto: %', CASE WHEN formato_correto THEN 'SIM ✅' ELSE 'NÃO ❌' END;
  RAISE NOTICE '   - Tem espaços: %', CASE WHEN tem_espacos THEN 'SIM ❌' ELSE 'NÃO ✅' END;
  RAISE NOTICE ' ';
  
  RAISE NOTICE '🔍 COMO A API BUSCA:';
  RAISE NOTICE '   1. Busca configuração com:';
  RAISE NOTICE '      - administradora_id = ''050be541-db3b-4d3c-be95-df80b68747f1''';
  RAISE NOTICE '      - instituicao_financeira = ''asaas''';
  RAISE NOTICE '      - status_integracao = ''ativa''';
  RAISE NOTICE ' ';
  RAISE NOTICE '   2. Busca cliente no Asaas por CPF:';
  RAISE NOTICE '      - Endpoint: GET /customers?cpfCnpj={cpf_limpo}';
  RAISE NOTICE '      - CPF deve estar SEM pontos, traços ou espaços';
  RAISE NOTICE ' ';
  RAISE NOTICE '   3. Busca faturas do cliente:';
  RAISE NOTICE '      - Endpoint: GET /payments?customer={customer_id}';
  RAISE NOTICE '      - Usa o ID do customer encontrado no passo 2';
  RAISE NOTICE ' ';
  
  RAISE NOTICE '💡 POSSÍVEIS PROBLEMAS:';
  
  IF NOT tem_config THEN
    RAISE NOTICE '   ❌ Configuração não existe';
    RAISE NOTICE '      Solução: Criar configuração na página de configurações';
  ELSIF instituicao != 'asaas' THEN
    RAISE NOTICE '   ❌ Instituição incorreta: %', instituicao;
    RAISE NOTICE '      Solução: Alterar para "Asaas"';
  ELSIF status_config != 'ativa' THEN
    RAISE NOTICE '   ❌ Status incorreto: %', status_config;
    RAISE NOTICE '      Solução: Ativar a integração';
  ELSIF NOT tem_api_key THEN
    RAISE NOTICE '   ❌ API Key não configurada';
    RAISE NOTICE '      Solução: Adicionar API Key';
  ELSIF tem_espacos THEN
    RAISE NOTICE '   ❌ API Key contém espaços';
    RAISE NOTICE '      Solução: Remover espaços da API Key';
  ELSIF NOT formato_correto THEN
    RAISE NOTICE '   ⚠️ Formato da API Key pode estar incorreto';
    RAISE NOTICE '      Esperado: Começar com $aact_ (produção) ou $aact_YTU (sandbox)';
  ELSE
    RAISE NOTICE '   ✅ Configuração parece estar correta!';
    RAISE NOTICE ' ';
    RAISE NOTICE '   Se ainda não funciona, verifique:';
    RAISE NOTICE '   1. Se a API Key está correta no painel do Asaas';
    RAISE NOTICE '   2. Se o ambiente (sandbox/produção) está correto';
    RAISE NOTICE '   3. Se o cliente existe no Asaas com o CPF correto';
    RAISE NOTICE '   4. Se há faturas cadastradas no Asaas para o cliente';
    RAISE NOTICE '   5. Se o CPF no banco corresponde exatamente ao CPF no Asaas';
  END IF;
  
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
END $$;

-- 6. QUERY PARA CORRIGIR API KEY SE NECESSÁRIO (descomente se necessário)
/*
-- Remover espaços e quebras de linha da API Key
UPDATE administradoras_config_financeira
SET api_key = TRIM(REPLACE(REPLACE(api_key, CHR(10), ''), CHR(13), '')),
    updated_at = NOW()
WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
  AND (api_key LIKE '% %' OR api_key LIKE '%' || CHR(10) || '%' OR api_key != TRIM(api_key));
*/







