-- ============================================
-- VERIFICAÇÃO DETALHADA - BENEFIT COBRANÇAS
-- ============================================
-- ID da administradora: 050be541-db3b-4d3c-be95-df80b68747f1

-- 1. Verificar configuração da API do Asaas
SELECT 
  'CONFIGURAÇÃO API ASAAS' as verificacao,
  acf.id as config_id,
  acf.administradora_id,
  a.nome as administradora_nome,
  acf.instituicao_financeira,
  CASE 
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN LENGTH(acf.api_key) < 20 THEN '⚠️ API KEY SUSPEITA (muito curta)'
    ELSE '✅ API KEY CONFIGURADA (' || LENGTH(acf.api_key) || ' caracteres)'
  END as status_api_key,
  SUBSTRING(acf.api_key, 1, 15) || '...' || SUBSTRING(acf.api_key, GREATEST(1, LENGTH(acf.api_key) - 5)) as api_key_preview,
  acf.ambiente,
  acf.status_integracao,
  CASE 
    WHEN acf.status_integracao = 'ativa' THEN '✅ ATIVA'
    WHEN acf.status_integracao = 'inativa' THEN '❌ INATIVA'
    WHEN acf.status_integracao = 'erro' THEN '⚠️ COM ERRO'
    ELSE '❓ ' || COALESCE(acf.status_integracao, 'NULL')
  END as status_detalhado,
  acf.ultima_sincronizacao,
  acf.mensagem_erro,
  acf.created_at,
  acf.updated_at
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 2. Verificar se há clientes vinculados
SELECT 
  'CLIENTES VINCULADOS' as verificacao,
  COUNT(*) as total_clientes,
  COUNT(CASE WHEN status = 'ativo' THEN 1 END) as clientes_ativos,
  COUNT(CASE WHEN implantado = true THEN 1 END) as clientes_implantados,
  COUNT(CASE WHEN proposta_id IS NOT NULL THEN 1 END) as clientes_com_proposta
FROM clientes_administradoras
WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 3. Listar clientes vinculados com detalhes (usando view)
SELECT 
  'DETALHES DOS CLIENTES' as verificacao,
  vw.id as cliente_id,
  vw.cliente_nome,
  vw.cliente_cpf,
  vw.cliente_email,
  vw.status,
  vw.implantado,
  vw.proposta_id,
  vw.valor_mensal,
  vw.data_vinculacao,
  vw.total_faturas,
  vw.faturas_pagas,
  vw.faturas_atrasadas,
  vw.faturas_pendentes
FROM vw_clientes_administradoras_completo vw
WHERE vw.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
ORDER BY vw.data_vinculacao DESC
LIMIT 20;

-- 4. Verificar se há faturas no banco (mesmo sem asaas_id)
SELECT 
  'FATURAS NO BANCO' as verificacao,
  COUNT(*) as total_faturas,
  COUNT(CASE WHEN asaas_charge_id IS NOT NULL THEN 1 END) as com_asaas_id,
  COUNT(CASE WHEN asaas_charge_id IS NULL THEN 1 END) as sem_asaas_id,
  COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'paga' THEN 1 END) as pagas,
  COUNT(CASE WHEN status = 'atrasada' THEN 1 END) as atrasadas
FROM faturas
WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 5. Verificar se há propostas vinculadas aos clientes
SELECT 
  'PROPOSTAS DOS CLIENTES' as verificacao,
  COUNT(DISTINCT ca.proposta_id) as total_propostas_unicas,
  COUNT(*) as total_vinculos
FROM clientes_administradoras ca
WHERE ca.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
  AND ca.proposta_id IS NOT NULL;

-- 6. Verificar dados das propostas (CPF, email) para importação do Asaas
SELECT 
  'DADOS PARA IMPORTAÇÃO ASAAS' as verificacao,
  vw.id as cliente_administradora_id,
  vw.cliente_nome,
  vw.cliente_cpf,
  vw.cliente_email,
  p.nome as proposta_nome,
  p.cpf as proposta_cpf,
  p.email as proposta_email,
  CASE 
    WHEN vw.cliente_cpf IS NOT NULL AND vw.cliente_cpf != '' THEN '✅ TEM CPF'
    WHEN p.cpf IS NOT NULL AND p.cpf != '' THEN '✅ CPF NA PROPOSTA'
    ELSE '❌ SEM CPF'
  END as status_cpf
