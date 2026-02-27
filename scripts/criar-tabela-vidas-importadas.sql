-- Tabela para armazenar vidas (titulares e dependentes) importadas via Excel/CSV
-- Execute no Supabase SQL Editor antes de usar a Importação de vidas

CREATE TABLE IF NOT EXISTS vidas_importadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    importacao_id UUID,
    administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
    grupo_id UUID NOT NULL REFERENCES grupos_beneficiarios(id) ON DELETE CASCADE,
    produto_id UUID,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    nome_mae VARCHAR(255),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('titular', 'dependente')),
    data_nascimento DATE,
    idade INT,
    parentesco VARCHAR(50),
    cpf_titular VARCHAR(14),
    tenant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vidas_importadas_administradora ON vidas_importadas(administradora_id);
CREATE INDEX IF NOT EXISTS idx_vidas_importadas_grupo ON vidas_importadas(grupo_id);
CREATE INDEX IF NOT EXISTS idx_vidas_importadas_importacao ON vidas_importadas(importacao_id);
CREATE INDEX IF NOT EXISTS idx_vidas_importadas_cpf ON vidas_importadas(cpf);
CREATE INDEX IF NOT EXISTS idx_vidas_importadas_tenant ON vidas_importadas(tenant_id);

COMMENT ON TABLE vidas_importadas IS 'Vidas (titulares e dependentes) importadas via Excel/CSV para grupo e produto';
COMMENT ON COLUMN vidas_importadas.tipo IS 'titular ou dependente';
COMMENT ON COLUMN vidas_importadas.cpf_titular IS 'CPF do titular quando tipo=dependente, para vincular ao titular da mesma importação';
