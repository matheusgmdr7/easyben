-- Adicionar campos Asaas à tabela faturas (se não existirem)
-- Execute este script no Supabase SQL Editor

-- Verificar e adicionar campos Asaas
DO $$ 
BEGIN
    -- asaas_charge_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'faturas' AND column_name = 'asaas_charge_id'
    ) THEN
        ALTER TABLE faturas ADD COLUMN asaas_charge_id VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_faturas_asaas_charge_id ON faturas(asaas_charge_id);
    END IF;

    -- asaas_boleto_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'faturas' AND column_name = 'asaas_boleto_url'
    ) THEN
        ALTER TABLE faturas ADD COLUMN asaas_boleto_url TEXT;
    END IF;

    -- asaas_invoice_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'faturas' AND column_name = 'asaas_invoice_url'
    ) THEN
        ALTER TABLE faturas ADD COLUMN asaas_invoice_url TEXT;
    END IF;

    -- asaas_payment_link
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'faturas' AND column_name = 'asaas_payment_link'
    ) THEN
        ALTER TABLE faturas ADD COLUMN asaas_payment_link TEXT;
    END IF;

    -- tenant_id (caso não exista)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'faturas' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE faturas ADD COLUMN tenant_id UUID;
        CREATE INDEX IF NOT EXISTS idx_faturas_tenant_id ON faturas(tenant_id);
    END IF;
END $$;

-- Comentários
COMMENT ON COLUMN faturas.asaas_charge_id IS 'ID da cobrança no Asaas';
COMMENT ON COLUMN faturas.asaas_boleto_url IS 'URL do boleto gerado pelo Asaas';
COMMENT ON COLUMN faturas.asaas_invoice_url IS 'URL da fatura no Asaas';
COMMENT ON COLUMN faturas.asaas_payment_link IS 'Link de pagamento do Asaas';







