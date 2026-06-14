-- Corrige trigger de atualização em usuarios_administradora.
-- O trigger genérico update_updated_at_column() usa coluna updated_at,
-- mas esta tabela usa atualizado_em — o UPDATE falhava ao editar usuários.

DROP TRIGGER IF EXISTS update_usuarios_administradora_updated_at ON usuarios_administradora;

CREATE OR REPLACE FUNCTION update_usuarios_administradora_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_administradora_updated_at
  BEFORE UPDATE ON usuarios_administradora
  FOR EACH ROW
  EXECUTE FUNCTION update_usuarios_administradora_atualizado_em();
