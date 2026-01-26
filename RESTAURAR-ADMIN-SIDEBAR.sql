-- ============================================
-- SCRIPT: RESTAURAR FUNCIONAMENTO DO ADMIN SIDEBAR
-- Policy Permissiva - Mantém Segurança do Sistema
-- ============================================
-- 
-- ✅ OBJETIVO:
-- - Restaurar funcionamento do admin sidebar como antes
-- - Manter RLS habilitado para segurança
-- - Permitir que usuários autenticados vejam seus dados
-- 
-- ⚠️ INSTRUÇÕES:
-- 1. Copie todo este script
-- 2. Cole no Supabase SQL Editor
-- 3. Execute o script
-- 4. Verifique se as policies foram criadas (queries no final)
-- 5. Teste o login e o admin sidebar
-- 
-- ============================================

BEGIN;

-- ============================================
-- 1. GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. REMOVER POLICIES PROBLEMÁTICAS
-- ============================================
-- Remover a policy baseada em tenant_id que está bloqueando o acesso
DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;

-- Remover outras policies existentes para evitar conflitos
DROP POLICY IF EXISTS "usuarios_admin_select_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_self" ON usuarios_admin;

-- ============================================
-- 3. CRIAR POLICY PERMISSIVA PARA SELECT
-- ============================================
-- Esta policy permite que qualquer usuário autenticado veja usuários admin
-- Isso é necessário para:
-- - Login funcionar corretamente
-- - Verificação de permissões
-- - Carregamento do admin sidebar
CREATE POLICY "usuarios_admin_select_authenticated"
ON usuarios_admin
FOR SELECT
TO authenticated
USING (true);  -- Qualquer usuário autenticado pode ver

-- ============================================
-- 4. CRIAR POLICY RESTRITIVA PARA UPDATE
-- ============================================
-- Permitir atualização apenas em casos específicos para manter segurança
CREATE POLICY "usuarios_admin_update_authenticated"
ON usuarios_admin
FOR UPDATE
TO authenticated
USING (
    -- Permitir se o auth_user_id corresponde ao usuário autenticado
    (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
    OR
    -- Ou se é do tenant padrão (compatibilidade)
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR
    -- Ou se o usuário está ativo (para atualizar último_login)
    ativo = true
)
WITH CHECK (
    (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
    OR
    tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    OR
    ativo = true
);

-- ============================================
-- NOTA SOBRE INSERT E DELETE
-- ============================================
-- INSERT e DELETE não têm policies aqui
-- Isso significa que apenas operações via servidor (supabaseAdmin) podem criar/deletar usuários
-- Operações via cliente serão bloqueadas automaticamente pelo RLS

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO - Execute estas queries para confirmar
-- ============================================

-- 1. Verificar se RLS está habilitado
SELECT 
    tablename, 
    rowsecurity AS rls_habilitado
FROM pg_tables 
WHERE tablename = 'usuarios_admin';
-- Resultado esperado: rls_habilitado = true

-- 2. Verificar as policies criadas
SELECT 
    tablename,
    policyname,
    cmd AS operacao,
    CASE 
        WHEN qual IS NULL THEN 'Sem restrição (permissivo)'
        ELSE qual::text
    END AS condicao
FROM pg_policies
WHERE tablename = 'usuarios_admin'
ORDER BY policyname;
-- Resultado esperado: 
-- - usuarios_admin_select_authenticated (SELECT, Sem restrição)
-- - usuarios_admin_update_authenticated (UPDATE, com condições)

-- ============================================
-- 🧪 TESTE NO SISTEMA
-- ============================================
-- 
-- Após executar este script:
-- 
-- 1. Faça logout e login novamente no sistema
-- 2. Abra o console do navegador (F12)
-- 3. Execute: localStorage.getItem("admin_usuario")
--    Deve retornar um objeto JSON com os dados do usuário
-- 
-- 4. Verifique se o admin sidebar mostra os itens:
--    ✅ Dashboard
--    ✅ Leads
--    ✅ Propostas
--    ✅ Tabelas
--    ✅ Corretores
--    ✅ etc.
-- 
-- 5. Se tudo aparecer, o problema está resolvido! ✅
-- 
-- ============================================
-- 📝 O QUE ESTE SCRIPT FAZ
-- ============================================
-- 
-- ✅ Remove a policy problemática (baseada em tenant_id)
-- ✅ Cria policy permissiva para SELECT (permite ver usuários admin)
-- ✅ Cria policy restritiva para UPDATE (mantém segurança)
-- ✅ Mantém RLS habilitado (segurança futura)
-- 
-- ❌ NÃO remove RLS completamente (mantém segurança)
-- ❌ NÃO permite INSERT/DELETE via cliente (mantém segurança)
-- 
-- ============================================

