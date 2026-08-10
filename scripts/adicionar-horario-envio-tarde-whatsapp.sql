-- Horário de retentativa (tarde) para lembretes WhatsApp automáticos
-- Execute no Supabase SQL Editor

ALTER TABLE billing_notification_settings
ADD COLUMN IF NOT EXISTS horario_envio_tarde TIME DEFAULT '15:00:00';

COMMENT ON COLUMN billing_notification_settings.horario_envio_tarde IS
  'Segunda janela diária (BRT) para retentativa de lembretes; NULL desativa envio da tarde.';

-- Conferência
SELECT administradora_id, horario_envio, horario_envio_tarde, whatsapp_automatico_ativo
FROM billing_notification_settings;
