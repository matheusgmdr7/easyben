-- scripts/DESVINCULAR-JACKLYNE.sql
-- Script pronto para desvincular JACKLYNE OLIVEIRA BARROS NASCIMENTO

BEGIN;

-- 1. Buscar e remover faturas
DELETE FROM faturas
WHERE cliente_nome ILIKE '%JACKLYNE%OLIVEIRA%BARROS%NASCIMENTO%';

-- 2. Remover vínculo com administradora
DELETE FROM clientes_administradoras
WHERE proposta_id IN (
    SELECT id FROM propostas 
    WHERE nome ILIKE '%JACKLYNE%OLIVEIRA%BARROS%NASCIMENTO%'
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
WHERE nome ILIKE '%JACKLYNE%OLIVEIRA%BARROS%NASCIMENTO%';

-- 4. Verificar resultado
SELECT 
    '✅ JACKLYNE DESVINCULADA' as status,
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
WHERE nome ILIKE '%JACKLYNE%OLIVEIRA%BARROS%NASCIMENTO%';

COMMIT;

-- ============================================
-- 🎯 RESULTADO ESPERADO:
-- - Faturas removidas
-- - Vínculo removido
-- - Status: "aprovada"
-- - Situação: "✅ Pronto para cadastro"
-- ============================================

