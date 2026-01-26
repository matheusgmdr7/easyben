-- ============================================
-- SCRIPT 12: CORRIGIR RLS PARA LOGIN DE CORRETORES
-- ============================================
-- Este script ajusta as políticas RLS da tabela corretores
-- para permitir que a busca por email funcione durante o login
-- mesmo quando o tenant_id não está definido no contexto
-- ============================================
-- ⚠️ ATENÇÃO: Execute após verificar com WHITELABEL-11
-- ============================================

BEGIN;

-- ============================================
-- 1. VERIFICAR POLICIES EXISTENTES
-- ============================================
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'corretores';

-- ============================================
-- 2. REMOVER POLICIES ANTIGAS
-- ============================================
DROP POLICY IF EXISTS "tenant_isolation_corretores" ON corretores;

-- ============================================
-- 3. CRIAR POLICY PERMISSIVA PARA SELECT
-- ============================================
-- IMPORTANTE: Permitir SELECT sem restrição de tenant_id
-- para que o login funcione via API route (que usa supabaseAdmin)
-- e também para queries diretas que precisam buscar por email
CREATE POLICY "corretores_select_permissive"
ON corretores
FOR SELECT
TO authenticated
USING (true);  -- Permitir SELECT para qualquer usuário autenticado

-- NOTA: A API route usa supabaseAdmin que bypassa RLS,
-- mas esta policy garante que queries diretas também funcionem
-- quando o usuário está autenticado

-- ============================================
-- 4. CRIAR POLICY PARA INSERT/UPDATE/DELETE
-- ============================================
-- Manter isolamento por tenant para operações de escrita
CREATE POLICY "corretores_write_tenant_isolation"
ON corretores
FOR ALL
TO authenticated
USING (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
)
WITH CHECK (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ============================================
-- 5. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;

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
-- WHERE tablename = 'corretores'
-- ORDER BY policyname;
-- ============================================
-- 
-- RESULTADO ESPERADO:
-- - corretores_select_permissive: SELECT com USING (true)
-- - corretores_write_tenant_isolation: ALL com isolamento por tenant
-- ============================================

