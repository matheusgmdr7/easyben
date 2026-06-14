-- Vincula chamados a beneficiários dos grupos (execute se a tabela já existir)

ALTER TABLE chamados_administradora
  ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos_beneficiarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS beneficiario_origem VARCHAR(40),
  ADD COLUMN IF NOT EXISTS vida_importada_id UUID REFERENCES vidas_importadas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_administradora_id UUID REFERENCES clientes_administradoras(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_cpf VARCHAR(20),
  ADD COLUMN IF NOT EXISTS grupo_nome VARCHAR(255),
  ADD COLUMN IF NOT EXISTS assunto_codigo VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_chamados_administradora_grupo ON chamados_administradora(grupo_id);
CREATE INDEX IF NOT EXISTS idx_chamados_administradora_vida ON chamados_administradora(vida_importada_id);
CREATE INDEX IF NOT EXISTS idx_chamados_administradora_cliente ON chamados_administradora(cliente_administradora_id);

COMMENT ON COLUMN chamados_administradora.beneficiario_origem IS 'vida_importada ou cliente_administradora';
