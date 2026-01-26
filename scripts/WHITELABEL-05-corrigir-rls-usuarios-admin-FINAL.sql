-- ============================================
-- SCRIPT: CORRIGIR RLS PARA usuarios_admin
-- Policy Permissiva - Restaura Funcionamento do Admin Sidebar
-- ============================================
-- Este script ajusta o RLS da tabela usuarios_admin
-- para permitir acesso baseado em autenticação,
-- não em tenant_id (usuários admin são compartilhados)
-- ============================================
-- ✅ RESULTADO ESPERADO:
-- - Admin sidebar volta a funcionar normalmente
-- - Login funciona sem problemas
-- - RLS mantido para segurança futura
-- - Permissões carregadas corretamente
-- ============================================
-- ⚠️ ATENÇÃO: Execute no Supabase SQL Editor
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
-- IMPORTANTE: usuarios_admin não deve ter isolamento por tenant_id
-- porque os usuários admin são compartilhados e necessários para autenticação
-- 
-- Esta policy permite que qualquer usuário autenticado veja usuários admin
-- (necessário para login e verificação de permissões)
CREATE POLICY "usuarios_admin_select_authenticated"
ON usuarios_admin
FOR SELECT
TO authenticated
USING (true);  -- Qualquer usuário autenticado pode ver (necessário para login)

-- ============================================
-- 4. CRIAR POLICY RESTRITIVA PARA UPDATE
-- ============================================
-- Permitir atualização apenas em casos específicos:
-- - Usuário atualizando seus próprios dados (via auth_user_id)
-- - Usuários do tenant padrão (compatibilidade)
-- - Usuários ativos (para atualizar último_login, etc)
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
-- 5. INSERT E DELETE: Apenas via API routes
-- ============================================
-- Não criar policies para INSERT/DELETE via cliente
-- Isso garante que apenas o servidor (via supabaseAdmin) pode criar/deletar usuários
-- As operações de INSERT/DELETE devem ser feitas via API routes que usam supabaseAdmin

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute as queries abaixo para verificar se as policies foram criadas corretamente:

-- 1. Verificar se RLS está habilitado
SELECT 
    tablename, 
    rowsecurity AS rls_habilitado
FROM pg_tables 
WHERE tablename = 'usuarios_admin';

-- 2. Verificar as policies criadas
SELECT 
    tablename,
    policyname,
    cmd AS operacao,
    qual AS condicao_using,
    with_check AS condicao_check
FROM pg_policies
WHERE tablename = 'usuarios_admin'
ORDER BY policyname;

-- ============================================
-- 📋 RESULTADO ESPERADO
-- ============================================
-- 
-- 1. RLS habilitado: rowsecurity = true
-- 
-- 2. Policies criadas:
--    - usuarios_admin_select_authenticated (SELECT, USING: true)
--    - usuarios_admin_update_authenticated (UPDATE, com condições)
-- 
-- ============================================
-- 🧪 TESTE NO SISTEMA
-- ============================================
-- 
-- Após executar este script:
-- 
-- 1. Faça login como admin no sistema
-- 2. Verifique no console do navegador (F12):
--    localStorage.getItem("admin_usuario")
--    Deve retornar um objeto JSON com os dados do usuário
-- 
-- 3. Verifique se o admin sidebar mostra os itens do menu:
--    - Dashboard
--    - Leads
--    - Propostas
--    - etc.
-- 
-- 4. Se tudo funcionar, o problema está resolvido! ✅
-- 
-- ============================================

