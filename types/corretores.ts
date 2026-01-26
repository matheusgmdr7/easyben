export interface Corretor {
  id: string
  nome: string
  email: string
  telefone?: string
  cpf?: string
  data_nascimento?: string
  whatsapp?: string
  estado?: string
  cidade?: string
  status?: string
  ativo: boolean
  gestor_id?: string | null
  is_gestor?: boolean
  link_cadastro_equipe?: string | null
  acesso_portal_gestor?: boolean
  // Campos empresariais
  razao_social?: string | null
  nome_fantasia?: string | null
  // Campos financeiros
  cnpj?: string | null
  chave_pix?: string | null
  tipo_chave_pix?: string | null
  banco?: string | null
  agencia?: string | null
  conta?: string | null
  tipo_conta?: string | null
  nome_titular_conta?: string | null
  cpf_cnpj_titular_conta?: string | null
  created_at?: string
  updated_at?: string
}

export interface Comissao {
  id: string
  corretor_id: string
  proposta_id?: string
  valor: number
  percentual?: string | null
  data: string
  status: "pendente" | "pago"
  data_pagamento?: string
  created_at: string
  descricao?: string
  data_prevista?: string
  corretor?: {
    id: string
    nome: string
    email: string
  }
}

export interface ResumoComissoes {
  total?: number
  pagas?: number
  pendentes?: number
  total_corretores?: number
  totalPendente?: number
  totalPago?: number
  porMes?: Record<string, number>
}
