-- Script para criar uma administradora de teste para o portal
-- Email: teste@administradora.com
-- Senha: teste123

-- IMPORTANTE: Este script precisa ser executado após gerar o hash da senha
-- Use o script Node.js criar-administradora-teste.js para gerar o hash correto

-- Verificar se já existe uma administradora de teste
DO $$
DECLARE
    administradora_existe BOOLEAN;
    tenant_id_teste UUID;
BEGIN
    -- Verificar se já existe
    SELECT EXISTS(
        SELECT 1 FROM administradoras 
        WHERE email_login = 'teste@administradora.com'
    ) INTO administradora_existe;
    
    IF administradora_existe THEN
        RAISE NOTICE '⚠️ Administradora de teste já existe. Atualizando...';
        
        -- Atualizar administradora existente
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
            updated_at = NOW()
        WHERE email_login = 'teste@administradora.com';
        
        RAISE NOTICE '✅ Administradora de teste atualizada';
    ELSE
        -- Buscar tenant_id padrão (ou usar um específico)
        SELECT id INTO tenant_id_teste 
        FROM tenants 
        WHERE status = 'ativo' 
        ORDER BY created_at ASC 
        LIMIT 1;
        
        IF tenant_id_teste IS NULL THEN
            RAISE EXCEPTION 'Nenhum tenant ativo encontrado. Crie um tenant primeiro.';
        END IF;
        
        RAISE NOTICE '📋 Criando administradora de teste...';
        RAISE NOTICE '🏢 Tenant ID: %', tenant_id_teste;
        
        -- Inserir nova administradora de teste
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
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Administradora de teste criada';
    END IF;
END $$;

-- IMPORTANTE: Execute o script Node.js criar-administradora-teste.js
-- para gerar e atualizar o hash da senha corretamente
-- O hash da senha "teste123" precisa ser gerado com bcrypt







