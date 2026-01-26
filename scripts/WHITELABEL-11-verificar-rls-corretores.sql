-- ============================================
-- SCRIPT 11: VERIFICAR RLS DA TABELA CORRETORES
-- ============================================
-- Este script verifica as políticas RLS da tabela corretores
-- e identifica possíveis problemas que podem estar bloqueando o login
-- ============================================

BEGIN;

-- ============================================
-- 1. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE tablename = 'corretores';

-- ============================================
-- 2. LISTAR TODAS AS POLICIES DA TABELA CORRETORES
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname as "Nome da Policy",
    permissive as "Permissiva",
    roles as "Roles",
    cmd as "Comando",
    qual as "USING (condição)",
    with_check as "WITH CHECK (condição)"
FROM pg_policies
WHERE tablename = 'corretores'
ORDER BY policyname;

-- ============================================
-- 3. VERIFICAR FUNÇÃO get_current_tenant_id()
-- ============================================
SELECT 
    proname as "Nome da Função",
    prosrc as "Código da Função"
FROM pg_proc
WHERE proname = 'get_current_tenant_id';

-- ============================================
-- 4. TESTAR A FUNÇÃO get_current_tenant_id()
-- ============================================
-- Esta query deve retornar um UUID ou NULL
SELECT get_current_tenant_id() as "Tenant ID Atual";

-- ============================================
-- 5. VERIFICAR CORRETORES E SEUS TENANT_IDS
-- ============================================
SELECT 
    id,
    nome,
    email,
    status,
    tenant_id,
    created_at
FROM corretores
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 6. VERIFICAR SE HÁ CORRETORES COM TENANT_ID NULL
-- ============================================
SELECT 
    COUNT(*) as "Total de Corretores",
    COUNT(tenant_id) as "Com Tenant ID",
    COUNT(*) - COUNT(tenant_id) as "Sem Tenant ID"
FROM corretores;

-- ============================================
-- 7. VERIFICAR TENANT PADRÃO
-- ============================================
SELECT 
    id,
    nome,
    slug,
    status
FROM tenants
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

COMMIT;

-- ============================================
-- ✅ RESULTADO ESPERADO
-- ============================================
-- Este script deve mostrar:
-- 1. Se RLS está habilitado na tabela corretores
-- 2. Todas as policies existentes
-- 3. A função get_current_tenant_id() e seu código
-- 4. O tenant_id atual (pode ser NULL se não estiver definido)
-- 5. Alguns corretores de exemplo com seus tenant_ids
-- 6. Estatísticas sobre corretores com/sem tenant_id
-- 7. O tenant padrão (deve existir)
-- ============================================

