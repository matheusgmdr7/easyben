-- Tabela para controlar fluxo de cancelamento de beneficiarios
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cancelamentos_beneficiarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
    grupo_origem_id UUID REFERENCES grupos_beneficiarios(id) ON DELETE SET NULL,
    grupo_destino_reativacao_id UUID REFERENCES grupos_beneficiarios(id) ON DELETE SET NULL,
    vida_id UUID NOT NULL REFERENCES vidas_importadas(id) ON DELETE CASCADE,
    tipo_registro VARCHAR(20) NOT NULL CHECK (tipo_registro IN ('titular', 'dependente')),
    status_fluxo VARCHAR(40) NOT NULL DEFAULT 'solicitado' CHECK (status_fluxo IN ('solicitado', 'processado_operadora', 'reativado')),
    data_solicitacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_cancelamento_operadora DATE,
    data_reativacao TIMESTAMP WITH TIME ZONE,
    solicitado_por UUID,
    processado_por UUID,
    motivo_solicitacao TEXT,
    observacao_processamento TEXT,
    observacao_reativacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancelamentos_beneficiarios_tenant ON cancelamentos_beneficiarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cancelamentos_beneficiarios_adm ON cancelamentos_beneficiarios(administradora_id);
CREATE INDEX IF NOT EXISTS idx_cancelamentos_beneficiarios_vida ON cancelamentos_beneficiarios(vida_id);
CREATE INDEX IF NOT EXISTS idx_cancelamentos_beneficiarios_status ON cancelamentos_beneficiarios(status_fluxo);
CREATE INDEX IF NOT EXISTS idx_cancelamentos_beneficiarios_data_solicitacao ON cancelamentos_beneficiarios(data_solicitacao DESC);
CREATE INDEX IF NOT EXISTS idx_cancelamentos_beneficiarios_data_operadora ON cancelamentos_beneficiarios(data_cancelamento_operadora DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cancelamentos_beneficiarios_updated_at ON cancelamentos_beneficiarios;
CREATE TRIGGER update_cancelamentos_beneficiarios_updated_at
    BEFORE UPDATE ON cancelamentos_beneficiarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cancelamentos_beneficiarios IS 'Fluxo de cancelamento e reativacao de beneficiarios';
