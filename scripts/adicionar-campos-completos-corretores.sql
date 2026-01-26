-- ============================================
-- SCRIPT: Adicionar Campos Completos na Tabela corretores
-- ============================================
-- Este script adiciona todos os campos necessários:
-- - razao_social (VARCHAR)
-- - nome_fantasia (VARCHAR)
-- - acesso_portal_gestor (BOOLEAN)
-- ============================================

DO $$
BEGIN
    -- Adicionar coluna razao_social
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'razao_social'
    ) THEN
        ALTER TABLE corretores ADD COLUMN razao_social VARCHAR(255);
        RAISE NOTICE '✅ Coluna razao_social adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna razao_social já existe na tabela corretores';
    END IF;

    -- Adicionar coluna nome_fantasia
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'nome_fantasia'
    ) THEN
        ALTER TABLE corretores ADD COLUMN nome_fantasia VARCHAR(255);
        RAISE NOTICE '✅ Coluna nome_fantasia adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna nome_fantasia já existe na tabela corretores';
    END IF;

    -- Adicionar coluna acesso_portal_gestor
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corretores' AND column_name = 'acesso_portal_gestor'
    ) THEN
        ALTER TABLE corretores ADD COLUMN acesso_portal_gestor BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Coluna acesso_portal_gestor adicionada na tabela corretores';
    ELSE
        RAISE NOTICE '⚠️ Coluna acesso_portal_gestor já existe na tabela corretores';
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN corretores.razao_social IS 'Razão social da empresa (para gestores que são empresas)';
COMMENT ON COLUMN corretores.nome_fantasia IS 'Nome fantasia da empresa (para gestores que são empresas)';
COMMENT ON COLUMN corretores.acesso_portal_gestor IS 'Indica se o gestor tem acesso autorizado ao portal do gestor';

-- Verificar estrutura criada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'corretores' 
AND column_name IN ('razao_social', 'nome_fantasia', 'acesso_portal_gestor')
ORDER BY column_name;

-- ============================================
-- ✅ Script executado com sucesso!
-- ============================================







