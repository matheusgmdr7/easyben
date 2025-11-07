-- Script para atualizar a constraint do campo perfil na tabela usuarios_admin
-- Execute este script no Supabase SQL Editor

-- 1. Remover a constraint antiga
ALTER TABLE usuarios_admin 
DROP CONSTRAINT IF EXISTS usuarios_admin_perfil_check;

-- 2. Criar nova constraint com todos os perfis suportados
ALTER TABLE usuarios_admin
ADD CONSTRAINT usuarios_admin_perfil_check 
CHECK (perfil IN (
  'master',
  'super_admin',
  'admin',
  'assistente',
  'financeiro',
  'vendas',
  'atendimento',
  'readonly',
  'secretaria'
));

-- 3. Verificar se a constraint foi criada corretamente
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'usuarios_admin'::regclass
  AND conname = 'usuarios_admin_perfil_check';

-- 4. Verificar perfis existentes na tabela
SELECT DISTINCT perfil, COUNT(*) as total
FROM usuarios_admin
GROUP BY perfil
ORDER BY total DESC;

