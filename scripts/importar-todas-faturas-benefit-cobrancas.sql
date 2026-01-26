-- ============================================
-- IMPORTAR TODAS AS FATURAS DO ASAAS - BENEFIT COBRANÇAS
-- ============================================
-- Este script lista todos os clientes e fornece comandos
-- para importar todas as faturas do Asaas

-- 1. Verificar configuração
SELECT 
  'VERIFICAÇÃO DE CONFIGURAÇÃO' as verificacao,
  CASE 
    WHEN acf.id IS NULL THEN '❌ SEM CONFIGURAÇÃO'
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN acf.instituicao_financeira != 'asaas' THEN '❌ INSTITUIÇÃO: ' || COALESCE(acf.instituicao_financeira, 'NULL')
    WHEN acf.status_integracao != 'ativa' THEN '❌ STATUS: ' || acf.status_integracao
    ELSE '✅ CONFIGURADA CORRETAMENTE'
  END as status,
  acf.ambiente
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 2. Listar todos os clientes com dados completos
SELECT 
  'CLIENTES PARA IMPORTAÇÃO' as verificacao,
  vw.id as cliente_administradora_id,
  vw.cliente_nome,
  vw.cliente_cpf,
  vw.cliente_email,
  vw.proposta_id,
  CASE 
    WHEN vw.cliente_cpf IS NULL OR vw.cliente_cpf = '' THEN '❌ SEM CPF'
    WHEN LENGTH(REPLACE(REPLACE(REPLACE(vw.cliente_cpf, '.', ''), '-', ''), ' ', '')) < 11 THEN '⚠️ CPF INVÁLIDO'
    ELSE '✅ PRONTO'
  END as status
FROM vw_clientes_administradoras_completo vw
WHERE vw.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
  AND vw.cliente_cpf IS NOT NULL 
  AND vw.cliente_cpf != ''
  AND LENGTH(REPLACE(REPLACE(REPLACE(vw.cliente_cpf, '.', ''), '-', ''), ' ', '')) >= 11
ORDER BY vw.cliente_nome;

-- 3. Gerar comandos curl para importação em lote
DO $$
DECLARE
  cliente_record RECORD;
  comando TEXT;
  total_clientes INTEGER := 0;
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'COMANDOS PARA IMPORTAR TODAS AS FATURAS';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
  RAISE NOTICE 'OPÇÃO 1: Via API (Execute no terminal ou Postman)';
  RAISE NOTICE ' ';
  
  FOR cliente_record IN 
    SELECT 
      vw.id as cliente_id,
      vw.cliente_nome,
      vw.cliente_cpf
    FROM vw_clientes_administradoras_completo vw
    WHERE vw.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
      AND vw.cliente_cpf IS NOT NULL 
      AND vw.cliente_cpf != ''
      AND LENGTH(REPLACE(REPLACE(REPLACE(vw.cliente_cpf, '.', ''), '-', ''), ' ', '')) >= 11
    ORDER BY vw.cliente_nome
  LOOP
    total_clientes := total_clientes + 1;
    comando := format(
      'curl -X POST https://contratandoplanos.com.br/api/admin/recuperar-fatura-asaas \' .
      '-H "Content-Type: application/json" \' .
      '-d ''{"cliente_administradora_id": "%s", "administradora_id": "050be541-db3b-4d3c-be95-df80b68747f1"}''',
      cliente_record.cliente_id
    );
    RAISE NOTICE 'Cliente %: % (CPF: %)', total_clientes, cliente_record.cliente_nome, cliente_record.cliente_cpf;
    RAISE NOTICE '  %', comando;
    RAISE NOTICE ' ';
  END LOOP;
  
  RAISE NOTICE 'Total de clientes: %', total_clientes;
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
END $$;

-- 4. Gerar script JavaScript para execução no console do navegador
DO $$
DECLARE
  cliente_record RECORD;
  script TEXT := '';
  total_clientes INTEGER := 0;
