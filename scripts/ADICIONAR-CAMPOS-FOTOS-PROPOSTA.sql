-- scripts/ADICIONAR-CAMPOS-FOTOS-PROPOSTA.sql
-- Script para adicionar campos de fotos (rosto e corpo inteiro) na tabela propostas

BEGIN;

-- 1. Adicionar coluna foto_rosto
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'propostas' 
        AND column_name = 'foto_rosto'
    ) THEN
        ALTER TABLE propostas
        ADD COLUMN foto_rosto TEXT;
        RAISE NOTICE '✅ Coluna foto_rosto adicionada à tabela propostas';
    ELSE
        RAISE NOTICE '☑️ Coluna foto_rosto já existe na tabela propostas';
    END IF;
END $$;

-- 2. Adicionar coluna foto_corpo_inteiro
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'propostas' 
        AND column_name = 'foto_corpo_inteiro'
    ) THEN
        ALTER TABLE propostas
        ADD COLUMN foto_corpo_inteiro TEXT;
        RAISE NOTICE '✅ Coluna foto_corpo_inteiro adicionada à tabela propostas';
    ELSE
        RAISE NOTICE '☑️ Coluna foto_corpo_inteiro já existe na tabela propostas';
    END IF;
END $$;

COMMIT;

-- ============================================
-- 🎯 RESULTADO ESPERADO:
-- - Campo foto_rosto adicionado (TEXT para armazenar URL)
-- - Campo foto_corpo_inteiro adicionado (TEXT para armazenar URL)
-- ============================================

-- scripts/ADICIONAR-CAMPOS-FOTOS-PROPOSTA.sql
-- Script para adicionar campos de fotos (rosto e corpo inteiro) na tabela propostas

BEGIN;

-- 1. Adicionar coluna foto_rosto
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'propostas' 
        AND column_name = 'foto_rosto'
    ) THEN
        ALTER TABLE propostas
        ADD COLUMN foto_rosto TEXT;
        RAISE NOTICE '✅ Coluna foto_rosto adicionada à tabela propostas';
    ELSE
        RAISE NOTICE '☑️ Coluna foto_rosto já existe na tabela propostas';
    END IF;
END $$;

-- 2. Adicionar coluna foto_corpo_inteiro
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'propostas' 
        AND column_name = 'foto_corpo_inteiro'
    ) THEN
        ALTER TABLE propostas
        ADD COLUMN foto_corpo_inteiro TEXT;
        RAISE NOTICE '✅ Coluna foto_corpo_inteiro adicionada à tabela propostas';
    ELSE
        RAISE NOTICE '☑️ Coluna foto_corpo_inteiro já existe na tabela propostas';
    END IF;
END $$;

COMMIT;

-- ============================================
-- 🎯 RESULTADO ESPERADO:
-- - Campo foto_rosto adicionado (TEXT para armazenar URL)
-- - Campo foto_corpo_inteiro adicionado (TEXT para armazenar URL)
-- ============================================

