-- ContentSid reais Twilio WhatsApp — execute no Supabase SQL Editor
-- (após criar-tabelas e seed-billing-templates-twilio)

UPDATE billing_templates SET content_sid = 'HXea17dc298936290a64a64f2c371d7153', updated_at = NOW()
WHERE event_type = 'saudacao_boas_vindas';

UPDATE billing_templates SET content_sid = 'HXaae6369317048f40a923fb990ddd7ef0', updated_at = NOW()
WHERE event_type = 'primeiro_boleto_gerado';

UPDATE billing_templates SET content_sid = 'HX48c0da5ec22326cb1ffe7a1843ff5b74', updated_at = NOW()
WHERE event_type = 'lembrete_d5';

UPDATE billing_templates SET content_sid = 'HX32eba9bcf30e722331002d15ff189fcf', updated_at = NOW()
WHERE event_type = 'aviso_d1';

UPDATE billing_templates SET content_sid = 'HX384f1575823d253a5708cb32281daedf', updated_at = NOW()
WHERE event_type = 'aviso_d0';

UPDATE billing_templates SET content_sid = 'HXa06b1e6e8279caf5b9624e2ea32705e2', updated_at = NOW()
WHERE event_type = 'cobranca_d3';

UPDATE billing_templates SET content_sid = 'HX84732da2efe33fdecb1a1b7621c4a805', updated_at = NOW()
WHERE event_type = 'cobranca_d7';

UPDATE billing_templates SET content_sid = 'HX3c5bdb749683f1664e397e471ecea175', updated_at = NOW()
WHERE event_type = 'cobranca_d15';

UPDATE billing_templates SET content_sid = 'HXbc7c75981e4b063c8318b4aaf11e7128', updated_at = NOW()
WHERE event_type = 'cobranca_d25';

UPDATE billing_templates SET content_sid = 'HX6c7e69bd89910b12ebb556c099656cdc', updated_at = NOW()
WHERE event_type = 'confirmacao_pagamento';

-- Conferência
SELECT event_type, content_sid, descricao, ativo
FROM billing_templates
ORDER BY event_type;
