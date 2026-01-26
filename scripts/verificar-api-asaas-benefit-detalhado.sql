-- ============================================
-- VERIFICAÇÃO DETALHADA DA API ASAAS
-- BENEFIT COBRANÇAS
-- ============================================
-- Este script verifica se a chave API está correta
-- e como ela está sendo armazenada

-- 1. Verificar configuração completa
SELECT 
  'CONFIGURAÇÃO COMPLETA' as verificacao,
  a.id as administradora_id,
  a.nome as administradora_nome,
  acf.id as config_id,
  acf.instituicao_financeira,
  CASE 
    WHEN acf.api_key IS NULL THEN '❌ NULL'
    WHEN acf.api_key = '' THEN '❌ VAZIA'
    WHEN LENGTH(acf.api_key) < 20 THEN '⚠️ MUITO CURTA (' || LENGTH(acf.api_key) || ' caracteres)'
    WHEN LENGTH(acf.api_key) >= 20 AND LENGTH(acf.api_key) <= 100 THEN '✅ TAMANHO OK (' || LENGTH(acf.api_key) || ' caracteres)'
    ELSE '⚠️ MUITO LONGA (' || LENGTH(acf.api_key) || ' caracteres)'
  END as status_api_key,
  -- Mostrar início e fim da chave (mascarada)
  CASE 
    WHEN acf.api_key IS NOT NULL AND acf.api_key != '' 
    THEN SUBSTRING(acf.api_key, 1, 10) || '...' || SUBSTRING(acf.api_key, GREATEST(1, LENGTH(acf.api_key) - 10))
    ELSE NULL
  END as api_key_preview,
  acf.ambiente,
  acf.status_integracao,
  CASE 
    WHEN acf.status_integracao = 'ativa' THEN '✅ ATIVA'
    WHEN acf.status_integracao = 'inativa' THEN '❌ INATIVA'
    WHEN acf.status_integracao = 'erro' THEN '⚠️ COM ERRO'
    WHEN acf.status_integracao = 'configurando' THEN '🔄 CONFIGURANDO'
    ELSE '❓ ' || COALESCE(acf.status_integracao, 'NULL')
  END as status_detalhado,
  acf.ultima_sincronizacao,
  acf.mensagem_erro,
  acf.created_at,
  acf.updated_at
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 2. Verificar se há múltiplas configurações (pode causar conflito)
SELECT 
  'VERIFICAR MÚLTIPLAS CONFIGURAÇÕES' as verificacao,
  COUNT(*) as total_configuracoes,
  COUNT(DISTINCT instituicao_financeira) as instituicoes_diferentes,
  STRING_AGG(DISTINCT instituicao_financeira, ', ') as instituicoes
FROM administradoras_config_financeira
WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 3. Verificar formato da API key (deve começar com $aact_ para produção ou $aact_YTU para sandbox)
SELECT 
  'VERIFICAR FORMATO API KEY' as verificacao,
  CASE 
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN acf.api_key LIKE '$aact_%' THEN '✅ FORMATO CORRETO (Produção)'
    WHEN acf.api_key LIKE '$aact_YTU%' THEN '✅ FORMATO CORRETO (Sandbox)'
    WHEN acf.api_key LIKE 'aact_%' THEN '⚠️ FALTA O $ NO INÍCIO'
    ELSE '⚠️ FORMATO SUSPEITO'
  END as formato_api_key,
  SUBSTRING(acf.api_key, 1, 20) as inicio_api_key,
  acf.ambiente
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 4. Verificar se há caracteres especiais ou espaços na API key
SELECT 
  'VERIFICAR CARACTERES ESPECIAIS' as verificacao,
  CASE 
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN acf.api_key LIKE '% %' THEN '❌ CONTÉM ESPAÇOS'
    WHEN acf.api_key LIKE '%' || CHR(10) || '%' OR acf.api_key LIKE '%' || CHR(13) || '%' THEN '❌ CONTÉM QUEBRAS DE LINHA'
    WHEN acf.api_key != TRIM(acf.api_key) THEN '⚠️ TEM ESPAÇOS NO INÍCIO/FIM'
    ELSE '✅ SEM PROBLEMAS APARENTES'
  END as status_caracteres,
  LENGTH(acf.api_key) as tamanho,
  LENGTH(TRIM(acf.api_key)) as tamanho_sem_espacos
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 5. Comparar com outras administradoras que funcionam
SELECT 
  'COMPARAÇÃO COM OUTRAS ADMINISTRADORAS' as verificacao,
  a.nome as administradora_nome,
  acf.instituicao_financeira,
  CASE 
    WHEN acf.api_key IS NOT NULL AND acf.api_key != '' THEN '✅ TEM API KEY'
    ELSE '❌ SEM API KEY'
  END as tem_api_key,
  LENGTH(acf.api_key) as tamanho_api_key,
  acf.ambiente,
  acf.status_integracao
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE acf.instituicao_financeira = 'asaas'
  AND acf.status_integracao = 'ativa'
