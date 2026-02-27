-- Tabela para histórico de edições de vidas importadas
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS vidas_importadas_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vida_id UUID NOT NULL REFERENCES vidas_importadas(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    -- Alterações: {"campo": {"antes": "valor_antigo", "depois": "valor_novo"}, ...}
    alteracoes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vidas_importadas_historico_vida ON vidas_importadas_historico(vida_id);
CREATE INDEX IF NOT EXISTS idx_vidas_importadas_historico_created ON vidas_importadas_historico(created_at DESC);

COMMENT ON TABLE vidas_importadas_historico IS 'Histórico de alterações em vidas importadas para auditoria';
