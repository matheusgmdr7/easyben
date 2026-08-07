-- Corrige mapeamento das variáveis do template de saudação (Twilio Content)
-- {1} cliente · {2} financeira · {3} plano · {4} cobertura · {5} portal do cliente
-- Execute no Supabase SQL Editor (produção).

UPDATE billing_templates
SET
  variaveis_map = '{"1":"cliente_nome","2":"financeira_nome","3":"plano_descricao","4":"cobertura","5":"url_portal_cliente"}'::jsonb,
  updated_at = NOW()
WHERE event_type = 'saudacao_boas_vindas';

SELECT event_type, variaveis_map, content_sid, ativo
FROM billing_templates
WHERE event_type = 'saudacao_boas_vindas';
