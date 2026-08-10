-- Mapeamento do template de saudação (Twilio Content) — v2
-- {1} cliente · {2} financeira · {3} plano · {4} portal · {5} telefone suporte
-- Para novo Content SID após duplicar na Twilio, use scripts/atualizar-template-saudacao-v2.sql

UPDATE billing_templates
SET
  variaveis_map = '{"1":"cliente_nome","2":"financeira_nome","3":"plano_descricao","4":"url_portal_cliente","5":"telefone_suporte"}'::jsonb,
  updated_at = NOW()
WHERE event_type = 'saudacao_boas_vindas';

SELECT event_type, variaveis_map, content_sid, ativo
FROM billing_templates
WHERE event_type = 'saudacao_boas_vindas';
