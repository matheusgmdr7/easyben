-- =====================================================
-- SCRIPT: Criar Função de Estatísticas de Faturas
-- =====================================================
-- 
-- Esta função calcula estatísticas financeiras por administradora
--
-- =====================================================

-- Remover função se já existir
DROP FUNCTION IF EXISTS calcular_estatisticas_faturas(UUID);

-- Criar função
CREATE OR REPLACE FUNCTION calcular_estatisticas_faturas(p_administradora_id UUID)
RETURNS TABLE (
  total_faturas BIGINT,
  valor_total NUMERIC,
  faturas_pendentes BIGINT,
  valor_pendente NUMERIC,
  faturas_pagas BIGINT,
  valor_recebido NUMERIC,
  faturas_atrasadas BIGINT,
  valor_atrasado NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total de faturas
    COUNT(*)::BIGINT AS total_faturas,
    COALESCE(SUM(f.valor), 0) AS valor_total,
    
    -- Faturas pendentes (não vencidas ainda)
    COUNT(*) FILTER (WHERE f.status = 'pendente' AND f.vencimento >= CURRENT_DATE)::BIGINT AS faturas_pendentes,
    COALESCE(SUM(f.valor) FILTER (WHERE f.status = 'pendente' AND f.vencimento >= CURRENT_DATE), 0) AS valor_pendente,
    
    -- Faturas pagas
    COUNT(*) FILTER (WHERE f.status = 'paga')::BIGINT AS faturas_pagas,
    COALESCE(SUM(f.pagamento_valor) FILTER (WHERE f.status = 'paga'), 0) AS valor_recebido,
    
    -- Faturas atrasadas (vencidas e não pagas)
    COUNT(*) FILTER (WHERE f.status IN ('pendente', 'atrasada') AND f.vencimento < CURRENT_DATE)::BIGINT AS faturas_atrasadas,
    COALESCE(SUM(f.valor) FILTER (WHERE f.status IN ('pendente', 'atrasada') AND f.vencimento < CURRENT_DATE), 0) AS valor_atrasado
    
  FROM faturas f
  WHERE f.administradora_id = p_administradora_id;
END;
$$ LANGUAGE plpgsql;

-- Comentário
COMMENT ON FUNCTION calcular_estatisticas_faturas(UUID) IS 'Calcula estatísticas financeiras de uma administradora';

-- Testar função
SELECT * FROM calcular_estatisticas_faturas('00000000-0000-0000-0000-000000000000');

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Funcao calcular_estatisticas_faturas criada com sucesso!';
END $$;
