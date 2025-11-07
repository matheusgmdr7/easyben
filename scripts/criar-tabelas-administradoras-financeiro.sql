-- ============================================
-- SCRIPT DE CRIAÇÃO - SISTEMA DE ADMINISTRADORAS E FINANCEIRO
-- ============================================
-- Este script cria toda a estrutura necessária para:
-- 1. Cadastro de administradoras
-- 2. Gestão de clientes por administradora
-- 3. Sistema financeiro com faturas e pagamentos
-- 4. Integração com instituições financeiras
-- ============================================

-- ============================================
-- 1. TABELA DE ADMINISTRADORAS
-- ============================================
CREATE TABLE IF NOT EXISTS administradoras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa', 'suspensa')),
  
  -- Configurações financeiras
  dia_vencimento_padrao INTEGER DEFAULT 10 CHECK (dia_vencimento_padrao BETWEEN 1 AND 31),
  multa_atraso DECIMAL(5,2) DEFAULT 2.00,
  juros_mes DECIMAL(5,2) DEFAULT 1.00,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Observações
  observacoes TEXT
);

-- ============================================
-- 2. TABELA DE CONFIGURAÇÕES FINANCEIRAS DA ADMINISTRADORA
-- ============================================
CREATE TABLE IF NOT EXISTS administradoras_config_financeira (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  
  -- Dados da instituição financeira
  instituicao_financeira VARCHAR(100), -- 'asaas', 'pagarme', 'mercadopago', 'stripe', etc
  api_key TEXT, -- Chave da API (criptografada)
  api_token TEXT, -- Token adicional se necessário
  ambiente VARCHAR(20) DEFAULT 'producao' CHECK (ambiente IN ('sandbox', 'producao')),
  
  -- Status da integração
  status_integracao VARCHAR(20) DEFAULT 'inativa' CHECK (status_integracao IN ('ativa', 'inativa', 'erro', 'configurando')),
  ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
  mensagem_erro TEXT,
  
  -- Configurações adicionais (JSON para flexibilidade)
  configuracoes_adicionais JSONB DEFAULT '{}',
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(administradora_id)
);

-- ============================================
-- 3. TABELA DE CLIENTES VINCULADOS À ADMINISTRADORA
-- ============================================
CREATE TABLE IF NOT EXISTS clientes_administradoras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
  
  -- Dados do contrato
  numero_contrato VARCHAR(50),
  data_vinculacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_vencimento DATE NOT NULL,
  data_vigencia DATE NOT NULL,
  data_cancelamento TIMESTAMP WITH TIME ZONE,
  
  -- Status do cliente na administradora
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'inadimplente')),
  
  -- Valores
  valor_mensal DECIMAL(10,2) NOT NULL,
  dia_vencimento INTEGER DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 31),
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Observações
  observacoes TEXT,
  
  UNIQUE(administradora_id, proposta_id)
);

-- ============================================
-- 4. TABELA DE FATURAS
-- ============================================
CREATE TABLE IF NOT EXISTS faturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_administradora_id UUID NOT NULL REFERENCES clientes_administradoras(id) ON DELETE CASCADE,
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
  
  -- Identificação da fatura
  numero_fatura VARCHAR(50) UNIQUE,
  referencia VARCHAR(50), -- Ex: "01/2025" para faturas mensais
  
  -- Valores
  valor_original DECIMAL(10,2) NOT NULL,
  valor_desconto DECIMAL(10,2) DEFAULT 0.00,
  valor_acrescimo DECIMAL(10,2) DEFAULT 0.00,
  valor_multa DECIMAL(10,2) DEFAULT 0.00,
  valor_juros DECIMAL(10,2) DEFAULT 0.00,
  valor_total DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2) DEFAULT 0.00,
  
  -- Datas
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  data_cancelamento DATE,
  
  -- Status da fatura
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'atrasada', 'cancelada', 'parcialmente_paga')),
  
  -- Integração com gateway de pagamento
  gateway_id VARCHAR(100), -- ID da fatura no gateway (Asaas, PagSeguro, etc)
  gateway_nome VARCHAR(50), -- Nome do gateway
  boleto_url TEXT, -- URL do boleto
  boleto_codigo_barras TEXT, -- Código de barras do boleto
  boleto_linha_digitavel TEXT, -- Linha digitável do boleto
  pix_qrcode TEXT, -- QR Code PIX
  pix_qrcode_url TEXT, -- URL da imagem do QR Code
  pix_copia_cola TEXT, -- Código PIX copia e cola
  
  -- Forma de pagamento
  forma_pagamento VARCHAR(50), -- 'boleto', 'pix', 'cartao_credito', 'transferencia', 'dinheiro'
  
  -- Notificações
  notificacao_enviada BOOLEAN DEFAULT FALSE,
  data_ultima_notificacao TIMESTAMP WITH TIME ZONE,
  tentativas_notificacao INTEGER DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Observações
  observacoes TEXT
);

