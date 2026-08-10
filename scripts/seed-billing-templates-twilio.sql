-- Seed dos templates Twilio (ContentSid) — substitua HX_PLACEHOLDER_* pelos SIDs reais do console Twilio
-- Execute após scripts/criar-tabelas-whatsapp-cobrancas-twilio.sql

INSERT INTO billing_templates (event_type, content_sid, descricao, variaveis_map, ativo)
VALUES
  (
    'saudacao_boas_vindas',
    'HXea17dc298936290a64a64f2c371d7153',
    'Saudação e boas-vindas ao novo cliente',
    '{"1":"cliente_nome","2":"financeira_nome","3":"plano_descricao","4":"url_portal_cliente","5":"telefone_suporte"}'::jsonb,
    true
  ),
  (
    'primeiro_boleto_gerado',
    'HXaae6369317048f40a923fb990ddd7ef0',
    'Primeiro boleto gerado',
    '{"1":"cliente_nome","2":"valor_fatura","3":"data_vencimento","4":"link_boleto","5":"administradora_nome"}'::jsonb,
    true
  ),
  (
    'lembrete_d5',
    'HX48c0da5ec22326cb1ffe7a1843ff5b74',
    'Lembrete 5 dias antes do vencimento',
    '{"1":"cliente_nome","2":"valor_fatura","3":"data_vencimento","4":"link_boleto","5":"administradora_nome"}'::jsonb,
    true
  ),
  (
    'aviso_d1',
    'HX32eba9bcf30e722331002d15ff189fcf',
    'Aviso véspera do vencimento (D-1)',
    '{"1":"cliente_nome","2":"valor_fatura","3":"data_vencimento","4":"link_boleto","5":"administradora_nome"}'::jsonb,
    true
  ),
  (
    'aviso_d0',
    'HX384f1575823d253a5708cb32281daedf',
    'Aviso no dia do vencimento (D0)',
    '{"1":"cliente_nome","2":"valor_fatura","3":"data_vencimento","4":"link_boleto","5":"administradora_nome"}'::jsonb,
    true
  ),
  (
    'cobranca_d3',
    'HXa06b1e6e8279caf5b9624e2ea32705e2',
    'Cobrança 3 dias após vencimento',
    '{"1":"cliente_nome","2":"valor_fatura","3":"data_vencimento","4":"link_boleto","5":"administradora_nome"}'::jsonb,
    true
  ),
  (
    'cobranca_d7',
    'HX84732da2efe33fdecb1a1b7621c4a805',
    'Cobrança 7 dias após vencimento',
    '{"1":"cliente_nome","2":"valor_fatura","3":"data_vencimento","4":"link_boleto","5":"administradora_nome"}'::jsonb,
    true
  ),
  (
    'cobranca_d15',
    'HX3c5bdb749683f1664e397e471ecea175',
    'D+15 — Evite o cancelamento',
    '{"1":"cliente_nome","2":"valor_fatura","3":"data_vencimento","4":"link_boleto","5":"administradora_nome"}'::jsonb,
    true
  ),
  (
    'cobranca_d25',
    'HXbc7c75981e4b063c8318b4aaf11e7128',
    'D+25 — Encaminhamento cancelamento/jurídico',
    '{"1":"cliente_nome","2":"valor_fatura","3":"data_vencimento","4":"link_boleto","5":"administradora_nome","6":"telefone_suporte"}'::jsonb,
    true
  ),
  (
    'confirmacao_pagamento',
    'HX6c7e69bd89910b12ebb556c099656cdc',
    'Confirmação de pagamento recebido',
    '{"1":"cliente_nome","2":"valor_fatura","3":"data_pagamento","4":"numero_fatura","5":"administradora_nome"}'::jsonb,
    true
  )
ON CONFLICT (event_type) DO UPDATE SET
  content_sid = EXCLUDED.content_sid,
  descricao = EXCLUDED.descricao,
  variaveis_map = EXCLUDED.variaveis_map,
  ativo = EXCLUDED.ativo,
  updated_at = NOW();

-- Ativa todos os eventos por padrão para administradoras existentes (whatsapp desligado até habilitar na UI)
INSERT INTO billing_notification_settings (administradora_id, whatsapp_automatico_ativo, eventos_ativos)
SELECT
  a.id,
  false,
  '{
    "saudacao_boas_vindas": true,
    "primeiro_boleto_gerado": true,
    "lembrete_d5": true,
    "aviso_d1": true,
    "aviso_d0": true,
    "cobranca_d3": true,
    "cobranca_d7": true,
    "cobranca_d15": true,
    "cobranca_d25": true,
    "confirmacao_pagamento": true
  }'::jsonb
FROM administradoras a
ON CONFLICT (administradora_id) DO NOTHING;
