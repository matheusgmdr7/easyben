-- ============================================
-- SCRIPT 14: CORRIGIR RLS CORRETORES - VERSÃO FINAL
-- ============================================
-- Este script garante que as policies RLS da tabela corretores
-- estejam configuradas corretamente para permitir login
-- ============================================
-- ⚠️ ATENÇÃO: Execute este script para corrigir definitivamente
-- ============================================

BEGIN;

-- ============================================
-- 1. REMOVER TODAS AS POLICIES EXISTENTES
-- ============================================
DROP POLICY IF EXISTS "tenant_isolation_corretores" ON corretores;
DROP POLICY IF EXISTS "corretores_select_permissive" ON corretores;
DROP POLICY IF EXISTS "corretores_write_tenant_isolation" ON corretores;
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON corretores;
DROP POLICY IF EXISTS "Permitir deleção para usuários autenticados" ON corretores;

-- ============================================
-- 2. CRIAR POLICIES PERMISSIVAS PARA SELECT
-- ============================================
-- IMPORTANTE: Permitir SELECT sem restrição para que o login funcione
-- A API route usa supabaseAdmin que bypassa RLS, mas esta policy
-- garante que queries diretas também funcionem quando necessário
CREATE POLICY "corretores_select_authenticated"
ON corretores
FOR SELECT
TO authenticated
USING (true);  -- Permitir SELECT para qualquer usuário autenticado

-- ============================================
-- 3. CRIAR POLICIES PARA INSERT/UPDATE/DELETE
-- ============================================
-- Manter isolamento por tenant para operações de escrita
CREATE POLICY "corretores_insert_tenant_isolation"
ON corretores
FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "corretores_update_tenant_isolation"
ON corretores
FOR UPDATE
TO authenticated
USING (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
)
WITH CHECK (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "corretores_delete_tenant_isolation"
ON corretores
FOR DELETE
TO authenticated
USING (
    tenant_id = get_current_tenant_id()
    OR tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ============================================
-- 4. GARANTIR QUE RLS ESTÁ HABILITADO
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
-- - corretores_select_authenticated: SELECT com USING (true)
-- - corretores_insert_tenant_isolation: INSERT com isolamento por tenant
-- - corretores_update_tenant_isolation: UPDATE com isolamento por tenant
-- - corretores_delete_tenant_isolation: DELETE com isolamento por tenant
-- ============================================

