-- ============================================
-- SCRIPT 2: ADICIONAR tenant_id EM TODAS AS TABELAS
-- ============================================
-- Este script adiciona a coluna tenant_id em todas as tabelas principais
-- e migra os dados existentes para o tenant padrão
-- ============================================
-- ⚠️ ATENÇÃO: Execute o script 01 primeiro!
-- ⚠️ ATENÇÃO: Faça backup do banco antes de executar!
-- ============================================

BEGIN;

-- ID do tenant padrão (fixo)
DO $$
DECLARE
    tenant_padrao_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    -- ============================================
    -- 1. PROPOSTAS
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em propostas...';
    
    ALTER TABLE propostas 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    
    UPDATE propostas 
    SET tenant_id = tenant_padrao_id 
    WHERE tenant_id IS NULL;
    
    -- Tornar NOT NULL apenas se não houver NULLs
    IF NOT EXISTS (SELECT 1 FROM propostas WHERE tenant_id IS NULL) THEN
        ALTER TABLE propostas ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_propostas_tenant_id ON propostas(tenant_id);
    
    -- ============================================
    -- 2. CORRETORES
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em corretores...';
    
    ALTER TABLE corretores 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    
    UPDATE corretores 
    SET tenant_id = tenant_padrao_id 
    WHERE tenant_id IS NULL;
    
    IF NOT EXISTS (SELECT 1 FROM corretores WHERE tenant_id IS NULL) THEN
        ALTER TABLE corretores ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_corretores_tenant_id ON corretores(tenant_id);
    
    -- ============================================
    -- 3. PRODUTOS_CORRETORES
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em produtos_corretores...';
    
    ALTER TABLE produtos_corretores 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    
    UPDATE produtos_corretores 
    SET tenant_id = tenant_padrao_id 
    WHERE tenant_id IS NULL;
    
    IF NOT EXISTS (SELECT 1 FROM produtos_corretores WHERE tenant_id IS NULL) THEN
        ALTER TABLE produtos_corretores ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_produtos_corretores_tenant_id ON produtos_corretores(tenant_id);
    
    -- ============================================
    -- 4. TABELAS_PRECOS
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em tabelas_precos...';
    
    ALTER TABLE tabelas_precos 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    
    UPDATE tabelas_precos 
    SET tenant_id = tenant_padrao_id 
    WHERE tenant_id IS NULL;
    
    IF NOT EXISTS (SELECT 1 FROM tabelas_precos WHERE tenant_id IS NULL) THEN
        ALTER TABLE tabelas_precos ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_tabelas_precos_tenant_id ON tabelas_precos(tenant_id);
    
    -- ============================================
    -- 5. ADMINISTRADORAS
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em administradoras...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras') THEN
        ALTER TABLE administradoras 
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        
        UPDATE administradoras 
        SET tenant_id = tenant_padrao_id 
        WHERE tenant_id IS NULL;
        
        IF NOT EXISTS (SELECT 1 FROM administradoras WHERE tenant_id IS NULL) THEN
            ALTER TABLE administradoras ALTER COLUMN tenant_id SET NOT NULL;
        END IF;
        
        CREATE INDEX IF NOT EXISTS idx_administradoras_tenant_id ON administradoras(tenant_id);
    END IF;
    
    -- ============================================
    -- 6. CLIENTES_ADMINISTRADORAS
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em clientes_administradoras...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras') THEN
        ALTER TABLE clientes_administradoras 
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        
        UPDATE clientes_administradoras 
        SET tenant_id = tenant_padrao_id 
        WHERE tenant_id IS NULL;
        
        IF NOT EXISTS (SELECT 1 FROM clientes_administradoras WHERE tenant_id IS NULL) THEN
            ALTER TABLE clientes_administradoras ALTER COLUMN tenant_id SET NOT NULL;
        END IF;
        
        CREATE INDEX IF NOT EXISTS idx_clientes_administradoras_tenant_id ON clientes_administradoras(tenant_id);
    END IF;
    
    -- ============================================
    -- 7. FATURAS
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em faturas...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faturas') THEN
        ALTER TABLE faturas 
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        
        UPDATE faturas 
        SET tenant_id = tenant_padrao_id 
        WHERE tenant_id IS NULL;
        
        IF NOT EXISTS (SELECT 1 FROM faturas WHERE tenant_id IS NULL) THEN
            ALTER TABLE faturas ALTER COLUMN tenant_id SET NOT NULL;
        END IF;
        
        CREATE INDEX IF NOT EXISTS idx_faturas_tenant_id ON faturas(tenant_id);
    END IF;
    
    -- ============================================
    -- 8. COMISSOES
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em comissoes...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comissoes') THEN
        ALTER TABLE comissoes 
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        
        UPDATE comissoes 
        SET tenant_id = tenant_padrao_id 
        WHERE tenant_id IS NULL;
        
        IF NOT EXISTS (SELECT 1 FROM comissoes WHERE tenant_id IS NULL) THEN
            ALTER TABLE comissoes ALTER COLUMN tenant_id SET NOT NULL;
        END IF;
        
        CREATE INDEX IF NOT EXISTS idx_comissoes_tenant_id ON comissoes(tenant_id);
    END IF;
    
    -- ============================================
    -- 9. USUARIOS_ADMIN
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em usuarios_admin...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios_admin') THEN
        ALTER TABLE usuarios_admin 
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        
        UPDATE usuarios_admin 
        SET tenant_id = tenant_padrao_id 
        WHERE tenant_id IS NULL;
        
        IF NOT EXISTS (SELECT 1 FROM usuarios_admin WHERE tenant_id IS NULL) THEN
            ALTER TABLE usuarios_admin ALTER COLUMN tenant_id SET NOT NULL;
        END IF;
        
        CREATE INDEX IF NOT EXISTS idx_usuarios_admin_tenant_id ON usuarios_admin(tenant_id);
    END IF;
    
    -- ============================================
    -- 10. LEADS
    -- ============================================
    RAISE NOTICE 'Adicionando tenant_id em leads...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        ALTER TABLE leads 
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        
        UPDATE leads 
        SET tenant_id = tenant_padrao_id 
        WHERE tenant_id IS NULL;
        
        IF NOT EXISTS (SELECT 1 FROM leads WHERE tenant_id IS NULL) THEN
            ALTER TABLE leads ALTER COLUMN tenant_id SET NOT NULL;
        END IF;
        
        CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
    END IF;
    
    -- ============================================
    -- 11. TABELAS RELACIONADAS
    -- ============================================
    
    -- Tabelas que podem ter relacionamento indireto (via propostas, etc)
    -- Serão atualizadas através de triggers ou queries específicas
    
    RAISE NOTICE '✅ Migração de tenant_id concluída!';
    
END $$;

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar se todas as tabelas têm tenant_id:
-- 
-- SELECT 
--     table_name,
--     column_name,
--     data_type,
--     is_nullable
-- FROM information_schema.columns
-- WHERE column_name = 'tenant_id'
-- ORDER BY table_name;
-- ============================================

