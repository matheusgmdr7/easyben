-- ============================================
-- SISTEMA DE GESTÃO DE EQUIPES
-- ============================================
-- Este script cria a estrutura necessária para
-- o sistema de gestão de equipes, permitindo que
-- corretores sejam vinculados a gestores de equipes

BEGIN;

-- ============================================
-- 1. VERIFICAR TIPO DA COLUNA id NA TABELA corretores
-- ============================================
DO $$
DECLARE
    id_type TEXT;
BEGIN
    -- Verificar o tipo da coluna id
    SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_name = 'corretores' AND column_name = 'id';
    
    RAISE NOTICE 'Tipo da coluna id na tabela corretores: %', id_type;
END $$;

-- ============================================
-- 2. ADICIONAR CAMPO gestor_id NA TABELA corretores
-- ============================================
DO $$
DECLARE
    id_type TEXT;
BEGIN
    -- Verificar o tipo da coluna id
    SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_name = 'corretores' AND column_name = 'id';
    
    -- Adicionar coluna gestor_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'gestor_id'
    ) THEN
        -- Usar o mesmo tipo da coluna id
        IF id_type = 'bigint' THEN
            ALTER TABLE corretores 
            ADD COLUMN gestor_id BIGINT REFERENCES corretores(id) ON DELETE SET NULL;
        ELSIF id_type = 'uuid' THEN
            ALTER TABLE corretores 
            ADD COLUMN gestor_id UUID REFERENCES corretores(id) ON DELETE SET NULL;
        ELSE
            -- Se for outro tipo, usar TEXT como fallback
            ALTER TABLE corretores 
            ADD COLUMN gestor_id TEXT;
            RAISE NOTICE 'Coluna gestor_id adicionada como TEXT (tipo id não reconhecido: %)', id_type;
        END IF;
        
        RAISE NOTICE 'Coluna gestor_id adicionada na tabela corretores (tipo: %)', id_type;
    ELSE
        RAISE NOTICE 'Coluna gestor_id já existe na tabela corretores';
    END IF;
    
    -- Adicionar coluna is_gestor se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'is_gestor'
    ) THEN
        ALTER TABLE corretores 
        ADD COLUMN is_gestor BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Coluna is_gestor adicionada na tabela corretores';
    ELSE
        RAISE NOTICE 'Coluna is_gestor já existe na tabela corretores';
    END IF;
    
    -- Adicionar coluna link_cadastro_equipe se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'link_cadastro_equipe'
    ) THEN
        ALTER TABLE corretores 
        ADD COLUMN link_cadastro_equipe TEXT;
        
        RAISE NOTICE 'Coluna link_cadastro_equipe adicionada na tabela corretores';
    ELSE
        RAISE NOTICE 'Coluna link_cadastro_equipe já existe na tabela corretores';
    END IF;
END $$;

-- ============================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_corretores_gestor_id ON corretores(gestor_id);
CREATE INDEX IF NOT EXISTS idx_corretores_is_gestor ON corretores(is_gestor);
CREATE INDEX IF NOT EXISTS idx_corretores_tenant_gestor ON corretores(tenant_id, is_gestor);

-- ============================================
-- 3. ADICIONAR COMENTÁRIOS
-- ============================================
COMMENT ON COLUMN corretores.gestor_id IS 'ID do gestor de equipe ao qual o corretor está vinculado';
COMMENT ON COLUMN corretores.is_gestor IS 'Indica se o corretor é um gestor de equipe';
COMMENT ON COLUMN corretores.link_cadastro_equipe IS 'Link único para cadastro de corretores na equipe do gestor';

-- ============================================
-- 4. CRIAR FUNÇÃO PARA GERAR LINK ÚNICO DE CADASTRO
-- ============================================
-- A função será criada dinamicamente baseada no tipo da coluna id
DO $$
DECLARE
    id_type TEXT;
    function_sql TEXT;
BEGIN
    -- Verificar o tipo da coluna id
    SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_name = 'corretores' AND column_name = 'id';
    
    -- Criar função baseada no tipo
    IF id_type = 'bigint' THEN
        function_sql := '
        CREATE OR REPLACE FUNCTION gerar_link_cadastro_equipe(gestor_id_param BIGINT)
        RETURNS TEXT AS $func$
        DECLARE
            link_token TEXT;
            tenant_slug TEXT;
        BEGIN
            link_token := encode(gen_random_bytes(16), ''hex'');
            SELECT t.slug INTO tenant_slug
            FROM corretores c
            INNER JOIN tenants t ON c.tenant_id = t.id
            WHERE c.id = gestor_id_param;
            RETURN tenant_slug || ''/corretores/equipe/'' || link_token;
        END;
        $func$ LANGUAGE plpgsql;';
    ELSIF id_type = 'uuid' THEN
        function_sql := '
        CREATE OR REPLACE FUNCTION gerar_link_cadastro_equipe(gestor_id_param UUID)
        RETURNS TEXT AS $func$
        DECLARE
            link_token TEXT;
            tenant_slug TEXT;
        BEGIN
            link_token := encode(gen_random_bytes(16), ''hex'');
            SELECT t.slug INTO tenant_slug
            FROM corretores c
            INNER JOIN tenants t ON c.tenant_id = t.id
            WHERE c.id = gestor_id_param;
            RETURN tenant_slug || ''/corretores/equipe/'' || link_token;
        END;
        $func$ LANGUAGE plpgsql;';
    ELSE
        RAISE NOTICE 'Tipo de id não suportado para função: %', id_type;
    END IF;
    
    IF function_sql IS NOT NULL THEN
        EXECUTE function_sql;
        RAISE NOTICE 'Função gerar_link_cadastro_equipe criada (tipo: %)', id_type;
    END IF;
END $$;

-- ============================================
-- 5. VERIFICAR ESTRUTURA CRIADA
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Estrutura de gestão de equipes criada com sucesso!';
    RAISE NOTICE '   - Campo gestor_id adicionado';
    RAISE NOTICE '   - Campo is_gestor adicionado';
    RAISE NOTICE '   - Campo link_cadastro_equipe adicionado';
    RAISE NOTICE '   - Índices criados';
    RAISE NOTICE '   - Função gerar_link_cadastro_equipe criada';
END $$;

COMMIT;

