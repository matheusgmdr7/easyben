import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export interface DashboardStats {
  propostasEnviadas: number
  comissoesTotais: number
  comissoesPendentes: number
  clientesAtivos: number
  ultimasPropostas: UltimaProposta[]
  ultimasComissoes: UltimaComissao[]
}

export interface UltimaProposta {
  id: string
  nomeCliente: string
  nomeProduto: string
  dataCriacao: string
  status: string
}

export interface UltimaComissao {
  id: string
  nomeCliente: string
  nomeProduto: string
  valor: number
  dataPagamento: string
}

export async function buscarDadosDashboardCorretor(corretorId: string): Promise<DashboardStats> {
  try {
    if (!corretorId) {
      throw new Error("ID do corretor não fornecido")
    }

    console.log("Buscando dados do dashboard para o corretor:", corretorId)

    const tenantId = await getCurrentTenantId()

    // 1. Buscar todas as propostas do corretor, filtrando por tenant
    const { data: propostas, error: propostasError } = await supabase
      .from("propostas_corretores")
      .select("*, produto:produto_id(*)")
      .eq("corretor_id", corretorId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (propostasError) {
      console.error("Erro ao buscar propostas:", propostasError)
      throw new Error(`Erro ao buscar propostas: ${propostasError.message}`)
    }

    // 2. Buscar comissões do corretor, filtrando por tenant
    const { data: comissoes, error: comissoesError } = await supabase
      .from("comissoes")
      .select("*, proposta:proposta_id(*, produto:produto_id(*))")
      .eq("corretor_id", corretorId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (comissoesError) {
      console.error("Erro ao buscar comissões:", comissoesError)
      throw new Error(`Erro ao buscar comissões: ${comissoesError.message}`)
    }

    // 3. Calcular estatísticas
    const propostasEnviadas = propostas?.length || 0

    // 4. Calcular comissões totais
    const comissoesTotais =
      comissoes?.reduce((total, comissao) => {
        return total + (comissao.valor || 0)
      }, 0) || 0

    // 5. Calcular comissões pendentes (propostas aprovadas sem comissão)
    const propostasAprovadas = propostas?.filter((p) => p.status === "aprovada") || []
    const propostasComComissao = comissoes?.map((c) => c.proposta_id) || []

    const propostasSemComissao = propostasAprovadas.filter((p) => !propostasComComissao.includes(p.id))

    const comissoesPendentes = propostasSemComissao.reduce((total, proposta) => {
      // Calcular valor estimado da comissão (10% do valor da proposta)
      const valorProposta = proposta.valor_proposta || 0
      return total + valorProposta * 0.1
    }, 0)

    // 6. Calcular clientes ativos (clientes únicos com propostas)
    const clientesUnicos = new Set()
    propostas?.forEach((proposta) => {
      if (proposta.email_cliente) {
        clientesUnicos.add(proposta.email_cliente)
      }
    })

    const clientesAtivos = clientesUnicos.size

    // 7. Formatar últimas propostas
    const ultimasPropostas: UltimaProposta[] = (propostas || []).slice(0, 3).map((proposta) => ({
      id: proposta.id,
      nomeCliente: proposta.nome_cliente || "Cliente sem nome",
      nomeProduto: proposta.produto?.nome || "Produto não especificado",
      dataCriacao: new Date(proposta.created_at).toLocaleDateString(),
      status: proposta.status,
    }))

    // 8. Formatar últimas comissões
    const ultimasComissoes: UltimaComissao[] = (comissoes || []).slice(0, 3).map((comissao) => ({
      id: comissao.id,
      nomeCliente: comissao.proposta?.nome_cliente || "Cliente sem nome",
      nomeProduto: comissao.proposta?.produto?.nome || "Produto não especificado",
      valor: comissao.valor || 0,
      dataPagamento: new Date(comissao.data_pagamento || comissao.created_at).toLocaleDateString(),
    }))

    return {
      propostasEnviadas,
      comissoesTotais,
      comissoesPendentes,
      clientesAtivos,
      ultimasPropostas,
      ultimasComissoes,
    }
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error)
    throw error
  }
}
