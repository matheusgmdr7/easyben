-- ============================================
-- SCRIPT 6: GARANTIR PERMISSÕES DOS USUÁRIOS
-- ============================================
-- Este script garante que todos os usuários admin
-- tenham permissões definidas baseadas no seu perfil
-- ============================================
-- ⚠️ ATENÇÃO: Execute após os scripts anteriores
-- ============================================

BEGIN;

-- ============================================
-- 1. ATUALIZAR PERMISSÕES BASEADAS NO PERFIL
-- ============================================

-- Master: Todas as permissões
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","contratos","tabelas","produtos","clientes","clientes_ativos","corretores","leads","vendas","modelos_propostas","administradoras","financeiro","usuarios","configuracoes"]'::jsonb
WHERE perfil = 'master'
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  );

-- Super Admin: Todas as permissões (igual ao master)
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","contratos","tabelas","produtos","clientes","clientes_ativos","corretores","leads","vendas","modelos_propostas","administradoras","financeiro","usuarios","configuracoes"]'::jsonb
WHERE perfil = 'super_admin'
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  );

-- Admin: Permissões administrativas (sem configurações)
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","contratos","tabelas","produtos","clientes","clientes_ativos","corretores","leads","vendas","modelos_propostas","administradoras","financeiro"]'::jsonb
WHERE perfil = 'admin'
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  );

-- Assistente: Permissões limitadas
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","clientes","clientes_ativos"]'::jsonb
WHERE perfil = 'assistente'
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  );

-- Secretaria: Permissões operacionais
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","clientes","clientes_ativos","leads","corretores"]'::jsonb
WHERE perfil = 'secretaria'
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  );

-- Financeiro: Permissões financeiras
UPDATE usuarios_admin
SET permissoes = '["dashboard","cadastrados","clientes","clientes_ativos","administradoras","financeiro"]'::jsonb
WHERE perfil = 'financeiro'
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  );

-- Vendas: Permissões de vendas
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","em_analise","contratos","clientes","leads","vendas"]'::jsonb
WHERE perfil = 'vendas'
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  );

-- Atendimento: Permissões de atendimento
UPDATE usuarios_admin
SET permissoes = '["dashboard","propostas","cadastrados","em_analise","clientes","clientes_ativos"]'::jsonb
WHERE perfil = 'atendimento'
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  );

-- Readonly: Apenas dashboard
UPDATE usuarios_admin
SET permissoes = '["dashboard"]'::jsonb
WHERE perfil = 'readonly'
  AND (
    permissoes IS NULL 
    OR permissoes = 'null'::jsonb 
    OR jsonb_typeof(permissoes) = 'null'
    OR permissoes = '{}'::jsonb
    OR (jsonb_typeof(permissoes) = 'array' AND jsonb_array_length(permissoes) = 0)
  );

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar se todas as permissões foram atualizadas:
-- 
-- SELECT 
--     id,
--     nome,
--     email,
--     perfil,
--     permissoes,
--     CASE 
--         WHEN permissoes IS NOT NULL AND jsonb_typeof(permissoes) = 'array' 
--         THEN jsonb_array_length(permissoes)
--         ELSE 0
--     END as total_permissoes
-- FROM usuarios_admin
-- ORDER BY perfil, nome;
-- ============================================
-- 
-- Resultado esperado:
-- - Todos os usuários devem ter permissões como array JSONB
-- - Total de permissões deve ser > 0 para cada usuário
-- ============================================

