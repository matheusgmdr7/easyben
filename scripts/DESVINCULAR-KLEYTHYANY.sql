-- scripts/DESVINCULAR-KLEYTHYANY.sql
-- Script pronto para desvincular KLEYTHYANY LACERDA NUNES

BEGIN;

-- 1. Buscar e remover faturas (usando clientes_administradoras como intermediário)
DELETE FROM faturas
WHERE cliente_administradora_id IN (
    SELECT id FROM clientes_administradoras
    WHERE proposta_id IN (
        SELECT id FROM propostas 
        WHERE (nome_cliente IS NOT NULL AND nome_cliente ILIKE '%KLEYTHYANY%LACERDA%NUNES%')
           OR (nome IS NOT NULL AND nome ILIKE '%KLEYTHYANY%LACERDA%NUNES%')
    )
);

-- 2. Remover vínculo com administradora
DELETE FROM clientes_administradoras
WHERE proposta_id IN (
    SELECT id FROM propostas 
    WHERE (nome_cliente IS NOT NULL AND nome_cliente ILIKE '%KLEYTHYANY%LACERDA%NUNES%')
       OR (nome IS NOT NULL AND nome ILIKE '%KLEYTHYANY%LACERDA%NUNES%')
);

-- 3. Atualizar status da proposta para "aprovada"
UPDATE propostas
SET 
    status = 'aprovada',
    administradora = NULL,
    data_cadastro = NULL,
    data_vencimento = NULL,
    data_vigencia = NULL,
    updated_at = NOW()
WHERE (nome_cliente IS NOT NULL AND nome_cliente ILIKE '%KLEYTHYANY%LACERDA%NUNES%')
   OR (nome IS NOT NULL AND nome ILIKE '%KLEYTHYANY%LACERDA%NUNES%');

-- 4. Verificar resultado
SELECT 
    '✅ KLEYTHYANY DESVINCULADA' as status,
    id,
    COALESCE(nome_cliente, nome) as nome_completo,
    cpf,
    email,
    status as proposta_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM clientes_administradoras WHERE proposta_id = propostas.id)
        THEN '❌ Ainda vinculado'
        ELSE '✅ Pronto para cadastro'
    END as situacao
FROM propostas
WHERE (nome_cliente IS NOT NULL AND nome_cliente ILIKE '%KLEYTHYANY%LACERDA%NUNES%')
   OR (nome IS NOT NULL AND nome ILIKE '%KLEYTHYANY%LACERDA%NUNES%');

COMMIT;

-- ============================================
-- 🎯 RESULTADO ESPERADO:
-- - Faturas removidas
-- - Vínculo removido
-- - Status: "aprovada"
-- - Situação: "✅ Pronto para cadastro"
-- ============================================






