-- Adiciona colunas completas à tabela vidas_importadas para suportar dados básicos e contato
-- Execute no Supabase SQL Editor

DO $$
BEGIN
  -- ativo (se ainda não existe)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'ativo') THEN
    ALTER TABLE vidas_importadas ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true;
  END IF;
  -- sexo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'sexo') THEN
    ALTER TABLE vidas_importadas ADD COLUMN sexo VARCHAR(20);
  END IF;
  -- estado_civil
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'estado_civil') THEN
    ALTER TABLE vidas_importadas ADD COLUMN estado_civil VARCHAR(50);
  END IF;
  -- nome_pai
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'nome_pai') THEN
    ALTER TABLE vidas_importadas ADD COLUMN nome_pai VARCHAR(255);
  END IF;
  -- identidade (RG)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'identidade') THEN
    ALTER TABLE vidas_importadas ADD COLUMN identidade VARCHAR(20);
  END IF;
  -- cns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'cns') THEN
    ALTER TABLE vidas_importadas ADD COLUMN cns VARCHAR(20);
  END IF;
  -- observacoes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'observacoes') THEN
    ALTER TABLE vidas_importadas ADD COLUMN observacoes TEXT;
  END IF;
  -- Endereço
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'cep') THEN
    ALTER TABLE vidas_importadas ADD COLUMN cep VARCHAR(9);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'cidade') THEN
    ALTER TABLE vidas_importadas ADD COLUMN cidade VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'estado') THEN
    ALTER TABLE vidas_importadas ADD COLUMN estado VARCHAR(2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'bairro') THEN
    ALTER TABLE vidas_importadas ADD COLUMN bairro VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'logradouro') THEN
    ALTER TABLE vidas_importadas ADD COLUMN logradouro VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'numero') THEN
    ALTER TABLE vidas_importadas ADD COLUMN numero VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'complemento') THEN
    ALTER TABLE vidas_importadas ADD COLUMN complemento VARCHAR(100);
  END IF;
  -- Telefones: JSONB array [{"tipo":"celular","numero":"11999..."},{"tipo":"celular","numero":"..."},{"tipo":"fixo","numero":"..."}]
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'telefones') THEN
    ALTER TABLE vidas_importadas ADD COLUMN telefones JSONB DEFAULT '[]'::jsonb;
  END IF;
  -- Emails: JSONB array ["email1@...", "email2@..."]
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vidas_importadas' AND column_name = 'emails') THEN
    ALTER TABLE vidas_importadas ADD COLUMN emails JSONB DEFAULT '[]'::jsonb;
  END IF;
  RAISE NOTICE 'Colunas adicionadas/verificadas em vidas_importadas';
END $$;