ORDER BY a.nome;

-- 6. Verificar se a configuração está sendo lida corretamente pela API
DO $$
DECLARE
  tem_config BOOLEAN;
  tem_api_key BOOLEAN;
  status_config TEXT;
  instituicao TEXT;
  ambiente TEXT;
  api_key_preview TEXT;
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VERIFICAÇÃO DE CONFIGURAÇÃO PARA API';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
  
  SELECT 
    (acf.id IS NOT NULL) as tem_config,
    (acf.api_key IS NOT NULL AND acf.api_key != '') as tem_key,
    COALESCE(acf.status_integracao, 'sem_config') as status,
    COALESCE(acf.instituicao_financeira, 'NULL') as instituicao,
    COALESCE(acf.ambiente, 'NULL') as ambiente,
    CASE 
      WHEN acf.api_key IS NOT NULL AND acf.api_key != '' 
      THEN SUBSTRING(acf.api_key, 1, 15) || '...'
      ELSE 'NULL'
    END as preview
  INTO tem_config, tem_api_key, status_config, instituicao, ambiente, api_key_preview
  FROM administradoras a
  LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
  WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  RAISE NOTICE '📊 CONFIGURAÇÃO ATUAL:';
  RAISE NOTICE '   - Existe configuração: %', CASE WHEN tem_config THEN 'SIM' ELSE 'NÃO' END;
  RAISE NOTICE '   - Tem API Key: %', CASE WHEN tem_api_key THEN 'SIM' ELSE 'NÃO' END;
  RAISE NOTICE '   - Instituição: %', instituicao;
  RAISE NOTICE '   - Ambiente: %', ambiente;
  RAISE NOTICE '   - Status: %', status_config;
  RAISE NOTICE '   - API Key Preview: %', api_key_preview;
  RAISE NOTICE ' ';
  
  RAISE NOTICE '🔍 COMO A API BUSCA A CONFIGURAÇÃO:';
  RAISE NOTICE '   A API /api/admin/recuperar-fatura-asaas busca com:';
  RAISE NOTICE '   - administradora_id = ''050be541-db3b-4d3c-be95-df80b68747f1''';
  RAISE NOTICE '   - instituicao_financeira = ''asaas''';
  RAISE NOTICE '   - status_integracao = ''ativa''';
  RAISE NOTICE ' ';
  
  IF NOT tem_config THEN
    RAISE NOTICE '❌ PROBLEMA: Configuração não existe!';
  ELSIF instituicao != 'asaas' THEN
    RAISE NOTICE '❌ PROBLEMA: Instituição está como "%" mas deveria ser "asaas"!', instituicao;
  ELSIF status_config != 'ativa' THEN
    RAISE NOTICE '❌ PROBLEMA: Status está como "%" mas deveria ser "ativa"!', status_config;
  ELSIF NOT tem_api_key THEN
    RAISE NOTICE '❌ PROBLEMA: API Key não está configurada!';
  ELSE
    RAISE NOTICE '✅ Configuração parece estar correta para a API.';
    RAISE NOTICE ' ';
    RAISE NOTICE '💡 Se ainda não funciona, verifique:';
    RAISE NOTICE '   1. Se a API key está correta no Asaas';
    RAISE NOTICE '   2. Se o ambiente (sandbox/produção) está correto';
    RAISE NOTICE '   3. Se há faturas no Asaas para os clientes';
    RAISE NOTICE '   4. Se o CPF do cliente corresponde ao CPF no Asaas';
  END IF;
  
  RAISE NOTICE ' ';
END $$;







