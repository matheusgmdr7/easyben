-- ============================================
-- SCRIPT: Verificar Usuários no Auth sem Registro na Tabela corretores
-- ============================================
-- Este script ajuda a identificar casos onde um email existe no Supabase Auth
-- mas não existe na tabela corretores
-- ============================================

-- IMPORTANTE: Este script não pode acessar diretamente o Supabase Auth
-- Você precisará verificar manualmente no Dashboard do Supabase

-- 1. Verificar se um email específico existe na tabela corretores
SELECT 
    id,
    nome,
    email,
    status,
    ativo,
    is_gestor,
    created_at,
    tenant_id
FROM corretores 
WHERE email = 'saudebsb1@gmail.com';

-- 2. Listar todos os emails cadastrados na tabela corretores
SELECT 
    email,
    nome,
    status,
    ativo,
    created_at
FROM corretores
ORDER BY created_at DESC;

-- 3. Verificar emails duplicados na tabela corretores
SELECT 
    email,
    COUNT(*) as quantidade
FROM corretores
GROUP BY email
HAVING COUNT(*) > 1;

-- ============================================
-- AÇÕES MANUAIS NECESSÁRIAS
-- ============================================

-- Para verificar se um email existe no Supabase Auth:
-- 1. Acesse o Dashboard do Supabase (https://supabase.com/dashboard)
-- 2. Vá em Authentication > Users
-- 3. Busque pelo email

-- Se o email existir no Auth mas NÃO na tabela corretores:
-- Opção 1: Criar registro manual na tabela corretores
-- Opção 2: Deletar o usuário do Auth (via Dashboard) para permitir novo cadastro

-- ============================================
-- EXEMPLO: Criar registro manual (ajuste conforme necessário)
-- ============================================
/*
INSERT INTO corretores (
    nome,
    email,
    whatsapp,
    estado,
    cidade,
    cpf,
    data_nascimento,
    status,
    ativo,
    is_gestor,
    tenant_id
) VALUES (
    'Nome do Corretor',
    'saudebsb1@gmail.com',
    '5511999999999',
    'SP',
    'São Paulo',
    '00000000000',
    '1990-01-01',
    'pendente',
    true,
    false,
    (SELECT id FROM tenants LIMIT 1) -- Ajuste conforme seu tenant_id
);
*/

-- ============================================
-- VERIFICAR ESTRUTURA DA TABELA
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'corretores'
ORDER BY ordinal_position;





