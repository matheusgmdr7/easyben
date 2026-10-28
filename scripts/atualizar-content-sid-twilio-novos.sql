-- Atualiza todos os Content SID Twilio (templates aprovados — ago/2026)
-- Execute no Supabase SQL Editor

UPDATE billing_templates
SET
  content_sid = 'HX89b93b0d8c96f4df4fd5eb13b6e1c4a7',
  variaveis_map = '{"1":"cliente_nome","2":"financeira_nome","3":"plano_descricao","4":"url_portal_cliente","5":"telefone_suporte"}'::jsonb,
  descricao = 'Saudação e boas-vindas ao novo cliente (v2 — telefone suporte)',
  updated_at = NOW()
WHERE event_type = 'saudacao_boas_vindas';

UPDATE billing_templates
SET content_sid = 'HXd8741d32a2c9bed77709e7d8ea34c4ff', updated_at = NOW()
WHERE event_type = 'primeiro_boleto_gerado';

UPDATE billing_templates
SET content_sid = 'HXe57905cde99b429b18cd53ac25d1ec9f', updated_at = NOW()
WHERE event_type = 'lembrete_d5';

UPDATE billing_templates
SET content_sid = 'HXc46e0da77f133dc3dc693bfeefa92208', updated_at = NOW()
WHERE event_type = 'aviso_d1';

UPDATE billing_templates
SET content_sid = 'HX6f4fa36453ab37a744796da91e7282ac', updated_at = NOW()
WHERE event_type = 'aviso_d0';

UPDATE billing_templates
SET content_sid = 'HX5a3e9917868bdc4d156cae710af6a8b5', updated_at = NOW()
WHERE event_type = 'cobranca_d3';

UPDATE billing_templates
SET content_sid = 'HXc3ec2af60963bd34f36682ac1ad9a5ca', updated_at = NOW()
WHERE event_type = 'cobranca_d7';

UPDATE billing_templates
SET content_sid = 'HX2fe8e58d75647f9633be6cdfa3733f78', updated_at = NOW()
WHERE event_type = 'cobranca_d15';

UPDATE billing_templates
SET content_sid = 'HXc7cc5e1b5a6928817b7bffe615f98a1b', updated_at = NOW()
WHERE event_type = 'cobranca_d25';

UPDATE billing_templates
SET content_sid = 'HX6c7e69bd89910b12ebb556c099656cdc', updated_at = NOW()
WHERE event_type = 'confirmacao_pagamento';

-- Conferência — todos devem ter content_sid HX... e ativo = true
SELECT event_type, content_sid, variaveis_map, descricao, ativo
FROM billing_templates
ORDER BY event_type;
