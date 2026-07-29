-- ============================================
-- WhatsApp Cobranças — Twilio + BullMQ
-- Execute no Supabase SQL Editor
-- ============================================

-- Templates globais (ContentSid configurado na Twilio)
CREATE TABLE IF NOT EXISTS billing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64) NOT NULL UNIQUE,
  content_sid VARCHAR(64) NOT NULL,
  descricao TEXT,
  -- Mapeamento variável Twilio → chave interna. Ex.: {"1":"cliente_nome","2":"valor_fatura"}
  variaveis_map JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuração por administradora (liga/desliga eventos automáticos)
CREATE TABLE IF NOT EXISTS billing_notification_settings (
  administradora_id UUID PRIMARY KEY REFERENCES administradoras(id) ON DELETE CASCADE,
  whatsapp_automatico_ativo BOOLEAN NOT NULL DEFAULT false,
  horario_envio TIME NOT NULL DEFAULT '09:00',
  -- { "lembrete_d5": true, "cobranca_d3": false, ... }
  eventos_ativos JSONB NOT NULL DEFAULT '{}',
  telefone_suporte_whatsapp VARCHAR(32),
  url_portal_cliente TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mensagens outbound (envio + status Twilio)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  cliente_administradora_id UUID NOT NULL REFERENCES clientes_administradoras(id) ON DELETE CASCADE,
  fatura_id UUID REFERENCES faturas(id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL,
  reference_date DATE NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  telefone VARCHAR(32) NOT NULL,
  content_sid VARCHAR(64) NOT NULL,
  content_variables JSONB NOT NULL DEFAULT '{}',
  message_sid VARCHAR(64) UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'queued', 'sent', 'delivered', 'read',
      'failed', 'failed_permanent', 'undelivered'
    )),
  error_code VARCHAR(64),
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_cliente ON whatsapp_messages(cliente_administradora_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_fatura ON whatsapp_messages(fatura_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_event_ref ON whatsapp_messages(event_type, reference_date);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_sid ON whatsapp_messages(message_sid) WHERE message_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);

-- Mensagens inbound (respostas do cliente)
CREATE TABLE IF NOT EXISTS whatsapp_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid VARCHAR(64) NOT NULL UNIQUE,
  telefone VARCHAR(32) NOT NULL,
  cliente_administradora_id UUID REFERENCES clientes_administradoras(id) ON DELETE SET NULL,
  administradora_id UUID REFERENCES administradoras(id) ON DELETE SET NULL,
  body TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_telefone ON whatsapp_inbound_messages(telefone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_processed ON whatsapp_inbound_messages(processed_at) WHERE processed_at IS NULL;

-- updated_at automático
CREATE OR REPLACE FUNCTION update_whatsapp_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billing_templates_updated_at ON billing_templates;
CREATE TRIGGER trg_billing_templates_updated_at
  BEFORE UPDATE ON billing_templates
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_billing_updated_at();

DROP TRIGGER IF EXISTS trg_billing_notification_settings_updated_at ON billing_notification_settings;
CREATE TRIGGER trg_billing_notification_settings_updated_at
  BEFORE UPDATE ON billing_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_billing_updated_at();

DROP TRIGGER IF EXISTS trg_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER trg_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_billing_updated_at();

COMMENT ON TABLE billing_templates IS 'Templates Twilio WhatsApp (ContentSid) globais por tipo de evento de cobrança';
COMMENT ON TABLE billing_notification_settings IS 'Regras de envio automático WhatsApp por administradora';
COMMENT ON TABLE whatsapp_messages IS 'Histórico de mensagens outbound Twilio WhatsApp';
COMMENT ON TABLE whatsapp_inbound_messages IS 'Mensagens recebidas dos clientes via WhatsApp';
