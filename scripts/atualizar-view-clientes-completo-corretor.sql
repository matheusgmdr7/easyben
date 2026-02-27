-- Atualiza a view vw_clientes_administradoras_completo para incluir corretor_id e corretor_nome.
-- Execute APÓS criar a tabela corretores_administradora e adicionar clientes_administradoras.corretor_id.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes_administradoras' AND column_name = 'corretor_id')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'corretores_administradora') THEN

    DROP VIEW IF EXISTS vw_clientes_administradoras_completo;

    CREATE VIEW vw_clientes_administradoras_completo AS
    SELECT
      ca.id,
      ca.administradora_id,
      ca.proposta_id,
      ca.corretor_id,
      ca.numero_contrato,
      ca.data_vinculacao,
      ca.data_vencimento,
      ca.data_vigencia,
      ca.status,
      ca.valor_mensal,
      ca.dia_vencimento,
      ca.observacoes,
      a.nome AS administradora_nome,
      a.cnpj AS administradora_cnpj,
      co.nome AS corretor_nome,
      p.nome AS cliente_nome,
      p.email AS cliente_email,
      p.telefone AS cliente_telefone,
      p.cpf AS cliente_cpf,
      p.produto_nome,
      p.plano_nome,
      p.cobertura,
      p.acomodacao,
      COUNT(f.id) AS total_faturas,
      COUNT(f.id) FILTER (WHERE f.status = 'paga') AS faturas_pagas,
      COUNT(f.id) FILTER (WHERE f.status = 'atrasada') AS faturas_atrasadas,
      COUNT(f.id) FILTER (WHERE f.status = 'pendente') AS faturas_pendentes
    FROM clientes_administradoras ca
    JOIN administradoras a ON a.id = ca.administradora_id
    JOIN propostas p ON p.id = ca.proposta_id
    LEFT JOIN corretores_administradora co ON co.id = ca.corretor_id
    LEFT JOIN faturas f ON f.cliente_administradora_id = ca.id
    GROUP BY ca.id, a.id, a.nome, a.cnpj, co.id, co.nome, p.nome, p.email, p.telefone, p.cpf, p.produto_nome, p.plano_nome, p.cobertura, p.acomodacao;

    RAISE NOTICE 'View vw_clientes_administradoras_completo atualizada com corretor_id e corretor_nome';
  ELSE
    RAISE NOTICE 'Execute primeiro: criar-tabela-corretores-administradora.sql (tabela e coluna corretor_id)';
  END IF;
END $$;