-- ============================================
-- 5. TABELA DE HISTÓRICO DE PAGAMENTOS
-- ============================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id UUID NOT NULL REFERENCES faturas(id) ON DELETE CASCADE,
  
  -- Dados do pagamento
  valor_pago DECIMAL(10,2) NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  forma_pagamento VARCHAR(50) NOT NULL,
  
  -- Dados da transação
  transacao_id VARCHAR(100), -- ID da transação no gateway
  comprovante_url TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'confirmado' CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'estornado')),
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Observações
  observacoes TEXT
);

-- ============================================
-- 6. TABELA DE LOG DE INTEGRAÇÃO FINANCEIRA
-- ============================================
CREATE TABLE IF NOT EXISTS logs_integracao_financeira (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  administradora_id UUID NOT NULL REFERENCES administradoras(id) ON DELETE CASCADE,
  
  -- Dados da requisição
  tipo_operacao VARCHAR(50) NOT NULL, -- 'gerar_fatura', 'consultar_pagamento', 'cancelar_fatura', etc
  endpoint VARCHAR(255),
  metodo VARCHAR(10), -- GET, POST, PUT, DELETE
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER,
  
  -- Status da operação
  sucesso BOOLEAN DEFAULT FALSE,
  mensagem_erro TEXT,
  
  -- Referências
  fatura_id UUID REFERENCES faturas(id) ON DELETE SET NULL,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duracao_ms INTEGER -- Duração da requisição em milissegundos
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Administradoras
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras') THEN
    CREATE INDEX IF NOT EXISTS idx_administradoras_cnpj ON administradoras(cnpj);
    CREATE INDEX IF NOT EXISTS idx_administradoras_status ON administradoras(status);
    RAISE NOTICE '✅ Índices de administradoras criados';
  END IF;
END $$;

-- Clientes Administradoras
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras') THEN
    CREATE INDEX IF NOT EXISTS idx_clientes_adm_administradora ON clientes_administradoras(administradora_id);
    CREATE INDEX IF NOT EXISTS idx_clientes_adm_proposta ON clientes_administradoras(proposta_id);
    CREATE INDEX IF NOT EXISTS idx_clientes_adm_status ON clientes_administradoras(status);
    RAISE NOTICE '✅ Índices de clientes_administradoras criados';
  END IF;
END $$;

-- Faturas
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faturas') THEN
    CREATE INDEX IF NOT EXISTS idx_faturas_cliente_adm ON faturas(cliente_administradora_id);
    CREATE INDEX IF NOT EXISTS idx_faturas_administradora ON faturas(administradora_id);
    CREATE INDEX IF NOT EXISTS idx_faturas_proposta ON faturas(proposta_id);
    CREATE INDEX IF NOT EXISTS idx_faturas_status ON faturas(status);
    CREATE INDEX IF NOT EXISTS idx_faturas_vencimento ON faturas(data_vencimento);
    CREATE INDEX IF NOT EXISTS idx_faturas_gateway ON faturas(gateway_id);
    RAISE NOTICE '✅ Índices de faturas criados';
  END IF;
END $$;

-- Pagamentos
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pagamentos') THEN
    CREATE INDEX IF NOT EXISTS idx_pagamentos_fatura ON pagamentos(fatura_id);
    CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON pagamentos(data_pagamento);
    RAISE NOTICE '✅ Índices de pagamentos criados';
  END IF;
END $$;

-- Logs
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logs_integracao_financeira') THEN
    CREATE INDEX IF NOT EXISTS idx_logs_administradora ON logs_integracao_financeira(administradora_id);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON logs_integracao_financeira(created_at);
    RAISE NOTICE '✅ Índices de logs criados';
  END IF;
END $$;

-- ============================================
-- TRIGGERS PARA UPDATE AUTOMÁTICO
-- ============================================

-- Trigger para updated_at nas administradoras
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers apenas se as tabelas existirem
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras') THEN
    DROP TRIGGER IF EXISTS update_administradoras_updated_at ON administradoras;
    CREATE TRIGGER update_administradoras_updated_at 
        BEFORE UPDATE ON administradoras 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ Trigger de administradoras criado';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras') THEN
    DROP TRIGGER IF EXISTS update_clientes_administradoras_updated_at ON clientes_administradoras;
    CREATE TRIGGER update_clientes_administradoras_updated_at 
        BEFORE UPDATE ON clientes_administradoras 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ Trigger de clientes_administradoras criado';
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faturas') THEN
    DROP TRIGGER IF EXISTS update_faturas_updated_at ON faturas;
    CREATE TRIGGER update_faturas_updated_at 
        BEFORE UPDATE ON faturas 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ Trigger de faturas criado';
  END IF;
