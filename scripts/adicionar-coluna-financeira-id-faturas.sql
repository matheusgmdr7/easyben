-- =============================================================================
-- Metadados internos em `faturas` (não vão para o boleto/PDF do Asaas)
-- =============================================================================
-- `financeira_id` e `gateway_nome` existem apenas na nossa base, para filtros
-- (dashboard, relatórios, sync). A cobrança criada no Asaas usa só descrição
-- comercial (titular, produto, taxa etc.) — ver `lib/gerar-boleto-administradora.ts`.
--
-- Pré-requisito: colunas de boleto/gateway em `faturas`, ex.:
--   scripts/adicionar-colunas-boleto-faturas.sql
-- Execute no Supabase SQL Editor.
-- =============================================================================

-- 1) Coluna e índice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'financeira_id'
  ) THEN
    ALTER TABLE faturas
      ADD COLUMN financeira_id UUID REFERENCES administradora_financeiras(id) ON DELETE SET NULL;
    RAISE NOTICE 'Coluna faturas.financeira_id criada';
  ELSE
    RAISE NOTICE 'Coluna faturas.financeira_id já existe';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_faturas_financeira_id ON faturas(financeira_id)
  WHERE financeira_id IS NOT NULL;

COMMENT ON COLUMN faturas.financeira_id IS 'Uso interno: vínculo com administradora_financeiras (conta API). Não é enviado ao Asaas na descrição do boleto.';
COMMENT ON COLUMN faturas.gateway_nome IS 'Uso interno: rótulo truncado (50) para filtro multi-financeira. Não substitui a descrição comercial da cobrança no Asaas.';

-- =============================================================================
-- 2) Backfill A — já tem gateway_nome preenchido (igual ao truncamento da app)
-- =============================================================================
-- Colisão: duas financeiras com os mesmos 50 primeiros caracteres em
-- "Asaas - {nome}" exige correção manual.
UPDATE faturas f
SET financeira_id = af.id
FROM administradora_financeiras af
WHERE f.financeira_id IS NULL
  AND f.administradora_id = af.administradora_id
  AND f.gateway_nome IS NOT NULL
  AND btrim(f.gateway_nome) <> ''
  AND left(btrim(f.gateway_nome), 50) = left(concat('Asaas - ', btrim(coalesce(af.nome, ''))), 50);

-- =============================================================================
-- 3) Backfill B — cobrança Asaas antiga sem gateway_nome (só uma financeira Asaas ativa na adm.)
-- =============================================================================
WITH financeira_unica_asaas AS (
  SELECT
    administradora_id,
    max(id) AS financeira_id,
    max(btrim(nome)) AS nome
  FROM administradora_financeiras
  WHERE ativo = true
    AND lower(btrim(coalesce(instituicao_financeira, ''))) = 'asaas'
  GROUP BY administradora_id
  HAVING count(*)::int = 1
)
UPDATE faturas f
SET
  financeira_id = u.financeira_id,
  gateway_nome = left(concat('Asaas - ', btrim(coalesce(u.nome, ''))), 50)
FROM financeira_unica_asaas u
WHERE f.administradora_id = u.administradora_id
  AND f.financeira_id IS NULL
  AND (f.gateway_nome IS NULL OR btrim(f.gateway_nome) = '')
  AND (
    (f.asaas_charge_id IS NOT NULL AND btrim(f.asaas_charge_id::text) <> '')
    OR (f.gateway_id IS NOT NULL AND btrim(f.gateway_id::text) <> '')
  );