FROM vw_clientes_administradoras_completo vw
LEFT JOIN propostas p ON p.id = vw.proposta_id
WHERE vw.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
ORDER BY vw.data_vinculacao DESC
LIMIT 10;

-- 7. Resumo e diagnóstico
DO $$
DECLARE
  tem_config BOOLEAN;
  tem_api_key BOOLEAN;
  status_config TEXT;
  total_clientes INTEGER;
  total_faturas INTEGER;
  config_pronta BOOLEAN;
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'DIAGNÓSTICO - BENEFIT COBRANÇAS';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
  
  -- Verificar configuração
  SELECT 
    (acf.id IS NOT NULL) as tem_config,
    (acf.api_key IS NOT NULL AND acf.api_key != '') as tem_key,
    COALESCE(acf.status_integracao, 'sem_config') as status
  INTO tem_config, tem_api_key, status_config
  FROM administradoras a
  LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
  WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  -- Contar clientes
  SELECT COUNT(*) INTO total_clientes
  FROM clientes_administradoras
  WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  -- Contar faturas
  SELECT COUNT(*) INTO total_faturas
  FROM faturas
  WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  -- Verificar se está pronta
  config_pronta := tem_config AND tem_api_key AND status_config = 'ativa';
  
  RAISE NOTICE '📊 RESUMO:';
  RAISE NOTICE '   - Total de clientes: %', total_clientes;
  RAISE NOTICE '   - Total de faturas: %', total_faturas;
  RAISE NOTICE ' ';
  
  RAISE NOTICE '🔧 CONFIGURAÇÃO API ASAAS:';
  IF NOT tem_config THEN
    RAISE NOTICE '   ❌ Configuração não encontrada';
  ELSIF NOT tem_api_key THEN
    RAISE NOTICE '   ❌ API Key não configurada';
  ELSIF status_config != 'ativa' THEN
    RAISE NOTICE '   ⚠️ Status: %', status_config;
  ELSE
    RAISE NOTICE '   ✅ Configuração completa e ativa';
  END IF;
  RAISE NOTICE ' ';
  
  RAISE NOTICE '💡 AÇÕES NECESSÁRIAS:';
  
  IF NOT tem_config OR NOT tem_api_key OR status_config != 'ativa' THEN
    RAISE NOTICE '   1. Configurar API do Asaas na página de configurações';
    RAISE NOTICE '      /admin/administradoras/050be541-db3b-4d3c-be95-df80b68747f1/configuracoes';
    RAISE NOTICE ' ';
  END IF;
  
  IF total_clientes = 0 THEN
    RAISE NOTICE '   2. Vincular clientes à administradora';
    RAISE NOTICE '      /admin/administradoras/050be541-db3b-4d3c-be95-df80b68747f1';
    RAISE NOTICE ' ';
  ELSIF total_faturas = 0 AND config_pronta THEN
    RAISE NOTICE '   2. Importar faturas do Asaas para os clientes';
    RAISE NOTICE '      Use o botão "Recuperar do Asaas" na página de cada cliente';
    RAISE NOTICE '      ou use a API: /api/admin/recuperar-fatura-asaas';
    RAISE NOTICE ' ';
  END IF;
  
  IF total_clientes > 0 AND total_faturas = 0 AND config_pronta THEN
    RAISE NOTICE '   3. Para importar faturas em lote, execute:';
    RAISE NOTICE '      POST /api/admin/recuperar-fatura-asaas';
    RAISE NOTICE '      Body: {';
    RAISE NOTICE '        "cliente_administradora_id": "<id_do_cliente>",';
    RAISE NOTICE '        "administradora_id": "050be541-db3b-4d3c-be95-df80b68747f1"';
    RAISE NOTICE '      }';
    RAISE NOTICE ' ';
  END IF;
  
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
END $$;

