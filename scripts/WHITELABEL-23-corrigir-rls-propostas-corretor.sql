BEGIN;

-- ============================================
-- CORRIGIR RLS PARA ENVIO DE PROPOSTAS POR CORRETORES
-- ============================================
-- Este script permite que corretores possam criar e gerenciar propostas
-- sem bloqueios de RLS, similar à correção feita para login e admin sidebar

-- ============================================
-- 1. TABELA: propostas
-- ============================================

-- Remover políticas existentes que podem estar bloqueando
DROP POLICY IF EXISTS "tenant_isolation_propostas" ON propostas;
DROP POLICY IF EXISTS "corretores_podem_criar_propostas" ON propostas;
DROP POLICY IF EXISTS "corretores_podem_ver_propostas" ON propostas;
DROP POLICY IF EXISTS "corretores_podem_atualizar_propostas" ON propostas;

-- SELECT: Permitir que corretores vejam suas próprias propostas
CREATE POLICY "corretores_select_propostas"
ON propostas
FOR SELECT
TO authenticated
USING (
    -- Permitir se o corretor_id corresponde ao corretor logado
    corretor_id IN (
        SELECT id FROM corretores 
        WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
);

-- INSERT: Permitir que corretores criem propostas
CREATE POLICY "corretores_insert_propostas"
ON propostas
FOR INSERT
TO authenticated
WITH CHECK (
    -- Permitir inserção se o corretor_id corresponde ao corretor logado
    corretor_id IN (
        SELECT id FROM corretores 
        WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
);

-- UPDATE: Permitir que corretores atualizem suas próprias propostas
CREATE POLICY "corretores_update_propostas"
ON propostas
FOR UPDATE
TO authenticated
USING (
    corretor_id IN (
        SELECT id FROM corretores 
        WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
)
WITH CHECK (
    corretor_id IN (
        SELECT id FROM corretores 
        WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
);

-- ============================================
-- 2. TABELA: documentos_propostas
-- ============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "tenant_isolation_documentos_propostas" ON documentos_propostas;
DROP POLICY IF EXISTS "corretores_podem_criar_documentos" ON documentos_propostas;
DROP POLICY IF EXISTS "corretores_podem_ver_documentos" ON documentos_propostas;

-- SELECT: Permitir que corretores vejam documentos de suas propostas
CREATE POLICY "corretores_select_documentos_propostas"
ON documentos_propostas
FOR SELECT
TO authenticated
USING (
    proposta_id IN (
        SELECT id FROM propostas 
        WHERE corretor_id IN (
            SELECT id FROM corretores 
            WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
            OR tenant_id IS NULL
            OR tenant_id = get_current_tenant_id()
        )
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
);

-- INSERT: Permitir que corretores criem documentos para suas propostas
CREATE POLICY "corretores_insert_documentos_propostas"
ON documentos_propostas
FOR INSERT
TO authenticated
WITH CHECK (
    proposta_id IN (
        SELECT id FROM propostas 
        WHERE corretor_id IN (
            SELECT id FROM corretores 
            WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
            OR tenant_id IS NULL
            OR tenant_id = get_current_tenant_id()
        )
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
);

-- UPDATE: Permitir que corretores atualizem documentos de suas propostas
CREATE POLICY "corretores_update_documentos_propostas"
ON documentos_propostas
FOR UPDATE
TO authenticated
USING (
    proposta_id IN (
        SELECT id FROM propostas 
        WHERE corretor_id IN (
            SELECT id FROM corretores 
            WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
            OR tenant_id IS NULL
            OR tenant_id = get_current_tenant_id()
        )
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
)
WITH CHECK (
    proposta_id IN (
        SELECT id FROM propostas 
        WHERE corretor_id IN (
            SELECT id FROM corretores 
            WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
            OR tenant_id IS NULL
            OR tenant_id = get_current_tenant_id()
        )
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
);

-- ============================================
-- 3. TABELA: propostas_corretores (se existir)
-- ============================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "tenant_isolation_propostas_corretores" ON propostas_corretores;
DROP POLICY IF EXISTS "corretores_podem_criar_propostas_corretores" ON propostas_corretores;
DROP POLICY IF EXISTS "corretores_podem_ver_propostas_corretores" ON propostas_corretores;

-- SELECT: Permitir que corretores vejam suas propostas
CREATE POLICY "corretores_select_propostas_corretores"
ON propostas_corretores
FOR SELECT
TO authenticated
USING (
    corretor_id IN (
        SELECT id FROM corretores 
        WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
);

-- INSERT: Permitir que corretores criem propostas
CREATE POLICY "corretores_insert_propostas_corretores"
ON propostas_corretores
FOR INSERT
TO authenticated
WITH CHECK (
    corretor_id IN (
        SELECT id FROM corretores 
        WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
);

-- UPDATE: Permitir que corretores atualizem suas propostas
CREATE POLICY "corretores_update_propostas_corretores"
ON propostas_corretores
FOR UPDATE
TO authenticated
USING (
    corretor_id IN (
        SELECT id FROM corretores 
        WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
)
WITH CHECK (
    corretor_id IN (
        SELECT id FROM corretores 
        WHERE id = (SELECT id FROM corretores WHERE email = auth.jwt() ->> 'email' LIMIT 1)
        OR tenant_id IS NULL
        OR tenant_id = get_current_tenant_id()
    )
    OR tenant_id IS NULL
    OR tenant_id = get_current_tenant_id()
);

-- ============================================
-- 4. VERIFICAR ESTRUTURA
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS corrigidas para envio de propostas por corretores!';
    RAISE NOTICE '   - Tabela propostas: SELECT, INSERT, UPDATE permitidos';
    RAISE NOTICE '   - Tabela documentos_propostas: SELECT, INSERT, UPDATE permitidos';
    RAISE NOTICE '   - Tabela propostas_corretores: SELECT, INSERT, UPDATE permitidos';
END $$;

COMMIT;

