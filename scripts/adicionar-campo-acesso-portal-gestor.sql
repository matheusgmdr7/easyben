-- ============================================
-- SCRIPT: Adicionar Campo acesso_portal_gestor
-- ============================================
-- Este script adiciona o campo para controlar
-- o acesso dos gestores ao portal do gestor
-- ============================================

DO $$
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' 
        AND column_name = 'acesso_portal_gestor'
    ) THEN
        -- Adicionar coluna
        ALTER TABLE corretores 
        ADD COLUMN acesso_portal_gestor BOOLEAN DEFAULT false;
        
        -- Adicionar comentário
        COMMENT ON COLUMN corretores.acesso_portal_gestor IS 'Indica se o gestor tem acesso autorizado ao portal do gestor';
        
        RAISE NOTICE '✅ Campo acesso_portal_gestor adicionado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Campo acesso_portal_gestor já existe';
    END IF;
END $$;

-- ============================================
-- ✅ Script executado com sucesso!
-- ============================================








