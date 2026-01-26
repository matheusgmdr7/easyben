-- Script SQL para criar administradora de teste
-- Execute este script no Supabase SQL Editor
-- 
-- Credenciais de teste:
-- Email: teste@administradora.com
-- Senha: teste123
--
-- IMPORTANTE: O hash da senha precisa ser gerado com bcrypt
-- Use o script Node.js criar-administradora-teste.js para gerar o hash correto
-- ou use a API route /api/admin/criar-administradora-teste

-- Verificar se já existe
DO $$
DECLARE
    admin_id UUID;
    tenant_id_teste UUID;
    senha_hash_teste TEXT := '$2a$10$rK8X8X8X8X8X8X8X8X8Xe8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8'; -- Hash temporário, será atualizado pelo script Node.js
BEGIN
    -- Buscar tenant_id padrão
    SELECT id INTO tenant_id_teste 
    FROM tenants 
    WHERE status = 'ativo' 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF tenant_id_teste IS NULL THEN
        RAISE EXCEPTION 'Nenhum tenant ativo encontrado. Crie um tenant primeiro.';
    END IF;
    
    -- Verificar se já existe
    SELECT id INTO admin_id
    FROM administradoras 
    WHERE email_login = 'teste@administradora.com';
    
    IF admin_id IS NOT NULL THEN
        RAISE NOTICE '⚠️ Administradora de teste já existe (ID: %). Atualizando...', admin_id;
        
        UPDATE administradoras
        SET 
            nome = 'Administradora de Teste',
            nome_fantasia = 'Admin Teste',
            cnpj = '12.345.678/0001-90',
            email = 'teste@administradora.com',
            email_login = 'teste@administradora.com',
            telefone = '(11) 99999-9999',
            status = 'ativa',
            status_login = 'ativo',
            tenant_id = tenant_id_teste,
            updated_at = NOW()
        WHERE id = admin_id;
        
        RAISE NOTICE '✅ Administradora de teste atualizada';
    ELSE
        RAISE NOTICE '📋 Criando administradora de teste...';
        RAISE NOTICE '🏢 Tenant ID: %', tenant_id_teste;
        
        INSERT INTO administradoras (
            id,
            nome,
            nome_fantasia,
            cnpj,
            email,
            email_login,
            telefone,
            status,
            status_login,
            tenant_id,
            senha_hash,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Administradora de Teste',
            'Admin Teste',
            '12.345.678/0001-90',
            'teste@administradora.com',
            'teste@administradora.com',
            '(11) 99999-9999',
            'ativa',
            'ativo',
            tenant_id_teste,
            senha_hash_teste, -- Será atualizado pelo script Node.js
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Administradora de teste criada';
    END IF;
END $$;

-- IMPORTANTE: Execute o script Node.js criar-administradora-teste.js
-- para gerar e atualizar o hash da senha corretamente
-- O hash da senha "teste123" precisa ser gerado com bcrypt







