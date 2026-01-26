-- ============================================
-- VERIFICAR E CORRIGIR RLS PARA PÁGINA FINANCEIRO
-- ============================================
-- Este script verifica e corrige políticas RLS que podem estar
-- impedindo a visualização de faturas na página financeiro

-- 1. Verificar políticas RLS atuais na tabela faturas
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VERIFICANDO POLÍTICAS RLS DA TABELA FATURAS';
  RAISE NOTICE '============================================================';
END $$;

-- Listar todas as políticas da tabela faturas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'faturas'
ORDER BY policyname;

-- 2. Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'faturas';

-- 3. Verificar configuração do Asaas para Benefit Cobranças
SELECT 
  'CONFIGURAÇÃO ASAAS - BENEFIT COBRANÇAS' as verificacao,
  acf.id as config_id,
  acf.administradora_id,
  a.nome as administradora_nome,
  acf.instituicao_financeira,
  CASE 
    WHEN acf.api_key IS NULL OR acf.api_key = '' THEN '❌ SEM API KEY'
    WHEN LENGTH(acf.api_key) < 20 THEN '⚠️ API KEY SUSPEITA'
    ELSE '✅ API KEY OK (' || LENGTH(acf.api_key) || ' caracteres)'
  END as status_api_key,
  acf.ambiente,
  acf.status_integracao,
  CASE 
    WHEN acf.status_integracao = 'ativa' THEN '✅ ATIVA'
    ELSE '❌ ' || COALESCE(acf.status_integracao, 'NULL')
  END as status_detalhado
FROM administradoras a
LEFT JOIN administradoras_config_financeira acf ON acf.administradora_id = a.id
WHERE a.id = '050be541-db3b-4d3c-be95-df80b68747f1';

-- 4. Verificar se há faturas no banco (teste de acesso)
SELECT 
  'TESTE DE ACESSO - FATURAS' as verificacao,
  COUNT(*) as total_faturas,
  COUNT(CASE WHEN asaas_charge_id IS NOT NULL THEN 1 END) as com_asaas_id,
  COUNT(CASE WHEN administradora_id = '050be541-db3b-4d3c-be95-df80b68747f1' THEN 1 END) as da_benefit_cobrancas
FROM faturas;

-- 5. CORRIGIR: Remover políticas conflitantes e criar política correta
DO $$
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'CORRIGINDO POLÍTICAS RLS';
  RAISE NOTICE '============================================================';
END $$;

-- Remover todas as políticas existentes da tabela faturas
DROP POLICY IF EXISTS "Admins acesso total faturas" ON faturas;
DROP POLICY IF EXISTS "tenant_isolation_faturas" ON faturas;
DROP POLICY IF EXISTS "Admins podem ver faturas" ON faturas;
DROP POLICY IF EXISTS "Admins podem inserir faturas" ON faturas;
DROP POLICY IF EXISTS "Admins podem atualizar faturas" ON faturas;
DROP POLICY IF EXISTS "Admins podem deletar faturas" ON faturas;

-- Criar política única e correta para admins
-- Esta política permite acesso total para usuários admin autenticados
CREATE POLICY "Admins acesso total faturas" 
  ON faturas FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  );

-- 6. Garantir que RLS está habilitado
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;

-- 7. Verificar políticas da tabela administradoras_config_financeira
SELECT 
  'POLÍTICAS CONFIG FINANCEIRA' as verificacao,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'administradoras_config_financeira'
ORDER BY policyname;

-- 8. Verificar se há políticas conflitantes em administradoras_config_financeira
-- Se necessário, criar política para admins
DO $$
BEGIN
  -- Verificar se já existe política para admins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'administradoras_config_financeira' 
    AND policyname = 'Admins acesso total config financeira'
  ) THEN
    -- Remover políticas antigas
    DROP POLICY IF EXISTS "Admins acesso total config financeira" ON administradoras_config_financeira;
    DROP POLICY IF EXISTS "tenant_isolation_config_financeira" ON administradoras_config_financeira;
    
    -- Criar política para admins
    CREATE POLICY "Admins acesso total config financeira" 
      ON administradoras_config_financeira FOR ALL 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM usuarios_admin 
          WHERE usuarios_admin.auth_user_id = auth.uid()
          AND usuarios_admin.ativo = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM usuarios_admin 
          WHERE usuarios_admin.auth_user_id = auth.uid()
          AND usuarios_admin.ativo = true
        )
      );
    
    RAISE NOTICE '✅ Política criada para administradoras_config_financeira';
  ELSE
    RAISE NOTICE '✅ Política já existe para administradoras_config_financeira';
  END IF;
