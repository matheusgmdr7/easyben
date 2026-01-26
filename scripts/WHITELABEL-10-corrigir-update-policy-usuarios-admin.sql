-- ============================================
-- SCRIPT 10: CORRIGIR POLICY DE UPDATE PARA usuarios_admin
-- ============================================
-- Este script corrige a policy de UPDATE para não usar tenant_id
-- de forma restritiva, permitindo que usuários autenticados
-- atualizem seus próprios dados ou dados do sistema.
-- ============================================
-- ⚠️ ATENÇÃO: Execute no Supabase SQL Editor
-- ============================================

BEGIN;

-- 1. REMOVER POLICY DE UPDATE EXISTENTE
DROP POLICY IF EXISTS "usuarios_admin_update_authenticated" ON usuarios_admin;

-- 2. CRIAR POLICY DE UPDATE PERMISSIVA
-- IMPORTANTE: A policy de UPDATE deve ser permissiva para permitir
-- que o sistema atualize dados como último_login, etc.
-- Não deve depender de tenant_id de forma restritiva.
CREATE POLICY "usuarios_admin_update_authenticated"
ON usuarios_admin
FOR UPDATE
TO authenticated
USING (
    -- Permitir se o auth_user_id corresponde ao usuário autenticado
    (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
    OR
    -- Ou se o usuário está ativo (para atualizar último_login, etc)
    ativo = true
    -- NOTA: Removemos a verificação de tenant_id porque
    -- usuarios_admin não deve ser isolado por tenant
)
WITH CHECK (
    (auth_user_id IS NOT NULL AND auth_user_id = auth.uid())
    OR
    ativo = true
);

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar a policy criada:
-- 
-- SELECT 
--     policyname,
--     cmd AS operacao,
--     qual AS using_clause,
--     with_check AS with_check_clause
-- FROM pg_policies
-- WHERE tablename = 'usuarios_admin'
--   AND policyname = 'usuarios_admin_update_authenticated';
-- ============================================
-- 
-- Resultado esperado:
-- - usuarios_admin_update_authenticated (UPDATE)
-- - using_clause: Deve conter auth_user_id = auth.uid() OU ativo = true
-- - with_check_clause: Deve conter auth_user_id = auth.uid() OU ativo = true
-- - NÃO deve conter verificação de tenant_id
-- ============================================

