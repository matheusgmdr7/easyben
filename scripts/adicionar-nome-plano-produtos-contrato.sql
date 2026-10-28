-- Nome comercial do plano, separado do nome técnico do produto.
-- O portal do cliente e a aba Contrato do beneficiário exibem este campo na carteirinha.
ALTER TABLE produtos_contrato_administradora
  ADD COLUMN IF NOT EXISTS nome_plano VARCHAR(255);

COMMENT ON COLUMN produtos_contrato_administradora.nome_plano IS
  'Nome comercial do plano exibido na carteirinha e na ficha do beneficiário. O campo nome permanece o identificador interno do produto.';
