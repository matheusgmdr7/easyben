-- Adiciona colunas em faturas para guardar ID da cobrança e URL do boleto (Asaas).
-- Assim a aba Financeiro do modal do beneficiário consegue mostrar os botões Visualizar/Baixar.
-- Execute no Supabase SQL Editor.

DO $$
BEGIN
  -- gateway_id (ID da cobrança no gateway, ex: pay_xxx do Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'gateway_id') THEN
    ALTER TABLE faturas ADD COLUMN gateway_id VARCHAR(100);
    RAISE NOTICE 'Coluna faturas.gateway_id criada';
  END IF;
  -- gateway_nome (ex.: "Asaas - Nome da financeira", até 50 chars — filtro do dashboard / relatórios)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'gateway_nome') THEN
    ALTER TABLE faturas ADD COLUMN gateway_nome VARCHAR(50);
    RAISE NOTICE 'Coluna faturas.gateway_nome criada';
  END IF;
  -- asaas_charge_id (mesmo valor que gateway_id quando o gateway é Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'asaas_charge_id') THEN
    ALTER TABLE faturas ADD COLUMN asaas_charge_id VARCHAR(100);
    RAISE NOTICE 'Coluna faturas.asaas_charge_id criada';
  END IF;
  -- boleto_url (URL do PDF do boleto)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'boleto_url') THEN
    ALTER TABLE faturas ADD COLUMN boleto_url TEXT;
    RAISE NOTICE 'Coluna faturas.boleto_url criada';
  END IF;
  -- asaas_boleto_url (URL do boleto quando gerado pelo Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'asaas_boleto_url') THEN
    ALTER TABLE faturas ADD COLUMN asaas_boleto_url TEXT;
    RAISE NOTICE 'Coluna faturas.asaas_boleto_url criada';
  END IF;
  -- asaas_invoice_url (URL da fatura no Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'asaas_invoice_url') THEN
    ALTER TABLE faturas ADD COLUMN asaas_invoice_url TEXT;
    RAISE NOTICE 'Coluna faturas.asaas_invoice_url criada';
  END IF;
  -- asaas_payment_link (link de pagamento do Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'asaas_payment_link') THEN
    ALTER TABLE faturas ADD COLUMN asaas_payment_link TEXT;
    RAISE NOTICE 'Coluna faturas.asaas_payment_link criada';
  END IF;
  -- boleto_codigo_barras (nosso número / código do boleto)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'boleto_codigo_barras') THEN
    ALTER TABLE faturas ADD COLUMN boleto_codigo_barras TEXT;
    RAISE NOTICE 'Coluna faturas.boleto_codigo_barras criada';
  END IF;
  -- boleto_linha_digitavel (linha digitável do boleto)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'boleto_linha_digitavel') THEN
    ALTER TABLE faturas ADD COLUMN boleto_linha_digitavel TEXT;
    RAISE NOTICE 'Coluna faturas.boleto_linha_digitavel criada';
  END IF;
  -- boleto_codigo (alias usado em alguns schemas; opcional)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'faturas' AND column_name = 'boleto_codigo') THEN
    ALTER TABLE faturas ADD COLUMN boleto_codigo VARCHAR(100);
    RAISE NOTICE 'Coluna faturas.boleto_codigo criada';
  END IF;
  RAISE NOTICE 'Colunas de boleto em faturas conferidas.';
END $$;

COMMENT ON COLUMN faturas.gateway_id IS 'ID da cobrança no gateway (ex: Asaas pay_xxx)';
COMMENT ON COLUMN faturas.gateway_nome IS 'Identificação da conta gateway na fatura (ex: Asaas - Nome financeira), para filtro multi-financeira';
COMMENT ON COLUMN faturas.asaas_charge_id IS 'ID da cobrança no Asaas';
COMMENT ON COLUMN faturas.boleto_url IS 'URL do PDF do boleto';
COMMENT ON COLUMN faturas.asaas_boleto_url IS 'URL do boleto no Asaas';
COMMENT ON COLUMN faturas.asaas_invoice_url IS 'URL da fatura no Asaas';
COMMENT ON COLUMN faturas.asaas_payment_link IS 'Link de pagamento do Asaas';
COMMENT ON COLUMN faturas.boleto_codigo_barras IS 'Código de barras / nosso número do boleto';
COMMENT ON COLUMN faturas.boleto_linha_digitavel IS 'Linha digitável do boleto';
