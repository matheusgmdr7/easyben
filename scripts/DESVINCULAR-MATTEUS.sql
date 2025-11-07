-- scripts/DESVINCULAR-MATTEUS.sql
-- Script pronto para desvincular MATTEUS SILVA

BEGIN;

-- 1. Buscar e remover faturas
DELETE FROM faturas
WHERE cliente_nome ILIKE '%MATTEUS%SILVA%';

-- 2. Remover vínculo com administradora
DELETE FROM clientes_administradoras
WHERE proposta_id IN (
    SELECT id FROM propostas 
    WHERE nome ILIKE '%MATTEUS%SILVA%'
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
WHERE nome ILIKE '%MATTEUS%SILVA%';

-- 4. Verificar resultado
SELECT 
    '✅ MATTEUS DESVINCULADO' as status,
    id,
    nome,
    cpf,
    email,
    status as proposta_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM clientes_administradoras WHERE proposta_id = propostas.id)
        THEN '❌ Ainda vinculado'
        ELSE '✅ Pronto para cadastro'
    END as situacao
FROM propostas
WHERE nome ILIKE '%MATTEUS%SILVA%';

COMMIT;

-- ============================================
-- 🎯 RESULTADO ESPERADO:
-- - Faturas removidas
-- - Vínculo removido
-- - Status: "aprovada"
-- - Situação: "✅ Pronto para cadastro"
-- ============================================



