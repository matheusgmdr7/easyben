-- ============================================
-- VERIFICAR E CORRIGIR RLS PARA FATURAS DO ASAAS
-- ============================================
-- Este script verifica e corrige políticas RLS que podem estar
-- impedindo a visualização de faturas do Asaas na página de administradoras

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

-- 3. Verificar se há faturas sem tenant_id (pode causar problemas)
SELECT 
  COUNT(*) as total_faturas,
  COUNT(tenant_id) as faturas_com_tenant_id,
  COUNT(*) - COUNT(tenant_id) as faturas_sem_tenant_id
FROM faturas;

-- 4. Verificar se há faturas do Asaas sem tenant_id
SELECT 
  COUNT(*) as faturas_asaas_sem_tenant
FROM faturas
WHERE asaas_charge_id IS NOT NULL
  AND tenant_id IS NULL;

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

-- 7. Verificar se há faturas com tenant_id NULL e corrigir se necessário
-- (Apenas para faturas do Asaas que podem ter sido criadas antes da implementação do tenant_id)
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
    RAISE NOTICE '⚠️ Nenhum tenant ativo encontrado. Não é possível corrigir tenant_id das faturas.';
  ELSE
    -- Contar faturas sem tenant_id
    SELECT COUNT(*) INTO faturas_sem_tenant
    FROM faturas
    WHERE tenant_id IS NULL;

    IF faturas_sem_tenant > 0 THEN
      RAISE NOTICE '⚠️ Encontradas % faturas sem tenant_id. Atualizando...', faturas_sem_tenant;
      
      -- Atualizar faturas sem tenant_id (apenas para faturas do Asaas)
      UPDATE faturas
      SET tenant_id = tenant_id_default
      WHERE tenant_id IS NULL
        AND asaas_charge_id IS NOT NULL;
      
      RAISE NOTICE '✅ Faturas do Asaas sem tenant_id foram atualizadas.';
    ELSE
      RAISE NOTICE '✅ Todas as faturas possuem tenant_id.';
    END IF;
  END IF;
END $$;

-- 8. Verificar permissões de acesso
DO $$
BEGIN
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VERIFICAÇÃO FINAL';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Políticas RLS criadas/atualizadas com sucesso!';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '   1. Verifique se o usuário logado é um admin ativo';
  RAISE NOTICE '   2. Verifique se o auth.uid() está correto na sessão';
  RAISE NOTICE '   3. Teste a visualização de faturas na página de administradoras';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Para verificar o usuário atual:';
  RAISE NOTICE '   SELECT auth.uid() as current_user_id;';
  RAISE NOTICE '   SELECT * FROM usuarios_admin WHERE auth_user_id = auth.uid();';
  RAISE NOTICE ' ';
END $$;

-- 9. Query de teste para verificar se um admin pode ver faturas
-- (Execute esta query como um usuário admin autenticado)
-- SELECT COUNT(*) as total_faturas_visiveis
-- FROM faturas
-- WHERE asaas_charge_id IS NOT NULL;

