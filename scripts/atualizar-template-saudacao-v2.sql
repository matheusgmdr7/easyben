-- Template saudação v2 — sem cobertura, com telefone de suporte na última linha
-- Execute no Supabase SQL Editor APÓS aprovar o novo template na Twilio.
--
-- 1) Duplique o template HXea17... na Twilio Content Template Builder
-- 2) Cole o corpo abaixo e submeta para aprovação WhatsApp (categoria UTILITY)
-- 3) Substitua HX_NOVO_SID pelo Content SID da cópia aprovada
-- 4) Rode este script
--
-- CORPO DO TEMPLATE (Twilio) — Meta exige texto FIXO após a última variável:
-- Olá {{1}}! Seja bem-vindo(a) à {{2}}.
--
-- Seu plano {{3}} em breve estará ativo.
--
-- A partir de agora você receberá por aqui suas notificações de faturas e vencimentos.
--
-- Consulte boletos, carteirinha e dados do contrato no portal: {{4}}
--
-- Qualquer dúvida, fale conosco pelo WhatsApp {{5}}. Estamos à disposição.
--
-- Variáveis:
-- {1} cliente_nome · {2} financeira_nome · {3} plano_descricao
-- {4} url_portal_cliente · {5} telefone_suporte (billing_notification_settings)

UPDATE billing_templates
SET
  content_sid = 'HX_NOVO_SID_AQUI',
  variaveis_map = '{"1":"cliente_nome","2":"financeira_nome","3":"plano_descricao","4":"url_portal_cliente","5":"telefone_suporte"}'::jsonb,
  descricao = 'Saudação e boas-vindas ao novo cliente (v2 — telefone suporte)',
  updated_at = NOW()
WHERE event_type = 'saudacao_boas_vindas';

SELECT event_type, content_sid, variaveis_map, descricao, ativo
FROM billing_templates
WHERE event_type = 'saudacao_boas_vindas';
