-- ============================================
-- SCRIPT 5: CORRIGIR RLS PARA usuarios_admin
-- ============================================
-- Este script ajusta o RLS da tabela usuarios_admin
-- para permitir acesso baseado em autenticação,
-- não em tenant_id (usuários admin são compartilhados)
-- ============================================
-- ⚠️ ATENÇÃO: Execute após os scripts anteriores
-- ============================================

BEGIN;

-- ============================================
-- 1. REMOVER POLICIES EXISTENTES
-- ============================================
DROP POLICY IF EXISTS "tenant_isolation_usuarios_admin" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_select_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_authenticated" ON usuarios_admin;
DROP POLICY IF EXISTS "usuarios_admin_update_self" ON usuarios_admin;

-- ============================================
-- 2. CRIAR POLICY BASEADA EM AUTENTICAÇÃO
-- ============================================
-- IMPORTANTE: usuarios_admin não deve ter isolamento por tenant_id
-- porque os usuários admin são compartilhados e necessários para autenticação

-- SELECT: Permitir que usuários autenticados vejam usuários admin
-- (necessário para login e verificação de permissões)
-- IMPORTANTE: Permitir acesso amplo porque é necessário para autenticação
-- NOTA: Durante o login, o Supabase Auth já autenticou o usuário,
-- então a query funciona. A policy precisa ser permissiva para permitir
-- que o sistema busque o usuário para validar a senha.
CREATE POLICY "usuarios_admin_select_authenticated"
ON usuarios_admin
FOR SELECT
TO authenticated
USING (true);  -- Qualquer usuário autenticado pode ver (necessário para login)

-- INSERT: Apenas via API routes (que usam supabaseAdmin)
-- Não permitir INSERT direto via cliente
-- (será feito via API routes que usam supabaseAdmin)

-- UPDATE: Permitir atualização para usuários autenticados
-- (necessário para atualizar último_login, etc)
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

-- DELETE: Apenas via API routes (que usam supabaseAdmin)
-- Não permitir DELETE direto via cliente

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar as policies criadas:
-- 
-- SELECT 
--     tablename,
--     policyname,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE tablename = 'usuarios_admin'
-- ORDER BY policyname;
-- ============================================
-- 
-- Resultado esperado:
-- - usuarios_admin_select_authenticated (SELECT, USING: true)
-- - usuarios_admin_update_self (UPDATE, com condições)
-- ============================================

