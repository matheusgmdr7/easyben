-- Adicionar campos empresariais (Razão Social e Nome Fantasia) na tabela corretores
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
END $$;

-- Comentários para documentação
COMMENT ON COLUMN corretores.razao_social IS 'Razão social da empresa (para gestores que são empresas)';
COMMENT ON COLUMN corretores.nome_fantasia IS 'Nome fantasia da empresa (para gestores que são empresas)';

-- Verificar estrutura criada
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'corretores' 
AND column_name IN ('razao_social', 'nome_fantasia')
ORDER BY column_name;







