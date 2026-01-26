-- ============================================
-- IMPORTAR FATURAS DO ASAAS - BENEFIT COBRANÇAS
-- ============================================
-- Este script verifica a configuração e fornece instruções
-- para importar faturas do Asaas para os clientes da Benefit Cobranças

-- 1. Verificar configuração completa
SELECT 
  'CONFIGURAÇÃO COMPLETA' as verificacao,
  a.id as administradora_id,
  a.nome as administradora_nome,
  acf.id as config_id,
  CASE 
    WHEN acf.id IS NULL THEN '❌ SEM CONFIGURAÇÃO'
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN acf.instituicao_financeira != 'asaas' THEN '❌ INSTITUIÇÃO: ' || COALESCE(acf.instituicao_financeira, 'NULL')
    WHEN acf.status_integracao != 'ativa' THEN '❌ STATUS: ' || acf.status_integracao
    ELSE '✅ CONFIGURADA CORRETAMENTE'
  END as status_configuracao,
  acf.instituicao_financeira,
  CASE 
    WHEN acf.api_key IS NOT NULL AND acf.api_key != '' 
    THEN SUBSTRING(acf.api_key, 1, 15) || '...' || SUBSTRING(acf.api_key, GREATEST(1, LENGTH(acf.api_key) - 5))
    ELSE NULL
  END as api_key_preview,
  acf.ambiente,
  acf.status_integracao
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 2. Listar todos os clientes com dados para importação
SELECT 
  'CLIENTES PARA IMPORTAÇÃO' as verificacao,
  vw.id as cliente_administradora_id,
  vw.cliente_nome,
  vw.cliente_cpf,
  vw.cliente_email,
  vw.proposta_id,
  vw.administradora_id,
  CASE 
    WHEN vw.cliente_cpf IS NULL OR vw.cliente_cpf = '' THEN '❌ SEM CPF'
    WHEN LENGTH(REPLACE(vw.cliente_cpf, '.', '')) < 11 THEN '⚠️ CPF INVÁLIDO'
    ELSE '✅ PRONTO PARA IMPORTAÇÃO'
  END as status_importacao
FROM vw_clientes_administradoras_completo vw
WHERE vw.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
ORDER BY vw.cliente_nome;

-- 3. Verificar faturas existentes no banco
SELECT 
  'FATURAS EXISTENTES' as verificacao,
  COUNT(*) as total_faturas,
  COUNT(CASE WHEN asaas_charge_id IS NOT NULL THEN 1 END) as com_asaas_id,
  COUNT(CASE WHEN asaas_charge_id IS NULL THEN 1 END) as sem_asaas_id,
  COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'paga' THEN 1 END) as pagas,
  COUNT(CASE WHEN status = 'atrasada' THEN 1 END) as atrasadas
FROM faturas
WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 4. Instruções para importação
DO $$
DECLARE
  tem_config BOOLEAN;
  tem_api_key BOOLEAN;
  status_config TEXT;
  total_clientes INTEGER;
  total_faturas INTEGER;
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'INSTRUÇÕES PARA IMPORTAR FATURAS DO ASAAS';
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
  FROM vw_clientes_administradoras_completo
  WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  -- Contar faturas
  SELECT COUNT(*) INTO total_faturas
  FROM faturas
  WHERE administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  RAISE NOTICE '📊 SITUAÇÃO ATUAL:';
  RAISE NOTICE '   - Total de clientes: %', total_clientes;
  RAISE NOTICE '   - Total de faturas no banco: %', total_faturas;
  RAISE NOTICE ' ';
  
  IF NOT tem_config OR NOT tem_api_key OR status_config != 'ativa' THEN
    RAISE NOTICE '❌ CONFIGURAÇÃO INCOMPLETA';
    RAISE NOTICE ' ';
    RAISE NOTICE 'Ação necessária:';
    RAISE NOTICE '   1. Acesse: /admin/administradoras/050be541-db3b-4d3c-be95-df80b68747f1/configuracoes';
    RAISE NOTICE '   2. Configure a API Key do Asaas';
    RAISE NOTICE '   3. Defina Instituição Financeira como "Asaas"';
    RAISE NOTICE '   4. Ative o status da integração';
    RAISE NOTICE ' ';
  ELSE
    RAISE NOTICE '✅ CONFIGURAÇÃO OK';
    RAISE NOTICE ' ';
    RAISE NOTICE 'MÉTODO 1: Importar via Interface Web';
    RAISE NOTICE '   1. Acesse a página do cliente:';
    RAISE NOTICE '      /admin/administradoras/050be541-db3b-4d3c-be95-df80b68747f1/clientes/<cliente_id>';
    RAISE NOTICE '   2. Vá para a aba "Financeiro"';
    RAISE NOTICE '   3. Clique em "Recuperar do Asaas"';
    RAISE NOTICE ' ';
    RAISE NOTICE 'MÉTODO 2: Importar via API (para múltiplos clientes)';
    RAISE NOTICE '   Use a API POST /api/admin/recuperar-fatura-asaas';
    RAISE NOTICE '   Body JSON:';
    RAISE NOTICE '   {';
    RAISE NOTICE '     "cliente_administradora_id": "<id_do_cliente>",';
    RAISE NOTICE '     "administradora_id": "050be541-db3b-4d3c-be95-df80b68747f1"';
    RAISE NOTICE '   }';
    RAISE NOTICE ' ';
    RAISE NOTICE 'MÉTODO 3: Sincronizar status de faturas existentes';
    RAISE NOTICE '   1. Acesse: /admin/financeiro';
    RAISE NOTICE '   2. Selecione "BENEFIT COBRANÇAS" no dropdown';
    RAISE NOTICE '   3. Clique em "Atualizar & Sincronizar"';
    RAISE NOTICE '   (Isso sincroniza apenas faturas que já têm asaas_charge_id)';
    RAISE NOTICE ' ';
  END IF;
  
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
END $$;

-- 5. Query para testar acesso às faturas (simular o que a página faz)
SELECT 
  'TESTE DE ACESSO - SIMULANDO PÁGINA FINANCEIRO' as verificacao,
  f.id,
  f.numero_fatura,
  f.valor,
  f.vencimento,
  f.status,
  f.asaas_charge_id,
  f.cliente_administradora_id,
  f.administradora_id
FROM faturas f
WHERE f.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
ORDER BY f.vencimento DESC
LIMIT 10;

-- 6. Verificar se há políticas RLS bloqueando
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Verificar se RLS está habilitado
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'faturas';
  
  -- Contar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'faturas';
  
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VERIFICAÇÃO DE RLS';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '   - RLS habilitado: %', CASE WHEN rls_enabled THEN 'SIM' ELSE 'NÃO' END;
  RAISE NOTICE '   - Número de políticas: %', policy_count;
  RAISE NOTICE ' ';
  
  IF rls_enabled AND policy_count = 0 THEN
    RAISE NOTICE '⚠️ ATENÇÃO: RLS está habilitado mas não há políticas!';
    RAISE NOTICE '   Isso pode bloquear TODAS as consultas.';
    RAISE NOTICE '   Execute o script: verificar-corrigir-financeiro-rls-asaas.sql';
  ELSIF rls_enabled AND policy_count > 0 THEN
    RAISE NOTICE '✅ RLS está configurado com políticas.';
  ELSE
    RAISE NOTICE 'ℹ️ RLS não está habilitado (acesso livre).';
  END IF;
  
  RAISE NOTICE ' ';
END $$;







