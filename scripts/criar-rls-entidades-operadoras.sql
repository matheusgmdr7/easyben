-- ============================================
-- SCRIPT: CRIAR RLS POLICIES PARA ENTIDADES E OPERADORAS
-- ============================================
-- Este script cria as políticas RLS para garantir
-- isolamento completo de dados entre tenants
-- ============================================

BEGIN;

-- ============================================
-- 1. HABILITAR RLS NA TABELA ENTIDADES
-- ============================================
ALTER TABLE entidades ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "tenant_isolation_entidades" ON entidades;

-- Criar política de isolamento por tenant
CREATE POLICY "tenant_isolation_entidades"
ON entidades
FOR ALL
TO authenticated
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());

-- ============================================
-- 2. HABILITAR RLS NA TABELA OPERADORAS
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operadoras') THEN
        ALTER TABLE operadoras ENABLE ROW LEVEL SECURITY;
        
        -- Remover políticas antigas se existirem
        DROP POLICY IF EXISTS "tenant_isolation_operadoras" ON operadoras;
        
        -- Criar política de isolamento por tenant
        CREATE POLICY "tenant_isolation_operadoras"
        ON operadoras
        FOR ALL
        TO authenticated
        USING (tenant_id = get_current_tenant_id())
        WITH CHECK (tenant_id = get_current_tenant_id());
    END IF;
END $$;

-- ============================================
-- 3. COMENTÁRIOS
-- ============================================
COMMENT ON POLICY "tenant_isolation_entidades" ON entidades IS 'Política RLS para isolar entidades por tenant';
COMMENT ON POLICY "tenant_isolation_operadoras" ON operadoras IS 'Política RLS para isolar operadoras por tenant';

COMMIT;

-- ============================================
-- ✅ Script executado com sucesso!
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Políticas RLS criadas com sucesso!';
  RAISE NOTICE '📊 Tabelas configuradas: entidades, operadoras';
  RAISE NOTICE '🔒 Isolamento por tenant garantido';
END $$;







