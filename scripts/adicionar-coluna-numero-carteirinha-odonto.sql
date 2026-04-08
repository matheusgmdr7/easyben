-- Carteirinha odonto no contrato (clientes_administradoras)
-- Execute no Supabase SQL Editor.

ALTER TABLE clientes_administradoras
ADD COLUMN IF NOT EXISTS numero_carteirinha_odonto VARCHAR(50);

COMMENT ON COLUMN clientes_administradoras.numero_carteirinha_odonto IS 'Número da carteirinha odontológica';