BEGIN
  RAISE NOTICE 'OPÇÃO 2: Script JavaScript (Execute no console do navegador)';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Copie e cole este código no console do navegador (F12):';
  RAISE NOTICE ' ';
  RAISE NOTICE '```javascript';
  RAISE NOTICE '(async () => {';
  RAISE NOTICE '  const clientes = [';
  
  FOR cliente_record IN 
    SELECT 
      vw.id as cliente_id,
      vw.cliente_nome,
      vw.cliente_cpf
    FROM vw_clientes_administradoras_completo vw
    WHERE vw.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
      AND vw.cliente_cpf IS NOT NULL 
      AND vw.cliente_cpf != ''
      AND LENGTH(REPLACE(REPLACE(REPLACE(vw.cliente_cpf, '.', ''), '-', ''), ' ', '')) >= 11
    ORDER BY vw.cliente_nome
  LOOP
    total_clientes := total_clientes + 1;
    IF total_clientes > 1 THEN
      script := script || ',';
    END IF;
    script := script || format(E'\n    { id: "%s", nome: "%s", cpf: "%s" }', 
      cliente_record.cliente_id, 
      REPLACE(cliente_record.cliente_nome, '"', '\"'),
      cliente_record.cliente_cpf
    );
  END LOOP;
  
  RAISE NOTICE '%', script;
  RAISE NOTICE '  ];';
  RAISE NOTICE ' ';
  RAISE NOTICE '  console.log(`Importando faturas para ${clientes.length} clientes...`);';
  RAISE NOTICE ' ';
  RAISE NOTICE '  for (const cliente of clientes) {';
  RAISE NOTICE '    try {';
  RAISE NOTICE '      console.log(`Processando: ${cliente.nome}...`);';
  RAISE NOTICE '      const response = await fetch(''/api/admin/recuperar-fatura-asaas'', {';
  RAISE NOTICE '        method: ''POST'',';
  RAISE NOTICE '        headers: { ''Content-Type'': ''application/json'' },';
  RAISE NOTICE '        body: JSON.stringify({';
  RAISE NOTICE '          cliente_administradora_id: cliente.id,';
  RAISE NOTICE '          administradora_id: ''050be541-db3b-4d3c-be95-df80b68747f1''';
  RAISE NOTICE '        })';
  RAISE NOTICE '      });';
  RAISE NOTICE '      const result = await response.json();';
  RAISE NOTICE '      if (result.sucesso) {';
  RAISE NOTICE '        console.log(`✅ ${cliente.nome}: ${result.faturas_salvas} novas, ${result.faturas_existentes} existentes`);';
  RAISE NOTICE '      } else {';
  RAISE NOTICE '        console.error(`❌ ${cliente.nome}:`, result.erros);';
  RAISE NOTICE '      }';
  RAISE NOTICE '      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay de 1s entre requisições';
  RAISE NOTICE '    } catch (error) {';
  RAISE NOTICE '      console.error(`❌ Erro ao processar ${cliente.nome}:`, error);';
  RAISE NOTICE '    }';
  RAISE NOTICE '  }';
  RAISE NOTICE ' ';
  RAISE NOTICE '  console.log(''✅ Importação concluída!'');';
  RAISE NOTICE '})();';
  RAISE NOTICE '```';
  RAISE NOTICE ' ';
END $$;

-- 5. Resumo final
DO $$
DECLARE
  total_clientes INTEGER;
  tem_config BOOLEAN;
  tem_api_key BOOLEAN;
BEGIN
  -- Contar clientes válidos
  SELECT COUNT(*) INTO total_clientes
  FROM vw_clientes_administradoras_completo vw
  WHERE vw.administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1'
    AND vw.cliente_cpf IS NOT NULL 
    AND vw.cliente_cpf != ''
    AND LENGTH(REPLACE(REPLACE(REPLACE(vw.cliente_cpf, '.', ''), '-', ''), ' ', '')) >= 11;
  
  -- Verificar configuração
  SELECT 
    (acf.id IS NOT NULL) as tem_config,
    (acf.api_key IS NOT NULL AND acf.api_key != '') as tem_key
  INTO tem_config, tem_api_key
  FROM administradoras a
  LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
  WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'RESUMO';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '   - Total de clientes para importação: %', total_clientes;
  RAISE NOTICE '   - Configuração: %', CASE WHEN tem_config AND tem_api_key THEN '✅ OK' ELSE '❌ INCOMPLETA' END;
  RAISE NOTICE ' ';
  RAISE NOTICE 'RECOMENDAÇÃO:';
  IF NOT tem_config OR NOT tem_api_key THEN
    RAISE NOTICE '   1. Configure a API do Asaas primeiro';
    RAISE NOTICE '   2. Depois execute a importação';
  ELSE
    RAISE NOTICE '   Use o script JavaScript no console do navegador';
    RAISE NOTICE '   (mais fácil e com feedback visual)';
  END IF;
  RAISE NOTICE ' ';
END $$;







