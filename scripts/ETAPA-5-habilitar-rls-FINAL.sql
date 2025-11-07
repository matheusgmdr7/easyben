-- ============================================
-- ETAPA 5: HABILITAR RLS E CRIAR POLÍTICAS (VERSÃO FINAL)
-- ============================================

-- Habilitar RLS
ALTER TABLE administradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE administradoras_config_financeira ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_administradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_integracao_financeira ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins podem ver todas as administradoras" ON administradoras;
DROP POLICY IF EXISTS "Admins podem inserir administradoras" ON administradoras;
DROP POLICY IF EXISTS "Admins podem atualizar administradoras" ON administradoras;
DROP POLICY IF EXISTS "Admins acesso total config financeira" ON administradoras_config_financeira;
DROP POLICY IF EXISTS "Admins acesso total clientes administradoras" ON clientes_administradoras;
DROP POLICY IF EXISTS "Admins acesso total faturas" ON faturas;
DROP POLICY IF EXISTS "Admins acesso total pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Admins acesso total logs" ON logs_integracao_financeira;

-- Criar políticas para administradoras
CREATE POLICY "Admins podem ver todas as administradoras" 
  ON administradoras FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  );

CREATE POLICY "Admins podem inserir administradoras" 
  ON administradoras FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  );

CREATE POLICY "Admins podem atualizar administradoras" 
  ON administradoras FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  );

-- Políticas para outras tabelas (acesso total para admins)
CREATE POLICY "Admins acesso total config financeira" 
  ON administradoras_config_financeira FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  );

CREATE POLICY "Admins acesso total clientes administradoras" 
  ON clientes_administradoras FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  );

CREATE POLICY "Admins acesso total faturas" 
  ON faturas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  );

CREATE POLICY "Admins acesso total pagamentos" 
  ON pagamentos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  );

CREATE POLICY "Admins acesso total logs" 
  ON logs_integracao_financeira FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.auth_user_id = auth.uid()
      AND usuarios_admin.ativo = true
    )
  );

-- Mensagem de sucesso
DO $$ 
BEGIN 
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'SISTEMA COMPLETO INSTALADO COM SUCESSO!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Parabens! Todas as etapas foram concluidas:';
  RAISE NOTICE ' ';
  RAISE NOTICE '   ETAPA 1: 6 Tabelas criadas';
  RAISE NOTICE '   ETAPA 2: Indices criados';
  RAISE NOTICE '   ETAPA 3: Triggers criados';
  RAISE NOTICE '   ETAPA 4: 2 Views criadas';
  RAISE NOTICE '   ETAPA 5: RLS e Politicas configuradas';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Sistema de Administradoras e Financeiro operacional!';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Proximos passos:';
  RAISE NOTICE '   1. Acesse: Admin -> Administradoras';
  RAISE NOTICE '   2. Cadastre uma administradora';
  RAISE NOTICE '   3. Vincule clientes';
  RAISE NOTICE '   4. Gere faturas em: Admin -> Financeiro';
  RAISE NOTICE ' ';
  RAISE NOTICE 'Documentacao:';
  RAISE NOTICE '   - COMECE-AQUI.md';
  RAISE NOTICE '   - SISTEMA-ADMINISTRADORAS-COMPLETO.md';
  RAISE NOTICE ' ';
  RAISE NOTICE '============================================================';
END $$;