END $$;

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View para dashboard financeiro (apenas se as tabelas existirem)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faturas') THEN
    
    DROP VIEW IF EXISTS vw_dashboard_financeiro;
    
    EXECUTE 'CREATE OR REPLACE VIEW vw_dashboard_financeiro AS
SELECT 
  a.id as administradora_id,
  a.nome as administradora_nome,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.status = 'ativo') as clientes_ativos,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.status = 'inadimplente') as clientes_inadimplentes,
  COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'pendente') as faturas_pendentes,
  COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'atrasada') as faturas_atrasadas,
  COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'paga') as faturas_pagas,
  SUM(f.valor_total) FILTER (WHERE f.status IN ('pendente', 'atrasada')) as valor_em_aberto,
  SUM(f.valor_pago) FILTER (WHERE f.status = 'paga' AND DATE_TRUNC('month', f.data_pagamento) = DATE_TRUNC('month', CURRENT_DATE)) as valor_recebido_mes,
  SUM(f.valor_total) FILTER (WHERE f.status = 'atrasada') as valor_atrasado
FROM administradoras a
LEFT JOIN clientes_administradoras ca ON ca.administradora_id = a.id
LEFT JOIN faturas f ON f.administradora_id = a.id
WHERE a.status = ''ativa''
GROUP BY a.id, a.nome';
    
    RAISE NOTICE '✅ View vw_dashboard_financeiro criada';
  END IF;
END $$;

-- View para listagem de clientes com dados completos
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faturas') THEN
    
    DROP VIEW IF EXISTS vw_clientes_administradoras_completo;
    
    EXECUTE 'CREATE OR REPLACE VIEW vw_clientes_administradoras_completo AS
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
GROUP BY ca.id, a.id, a.nome, a.cnpj, p.nome, p.email, p.telefone, p.cpf, p.produto_nome, p.plano_nome, p.cobertura, p.acomodacao';
    
    RAISE NOTICE '✅ View vw_clientes_administradoras_completo criada';
  END IF;
END $$;

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE administradoras IS 'Cadastro de administradoras de planos de saúde';
COMMENT ON TABLE administradoras_config_financeira IS 'Configurações de integração financeira por administradora';
COMMENT ON TABLE clientes_administradoras IS 'Vinculação de clientes (propostas) às administradoras';
COMMENT ON TABLE faturas IS 'Faturas geradas para os clientes';
COMMENT ON TABLE pagamentos IS 'Histórico de pagamentos realizados';
COMMENT ON TABLE logs_integracao_financeira IS 'Log de todas as integrações com gateways de pagamento';

-- ============================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE administradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE administradoras_config_financeira ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_administradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_integracao_financeira ENABLE ROW LEVEL SECURITY;

-- Políticas para administradores (usuários com role admin)
CREATE POLICY "Admins podem ver todas as administradoras" 
  ON administradoras FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem inserir administradoras" 
  ON administradoras FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem atualizar administradoras" 
  ON administradoras FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.user_id = auth.uid()
    )
  );

-- Replicar políticas semelhantes para outras tabelas
CREATE POLICY "Admins acesso total config financeira" 
  ON administradoras_config_financeira FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins acesso total clientes administradoras" 
  ON clientes_administradoras FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins acesso total faturas" 
  ON faturas FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins acesso total pagamentos" 
  ON pagamentos FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins acesso total logs" 
  ON logs_integracao_financeira FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_admin 
      WHERE usuarios_admin.user_id = auth.uid()
    )
  );

-- ============================================
-- DADOS DE EXEMPLO (OPCIONAL - COMENTADO)
-- ============================================

-- INSERT INTO administradoras (nome, cnpj, email, telefone, status) VALUES
-- ('Administradora Exemplo Ltda', '00.000.000/0001-00', 'contato@exemplo.com.br', '(11) 98888-8888', 'ativa');

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Mensagem de sucesso
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Script executado com sucesso!';
  RAISE NOTICE '📊 Tabelas criadas: administradoras, administradoras_config_financeira, clientes_administradoras, faturas, pagamentos, logs_integracao_financeira';
  RAISE NOTICE '🔍 Views criadas: vw_dashboard_financeiro, vw_clientes_administradoras_completo';
  RAISE NOTICE '🔒 Políticas RLS configuradas';
END $$;
