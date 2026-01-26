-- ============================================
-- VERIFICAR CONFIGURAÇÃO API ASAAS - BENEFIT COBRANÇAS
-- ============================================
-- Este script verifica se a configuração da API do Asaas está correta
-- para a administradora "Benefit Cobranças" e se está pronta para extrair faturas

-- 1. Buscar administradora "Benefit Cobranças" ou similar
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VERIFICANDO CONFIGURAÇÃO API ASAAS';
  RAISE NOTICE '============================================================';
END $$;

-- Listar todas as administradoras para identificar a "Benefit Cobranças"
SELECT 
  id,
  nome,
  cnpj,
  email,
  status,
  created_at
FROM administradoras
WHERE LOWER(nome) LIKE '%benefit%' 
   OR LOWER(nome) LIKE '%cobran%'
   OR LOWER(nome) LIKE '%cobrança%'
ORDER BY nome;

-- 2. Verificar configurações financeiras de TODAS as administradoras
SELECT 
  acf.id,
  acf.administradora_id,
  a.nome as administradora_nome,
  acf.instituicao_financeira,
  CASE 
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN LENGTH(acf.api_key) < 10 THEN '⚠️ API KEY MUITO CURTA'
    ELSE '✅ API KEY CONFIGURADA'
  END as status_api_key,
  LENGTH(acf.api_key) as tamanho_api_key,
  acf.ambiente,
  acf.status_integracao,
  acf.ultima_sincronizacao,
  acf.mensagem_erro,
  acf.created_at,
  acf.updated_at
FROM administradoras_config_financeira acf
LEFT JOIN administradoras a ON a.id = acf.administradora_id
WHERE acf.instituicao_financeira = 'asaas'
   OR acf.instituicao_financeira IS NULL
ORDER BY a.nome;

-- 3. Verificar especificamente a configuração do Asaas
SELECT 
  acf.id,
  acf.administradora_id,
  a.nome as administradora_nome,
  a.cnpj,
  acf.instituicao_financeira,
  CASE 
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ FALTANDO'
    WHEN LENGTH(acf.api_key) < 20 THEN '⚠️ SUSPEITA (muito curta)'
    WHEN LENGTH(acf.api_key) >= 20 AND LENGTH(acf.api_key) <= 100 THEN '✅ VÁLIDA'
    ELSE '⚠️ MUITO LONGA'
  END as status_api_key,
  SUBSTRING(acf.api_key, 1, 10) || '...' as api_key_preview,
  acf.ambiente,
  acf.status_integracao,
  CASE 
    WHEN acf.status_integracao = 'ativa' THEN '✅ ATIVA'
    WHEN acf.status_integracao = 'inativa' THEN '❌ INATIVA'
    WHEN acf.status_integracao = 'erro' THEN '⚠️ COM ERRO'
    WHEN acf.status_integracao = 'configurando' THEN '🔄 CONFIGURANDO'
    ELSE '❓ DESCONHECIDO'
  END as status_detalhado,
  acf.ultima_sincronizacao,
  acf.mensagem_erro,
  acf.created_at,
  acf.updated_at
FROM administradoras_config_financeira acf
INNER JOIN administradoras a ON a.id = acf.administradora_id
WHERE acf.instituicao_financeira = 'asaas'
ORDER BY a.nome;

-- 4. Verificar se há configuração para "Benefit Cobranças" especificamente
SELECT 
  a.id as administradora_id,
  a.nome as administradora_nome,
  a.cnpj,
  CASE 
    WHEN acf.id IS NULL THEN '❌ SEM CONFIGURAÇÃO'
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN acf.status_integracao != 'ativa' THEN '⚠️ STATUS: ' || acf.status_integracao
    WHEN acf.instituicao_financeira != 'asaas' THEN '⚠️ INSTITUIÇÃO: ' || acf.instituicao_financeira
    ELSE '✅ CONFIGURADA CORRETAMENTE'
  END as status_configuracao,
  acf.instituicao_financeira,
  CASE 
    WHEN acf.api_key IS NOT NULL AND acf.api_key != '' 
    THEN SUBSTRING(acf.api_key, 1, 15) || '...' || SUBSTRING(acf.api_key, LENGTH(acf.api_key) - 5)
    ELSE NULL
  END as api_key_preview,
  acf.ambiente,
  acf.status_integracao,
  acf.ultima_sincronizacao,
  acf.mensagem_erro
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE LOWER(a.nome) LIKE '%benefit%' 
   OR LOWER(a.nome) LIKE '%cobran%'
   OR LOWER(a.nome) LIKE '%cobrança%'
ORDER BY a.nome;

-- 5. Verificar se a configuração está pronta para extrair faturas
-- (Configuração válida = api_key preenchida + status_integracao = 'ativa' + instituicao_financeira = 'asaas')
SELECT 
  a.id as administradora_id,
  a.nome as administradora_nome,
  CASE 
    WHEN acf.id IS NULL THEN '❌ NÃO CONFIGURADA'
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN acf.instituicao_financeira != 'asaas' THEN '❌ INSTITUIÇÃO INCORRETA: ' || COALESCE(acf.instituicao_financeira, 'NULL')
    WHEN acf.status_integracao != 'ativa' THEN '❌ STATUS INATIVO: ' || acf.status_integracao
    ELSE '✅ PRONTA PARA USO'
  END as status_para_extrair_faturas,
  acf.ambiente,
  acf.ultima_sincronizacao
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE LOWER(a.nome) LIKE '%benefit%' 
   OR LOWER(a.nome) LIKE '%cobran%'
   OR LOWER(a.nome) LIKE '%cobrança%'
