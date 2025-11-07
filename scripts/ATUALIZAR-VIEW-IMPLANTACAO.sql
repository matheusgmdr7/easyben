-- ============================================
-- ATUALIZAR VIEW COM CAMPOS DE IMPLANTAÇÃO
-- ============================================
-- Este script atualiza a view vw_clientes_administradoras_completo
-- para incluir os novos campos de implantação
-- ============================================

BEGIN;

-- Atualizar view para incluir numero_carteirinha e implantado
DROP VIEW IF EXISTS vw_clientes_administradoras_completo;

CREATE OR REPLACE VIEW vw_clientes_administradoras_completo AS
SELECT 
  ca.id,
  ca.administradora_id,
  ca.proposta_id,
  ca.numero_contrato,
  ca.data_vinculacao,
  ca.data_vencimento,
  ca.data_vigencia,
  ca.status,
  ca.valor_mensal,
  ca.dia_vencimento,
  ca.observacoes,
  ca.numero_carteirinha,
  ca.implantado,
  a.nome as administradora_nome,
  a.cnpj as administradora_cnpj,
  p.nome as cliente_nome,
  p.email as cliente_email,
  p.telefone as cliente_telefone,
  p.cpf as cliente_cpf,
  p.produto_nome,
  p.plano_nome,
  p.cobertura,
  p.acomodacao,
  COUNT(f.id) as total_faturas,
  COUNT(f.id) FILTER (WHERE f.status = 'paga') as faturas_pagas,
  COUNT(f.id) FILTER (WHERE f.status = 'atrasada') as faturas_atrasadas,
  COUNT(f.id) FILTER (WHERE f.status = 'pendente') as faturas_pendentes
FROM clientes_administradoras ca
JOIN administradoras a ON a.id = ca.administradora_id
JOIN propostas p ON p.id = ca.proposta_id
LEFT JOIN faturas f ON f.cliente_administradora_id = ca.id
GROUP BY 
  ca.id, 
  a.id, 
  a.nome, 
  a.cnpj, 
  p.nome, 
  p.email, 
  p.telefone, 
  p.cpf, 
  p.produto_nome, 
  p.plano_nome, 
  p.cobertura, 
  p.acomodacao;

COMMIT;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute esta query para verificar se a view foi atualizada:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'vw_clientes_administradoras_completo'
-- AND column_name IN ('numero_carteirinha', 'implantado');
-- ============================================

