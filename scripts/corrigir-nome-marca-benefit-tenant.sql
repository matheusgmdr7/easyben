-- Ajusta nome de exibição do tenant benefit e administradora vinculada (legado "Alfa Seguros").
-- Execute no Supabase SQL Editor se a mensagem de cobrança ainda mostrar nome antigo.

-- 1) Marca do tenant (prioridade na UI e WhatsApp)
UPDATE tenants
SET
  nome_marca = 'Benefit Cobranças',
  updated_at = NOW()
WHERE lower(slug) = 'benefit'
   OR lower(nome_marca) LIKE '%alfa%seguros%'
   OR lower(nome) LIKE '%alfa%seguros%';

-- 2) Cadastro da administradora Benefit (opcional — alinha razão social ao nome comercial)
UPDATE administradoras
SET
  nome_fantasia = 'Benefit Cobranças',
  updated_at = NOW()
WHERE lower(nome) LIKE '%benefit%'
   OR lower(nome_fantasia) LIKE '%alfa%seguros%'
   OR lower(nome) LIKE '%alfa%seguros%';

-- Conferência
SELECT id, slug, nome, nome_marca FROM tenants WHERE lower(slug) = 'benefit' OR lower(nome_marca) LIKE '%benefit%';
SELECT id, nome, nome_fantasia FROM administradoras WHERE lower(nome) LIKE '%benefit%' OR lower(nome) LIKE '%alfa%';