ORDER BY a.nome;

-- 6. Contar faturas do Asaas por administradora (para verificar se já há faturas)
SELECT 
  a.id as administradora_id,
  a.nome as administradora_nome,
  COUNT(f.id) as total_faturas,
  COUNT(CASE WHEN f.asaas_charge_id IS NOT NULL THEN 1 END) as faturas_com_asaas_id,
  COUNT(CASE WHEN f.status = 'paga' THEN 1 END) as faturas_pagas,
  COUNT(CASE WHEN f.status = 'pendente' THEN 1 END) as faturas_pendentes,
  COUNT(CASE WHEN f.status = 'atrasada' THEN 1 END) as faturas_atrasadas
FROM administradoras a
LEFT JOIN faturas f ON f.administradora_id = a.id
WHERE LOWER(a.nome) LIKE '%benefit%' 
   OR LOWER(a.nome) LIKE '%cobran%'
   OR LOWER(a.nome) LIKE '%cobrança%'
GROUP BY a.id, a.nome
ORDER BY a.nome;

-- 7. Resumo final - Status da configuração
DO $$
DECLARE
  admin_id UUID;
  admin_nome TEXT;
  config_id UUID;
  tem_api_key BOOLEAN;
  status_integracao TEXT;
  instituicao TEXT;
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'RESUMO DA CONFIGURAÇÃO';
  RAISE NOTICE '============================================================';
  
  -- Buscar administradora "Benefit Cobranças"
  SELECT id, nome INTO admin_id, admin_nome
  FROM administradoras
  WHERE LOWER(nome) LIKE '%benefit%' 
     OR LOWER(nome) LIKE '%cobran%'
     OR LOWER(nome) LIKE '%cobrança%'
  ORDER BY nome
  LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE NOTICE '⚠️ Administradora "Benefit Cobranças" não encontrada.';
    RAISE NOTICE '   Verifique o nome exato da administradora na lista acima.';
  ELSE
    RAISE NOTICE '✅ Administradora encontrada: % (ID: %)', admin_nome, admin_id;
    
    -- Verificar configuração
    SELECT acf.id, 
           (acf.api_key IS NOT NULL AND acf.api_key != '') as tem_key,
           acf.status_integracao,
           acf.instituicao_financeira
    INTO config_id, tem_api_key, status_integracao, instituicao
    FROM administradoras_config_financeira acf
    WHERE acf.administradora_id = admin_id;
    
    IF config_id IS NULL THEN
      RAISE NOTICE '❌ CONFIGURAÇÃO NÃO ENCONTRADA';
      RAISE NOTICE '   A administradora não possui configuração financeira.';
      RAISE NOTICE '   Ação necessária: Criar configuração na página de configurações.';
    ELSIF NOT tem_api_key THEN
      RAISE NOTICE '❌ API KEY NÃO CONFIGURADA';
      RAISE NOTICE '   A configuração existe mas não possui API key.';
      RAISE NOTICE '   Ação necessária: Adicionar API key na página de configurações.';
    ELSIF instituicao != 'asaas' THEN
      RAISE NOTICE '❌ INSTITUIÇÃO FINANCEIRA INCORRETA';
      RAISE NOTICE '   Instituição atual: %', COALESCE(instituicao, 'NULL');
      RAISE NOTICE '   Ação necessária: Alterar para "Asaas" na página de configurações.';
    ELSIF status_integracao != 'ativa' THEN
      RAISE NOTICE '⚠️ STATUS DE INTEGRAÇÃO: %', status_integracao;
      RAISE NOTICE '   A integração não está ativa.';
      RAISE NOTICE '   Ação necessária: Ativar a integração na página de configurações.';
    ELSE
      RAISE NOTICE '✅ CONFIGURAÇÃO CORRETA E PRONTA PARA USO';
      RAISE NOTICE '   - API Key: Configurada';
      RAISE NOTICE '   - Instituição: Asaas';
      RAISE NOTICE '   - Status: Ativa';
      RAISE NOTICE '   A configuração está pronta para extrair faturas do Asaas.';
    END IF;
  END IF;
  
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
END $$;

-- 8. Query para corrigir a configuração (se necessário)
-- Descomente e execute apenas se necessário:
/*
-- Ativar integração se a API key estiver configurada
UPDATE administradoras_config_financeira
SET status_integracao = 'ativa',
    instituicao_financeira = 'asaas',
    updated_at = NOW()
WHERE administradora_id = (
  SELECT id FROM administradoras 
  WHERE LOWER(nome) LIKE '%benefit%' 
     OR LOWER(nome) LIKE '%cobran%'
  LIMIT 1
)
AND api_key IS NOT NULL 
AND api_key != '';
*/

