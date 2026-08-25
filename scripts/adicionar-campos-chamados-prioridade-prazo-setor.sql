-- Campos de prioridade, prazo e setor responsável nos chamados
-- Execute no Supabase SQL Editor (idempotente)

-- 1) Colunas em chamados_administradora
ALTER TABLE chamados_administradora
  ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS prazo TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS setor_responsavel VARCHAR(40) NOT NULL DEFAULT 'implantacao';

-- Garantir CHECK de prioridade (remove e recria se já existir)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'chamados_administradora'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%prioridade%'
  ) LOOP
    EXECUTE format('ALTER TABLE chamados_administradora DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE chamados_administradora
  ADD CONSTRAINT chamados_administradora_prioridade_check
  CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente'));

-- Garantir CHECK de setor_responsavel
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'chamados_administradora'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%setor_responsavel%'
  ) LOOP
    EXECUTE format('ALTER TABLE chamados_administradora DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE chamados_administradora
  ADD CONSTRAINT chamados_administradora_setor_responsavel_check
  CHECK (setor_responsavel IN ('implantacao', 'cadastro_boletos'));

CREATE INDEX IF NOT EXISTS idx_chamados_administradora_prioridade
  ON chamados_administradora(prioridade);

CREATE INDEX IF NOT EXISTS idx_chamados_administradora_prazo
  ON chamados_administradora(prazo);

CREATE INDEX IF NOT EXISTS idx_chamados_administradora_setor
  ON chamados_administradora(setor_responsavel);

COMMENT ON COLUMN chamados_administradora.prioridade IS 'baixa | normal | alta | urgente';
COMMENT ON COLUMN chamados_administradora.prazo IS 'Data/hora limite para resolução do chamado';
COMMENT ON COLUMN chamados_administradora.setor_responsavel IS 'implantacao | cadastro_boletos';

-- 2) Expandir tipos do histórico (prioridade, prazo, setor)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'chamados_historico'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%tipo%'
  ) LOOP
    EXECUTE format('ALTER TABLE chamados_historico DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE chamados_historico
  ADD CONSTRAINT chamados_historico_tipo_check
  CHECK (tipo IN (
    'abertura',
    'status',
    'observacao',
    'fechamento',
    'prioridade',
    'prazo',
    'setor'
  ));
