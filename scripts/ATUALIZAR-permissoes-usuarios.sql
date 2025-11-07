-- Atualizar permissões dos usuários baseado no perfil

-- 1. Verificar usuários sem permissões ou com permissões NULL
SELECT 
  id,
  nome,
  email,
  perfil,
  permissoes
FROM usuarios_admin
WHERE permissoes IS NULL 
   OR permissoes = 'null'::jsonb
   OR jsonb_typeof(permissoes) = 'null';

-- 2. Definir permissões para perfil "master"
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","contratos","tabelas","produtos","clientes","clientes_ativos","corretores","leads","vendas","modelos_propostas","administradoras","financeiro","usuarios","configuracoes"]'::jsonb
WHERE perfil = 'master'
  AND (permissoes IS NULL OR permissoes = 'null'::jsonb OR jsonb_typeof(permissoes) = 'null');

-- 3. Definir permissões para perfil "assistente"
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","clientes","clientes_ativos"]'::jsonb
WHERE perfil = 'assistente'
  AND (permissoes IS NULL OR permissoes = 'null'::jsonb OR jsonb_typeof(permissoes) = 'null');

-- 4. Definir permissões para perfil "super_admin" (se existir)
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","contratos","tabelas","produtos","clientes","clientes_ativos","corretores","leads","vendas","modelos_propostas","administradoras","financeiro","usuarios","configuracoes"]'::jsonb
WHERE perfil = 'super_admin'
  AND (permissoes IS NULL OR permissoes = 'null'::jsonb OR jsonb_typeof(permissoes) = 'null');

-- 5. Definir permissões para perfil "admin" (se existir)
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","contratos","tabelas","produtos","clientes","clientes_ativos","corretores","leads","vendas","modelos_propostas","administradoras","financeiro"]'::jsonb
WHERE perfil = 'admin'
  AND (permissoes IS NULL OR permissoes = 'null'::jsonb OR jsonb_typeof(permissoes) = 'null');

-- 6. Verificar resultado
SELECT 
  id,
  nome,
  email,
  perfil,
  permissoes,
  CASE 
    WHEN permissoes IS NOT NULL AND jsonb_typeof(permissoes) = 'array' 
    THEN jsonb_array_length(permissoes)
    ELSE 0
  END as total_permissoes
FROM usuarios_admin
ORDER BY perfil, nome;