END $$;

-- 9. Verificar se a função de atualizar está funcionando corretamente
-- (A função handleAtualizar usa administradoraSelecionada, então só atualiza a selecionada)
DO $$
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'INFORMAÇÕES SOBRE A FUNÇÃO DE ATUALIZAR';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
  RAISE NOTICE 'A função "Atualizar & Sincronizar" na página financeiro:';
  RAISE NOTICE '  1. Atualiza apenas a administradora SELECIONADA';
  RAISE NOTICE '  2. Não atualiza todas as administradoras de uma vez';
  RAISE NOTICE '  3. Requer que uma administradora específica esteja selecionada';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Para atualizar faturas da Benefit Cobranças:';
  RAISE NOTICE '  1. Selecione "BENEFIT COBRANÇAS" no dropdown';
  RAISE NOTICE '  2. Clique em "Atualizar & Sincronizar"';
  RAISE NOTICE ' ';
  RAISE NOTICE 'A função sincroniza:';
  RAISE NOTICE '  - Status das faturas existentes com asaas_charge_id';
  RAISE NOTICE '  - Não importa novas faturas do Asaas';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Para IMPORTAR novas faturas do Asaas:';
  RAISE NOTICE '  - Use o botão "Recuperar do Asaas" na página de cada cliente';
  RAISE NOTICE '  - Ou use a API: POST /api/admin/recuperar-fatura-asaas';
  RAISE NOTICE ' ';
END $$;

-- 10. Verificar se há faturas com tenant_id NULL
SELECT 
  'FATURAS SEM TENANT_ID' as verificacao,
  COUNT(*) as total_sem_tenant,
  COUNT(CASE WHEN asaas_charge_id IS NOT NULL THEN 1 END) as asaas_sem_tenant
FROM faturas
WHERE tenant_id IS NULL;

-- 11. Corrigir tenant_id se necessário
DO $$
DECLARE
  tenant_id_default UUID;
  faturas_sem_tenant INTEGER;
BEGIN
  -- Buscar o tenant_id padrão (primeiro tenant ativo)
  SELECT id INTO tenant_id_default
  FROM tenants
  WHERE status = 'ativo'
  ORDER BY created_at ASC
  LIMIT 1;

  IF tenant_id_default IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum tenant ativo encontrado.';
  ELSE
    -- Contar faturas sem tenant_id
    SELECT COUNT(*) INTO faturas_sem_tenant
    FROM faturas
    WHERE tenant_id IS NULL;

    IF faturas_sem_tenant > 0 THEN
      RAISE NOTICE '⚠️ Encontradas % faturas sem tenant_id. Atualizando...', faturas_sem_tenant;
      
      -- Atualizar faturas sem tenant_id
      UPDATE faturas
      SET tenant_id = tenant_id_default
      WHERE tenant_id IS NULL;
      
      RAISE NOTICE '✅ Faturas sem tenant_id foram atualizadas.';
    ELSE
      RAISE NOTICE '✅ Todas as faturas possuem tenant_id.';
    END IF;
  END IF;
END $$;

-- 12. Resumo final
DO $$
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VERIFICAÇÃO FINAL';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
  RAISE NOTICE '✅ Políticas RLS criadas/atualizadas com sucesso!';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '   1. Verifique se o usuário logado é um admin ativo';
  RAISE NOTICE '   2. Selecione "BENEFIT COBRANÇAS" no dropdown da página financeiro';
  RAISE NOTICE '   3. Verifique se as faturas aparecem';
  RAISE NOTICE '   4. Se não aparecerem, verifique a configuração da API do Asaas';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Para verificar o usuário atual:';
  RAISE NOTICE '   SELECT auth.uid() as current_user_id;';
  RAISE NOTICE '   SELECT * FROM usuarios_admin WHERE auth_user_id = auth.uid();';
  RAISE NOTICE ' ';
END $$;







