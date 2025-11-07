-- Verificar TODAS as faturas das últimas 2 horas com todos os dados
SELECT 
    f.id,
    f.numero_fatura,
    f.cliente_nome,
    f.valor,
    f.vencimento,
    f.status,
    f.asaas_charge_id,
    f.cliente_administradora_id,
    f.administradora_id,
    a.nome as administradora_nome,
    f.created_at
FROM faturas f
LEFT JOIN administradoras a ON a.id = f.administradora_id
WHERE f.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY f.created_at DESC;

