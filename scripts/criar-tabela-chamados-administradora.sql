-- Chamados de atendimento no portal administradora
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chamados_administradora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  tenant_id UUID,

  numero INTEGER NOT NULL DEFAULT 0,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_telefone VARCHAR(50),
  cliente_email VARCHAR(255),
  cliente_cpf VARCHAR(20),
  grupo_id UUID REFERENCES grupos_beneficiarios(id) ON DELETE SET NULL,
  grupo_nome VARCHAR(255),
  beneficiario_origem VARCHAR(40),
  vida_importada_id UUID REFERENCES vidas_importadas(id) ON DELETE SET NULL,
  cliente_administradora_id UUID REFERENCES clientes_administradoras(id) ON DELETE SET NULL,
  assunto VARCHAR(255) NOT NULL,
  assunto_codigo VARCHAR(50),
  queixa TEXT NOT NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),

  aberto_por_usuario_id UUID REFERENCES usuarios_administradora(id) ON DELETE SET NULL,
  aberto_por_nome TEXT,
  fechado_por_usuario_id UUID REFERENCES usuarios_administradora(id) ON DELETE SET NULL,
  fechado_por_nome TEXT,
  resolucao TEXT,

  aberto_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fechado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chamados_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES chamados_administradora(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('abertura', 'status', 'observacao', 'fechamento')),
  status_anterior VARCHAR(30),
  status_novo VARCHAR(30),
  descricao TEXT,
  usuario_id UUID REFERENCES usuarios_administradora(id) ON DELETE SET NULL,
  usuario_nome TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chamados_administradora_adm ON chamados_administradora(administradora_id);
CREATE INDEX IF NOT EXISTS idx_chamados_administradora_tenant ON chamados_administradora(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chamados_administradora_status ON chamados_administradora(status);
CREATE INDEX IF NOT EXISTS idx_chamados_administradora_aberto_em ON chamados_administradora(aberto_em DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_administradora_grupo ON chamados_administradora(grupo_id);
CREATE INDEX IF NOT EXISTS idx_chamados_administradora_vida ON chamados_administradora(vida_importada_id);
CREATE INDEX IF NOT EXISTS idx_chamados_administradora_cliente ON chamados_administradora(cliente_administradora_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chamados_administradora_numero_adm
  ON chamados_administradora(administradora_id, numero);
CREATE INDEX IF NOT EXISTS idx_chamados_historico_chamado ON chamados_historico(chamado_id, criado_em DESC);

CREATE OR REPLACE FUNCTION chamados_administradora_set_numero()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = 0 THEN
    SELECT COALESCE(MAX(numero), 0) + 1
      INTO NEW.numero
      FROM chamados_administradora
     WHERE administradora_id = NEW.administradora_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chamados_administradora_numero ON chamados_administradora;
CREATE TRIGGER trg_chamados_administradora_numero
  BEFORE INSERT ON chamados_administradora
  FOR EACH ROW
  EXECUTE FUNCTION chamados_administradora_set_numero();

DROP TRIGGER IF EXISTS trg_chamados_administradora_updated ON chamados_administradora;
CREATE TRIGGER trg_chamados_administradora_updated
  BEFORE UPDATE ON chamados_administradora
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE chamados_administradora IS 'Chamados de atendimento registrados pela administradora';
COMMENT ON TABLE chamados_historico IS 'Histórico de eventos de cada chamado';
