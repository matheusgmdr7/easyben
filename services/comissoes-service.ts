import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import type { Comissao, ResumoComissoes, Corretor } from "@/types/corretores"

/**
 * Busca todas as comissões (para admin)
 * @returns Array de todas as comissões
 */
export async function buscarComissoes(): Promise<Comissao[]> {
  try {
    console.log("🔄 Buscando todas as comissões...")

    // Verificar se estamos em ambiente de desenvolvimento
    if (process.env.NODE_ENV === "development" || (typeof window !== 'undefined' && window.location.hostname === "localhost")) {
      console.log("Usando dados fictícios para todas as comissões")
      return gerarTodasComissoesFicticias()
    }

    const tenantId = await getCurrentTenantId()

    // Buscar todas as comissões no banco de dados, filtrando por tenant
    const { data, error } = await supabase
      .from("comissoes")
      .select(`
        *,
        corretores (
          id,
          nome,
          email
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Erro ao buscar comissões:", error)
      throw new Error(`Erro ao buscar comissões: ${error.message}`)
    }

    console.log(`✅ Comissões carregadas: ${data?.length || 0}`)
    return data || []
  } catch (error) {
    console.error("❌ Erro ao buscar comissões:", error)

    // Em ambiente de desenvolvimento, retornar dados fictícios em caso de erro
    if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
      console.log("Usando dados fictícios como fallback")
      return gerarTodasComissoesFicticias()
    }

    throw error
  }
}

/**
 * Busca resumo das comissões (para admin)
 * @returns Resumo das comissões
 */
export async function buscarResumoComissoes(): Promise<ResumoComissoes> {
  try {
    console.log("🔄 Buscando resumo das comissões...")

    // Verificar se estamos em ambiente de desenvolvimento
    if (process.env.NODE_ENV === "development" || (typeof window !== 'undefined' && window.location.hostname === "localhost")) {
      console.log("Usando dados fictícios para resumo")
      return gerarResumoFicticio()
    }

    const tenantId = await getCurrentTenantId()

    // Buscar dados para o resumo, filtrando por tenant
    const { data, error } = await supabase
      .from("comissoes")
      .select("valor, status, created_at, corretor_id")
      .eq("tenant_id", tenantId)

    if (error) {
      console.error("❌ Erro ao buscar resumo:", error)
      throw new Error(`Erro ao buscar resumo: ${error.message}`)
    }

    // Calcular resumo
    const resumo = {
      total: 0,
      pagas: 0,
      pendentes: 0,
      total_corretores: 0,
    }

    const corretoresUnicos = new Set()

    data?.forEach((comissao) => {
      const valor = Number(comissao.valor) || 0
      resumo.total += valor

      if (comissao.status === "pago") {
        resumo.pagas += valor
      } else if (comissao.status === "pendente") {
        resumo.pendentes += valor
      }

      if (comissao.corretor_id) {
        corretoresUnicos.add(comissao.corretor_id)
      }
    })

    resumo.total_corretores = corretoresUnicos.size

    console.log("✅ Resumo calculado:", resumo)
    return resumo
  } catch (error) {
    console.error("❌ Erro ao buscar resumo:", error)

    // Em ambiente de desenvolvimento, retornar dados fictícios em caso de erro
    if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
      console.log("Usando resumo fictício como fallback")
      return gerarResumoFicticio()
    }

    throw error
  }
}

/**
 * Busca todos os corretores
 * @returns Array de corretores
 */
export async function buscarCorretores(): Promise<Corretor[]> {
  try {
    console.log("🔄 Buscando corretores...")

    // Verificar se estamos em ambiente de desenvolvimento
    if (process.env.NODE_ENV === "development" || (typeof window !== 'undefined' && window.location.hostname === "localhost")) {
      console.log("Usando dados fictícios para corretores")
      return gerarCorretoresFicticios()
    }

    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabase
      .from("corretores")
      .select("id, nome, email, telefone, ativo")
      .eq("ativo", true)
      .eq("tenant_id", tenantId)
      .order("nome")

    if (error) {
      console.error("❌ Erro ao buscar corretores:", error)
      throw new Error(`Erro ao buscar corretores: ${error.message}`)
    }

    console.log(`✅ Corretores carregados: ${data?.length || 0}`)
    return data || []
  } catch (error) {
    console.error("❌ Erro ao buscar corretores:", error)

    // Em ambiente de desenvolvimento, retornar dados fictícios em caso de erro
    if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
      console.log("Usando corretores fictícios como fallback")
      return gerarCorretoresFicticios()
    }

    throw error
  }
}

/**
 * Cria uma nova comissão manual
 * @param dadosComissao Dados da nova comissão
 * @returns Comissão criada
 */
export async function criarComissaoManual(dadosComissao: {
  corretor_id: string
  descricao: string
  valor: number
  percentual?: number | null
  data_prevista?: string
}): Promise<Comissao> {
  try {
    console.log("🔄 Criando nova comissão manual...")

    // Verificar se estamos em ambiente de desenvolvimento
    if (process.env.NODE_ENV === "development" || (typeof window !== 'undefined' && window.location.hostname === "localhost")) {
      console.log("Simulando criação de comissão em desenvolvimento")

      // Simular criação bem-sucedida
      const novaComissao: Comissao = {
        id: `com-manual-${Date.now()}`,
        corretor_id: dadosComissao.corretor_id,
        descricao: dadosComissao.descricao,
        valor: dadosComissao.valor,
        percentual: dadosComissao.percentual?.toString() || null,
        status: "pendente",
        data_prevista: dadosComissao.data_prevista || new Date().toISOString(),
        created_at: new Date().toISOString(),
        data: new Date().toISOString(),
        corretor: {
          id: dadosComissao.corretor_id,
          nome: "Corretor Teste",
          email: "corretor@teste.com",
        },
      }

      console.log("✅ Comissão manual criada (simulação):", novaComissao)
      return novaComissao
    }

    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabase
      .from("comissoes")
      .insert({
        corretor_id: dadosComissao.corretor_id,
        descricao: dadosComissao.descricao,
        valor: dadosComissao.valor,
        percentual: dadosComissao.percentual,
        data_prevista: dadosComissao.data_prevista,
        status: "pendente",
        tipo: "manual",
        tenant_id: tenantId, // Adicionar tenant_id automaticamente
      })
      .select(`
        *,
        corretores (
          id,
          nome,
          email
        )
      `)
      .single()

    if (error) {
      console.error("❌ Erro ao criar comissão manual:", error)
      throw new Error(`Erro ao criar comissão: ${error.message}`)
    }

    console.log("✅ Comissão manual criada:", data)
    return data
  } catch (error) {
    console.error("❌ Erro ao criar comissão manual:", error)
    throw error
  }
}

/**
 * Atualiza o status de uma comissão
 * @param comissaoId ID da comissão
 * @param dadosAtualizacao Dados para atualização
 * @returns Comissão atualizada
 */
export async function atualizarStatusComissao(
  comissaoId: string,
  dadosAtualizacao: {
    status: string
    data_pagamento?: string
  },
): Promise<Comissao> {
  try {
    console.log("🔄 Atualizando status da comissão:", comissaoId)

    // Verificar se estamos em ambiente de desenvolvimento
    if (process.env.NODE_ENV === "development" || (typeof window !== 'undefined' && window.location.hostname === "localhost")) {
      console.log("Simulando atualização de status em desenvolvimento")

      // Simular atualização bem-sucedida
      const comissaoAtualizada: Comissao = {
        id: comissaoId,
        corretor_id: "dev-123",
        descricao: "Comissão atualizada",
        valor: 250,
        status: dadosAtualizacao.status,
        data_pagamento: dadosAtualizacao.data_pagamento,
        created_at: new Date().toISOString(),
        data: new Date().toISOString(),
        data_prevista: new Date().toISOString(),
        corretor: {
          id: "dev-123",
          nome: "Corretor Teste",
          email: "corretor@teste.com",
        },
      }

      console.log("✅ Status atualizado (simulação):", comissaoAtualizada)
      return comissaoAtualizada
    }

    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabase
      .from("comissoes")
      .update(dadosAtualizacao)
      .eq("id", comissaoId)
      .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto
      .select(`
        *,
        corretores (
          id,
          nome,
          email
        )
      `)
      .single()

    if (error) {
      console.error("❌ Erro ao atualizar status:", error)
      throw new Error(`Erro ao atualizar status: ${error.message}`)
    }

    console.log("✅ Status da comissão atualizado:", data)
    return data
  } catch (error) {
    console.error("❌ Erro ao atualizar status da comissão:", error)
    throw error
  }
}

/**
 * Busca todas as comissões de um corretor específico
 * @param corretorId ID do corretor
 * @returns Array de comissões do corretor
 */
export async function buscarComissoesPorCorretor(corretorId: string): Promise<Comissao[]> {
  try {
    // Verificar se estamos em ambiente de desenvolvimento com corretor fictício
    if (
      corretorId === "dev-123" &&
      (process.env.NODE_ENV === "development" || (typeof window !== 'undefined' && window.location.hostname === "localhost"))
    ) {
      console.log("Usando dados fictícios para comissões do corretor")
      return gerarComissoesFicticias()
    }

    const tenantId = await getCurrentTenantId()

    // Buscar comissões do corretor no banco de dados, filtrando por tenant
    const { data, error } = await supabase
      .from("comissoes")
      .select(`
        *,
        corretores (*),
        propostas_corretores (*)
      `)
      .eq("corretor_id", corretorId)
      .eq("tenant_id", tenantId)
      .order("data", { ascending: false })

    if (error) {
      console.error("Erro ao buscar comissões do corretor:", error)
      throw new Error(`Erro ao buscar comissões: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error("Erro ao buscar comissões do corretor:", error)

    // Em ambiente de desenvolvimento, retornar dados fictícios em caso de erro
    if (process.env.NODE_ENV === "development" || (typeof window !== 'undefined' && window.location.hostname === "localhost")) {
      console.log("Usando dados fictícios como fallback para comissões")
      return gerarComissoesFicticias()
    }

    throw error
  }
}

/**
 * Gera todas as comissões fictícias para desenvolvimento (admin)
 * @returns Array de comissões fictícias de todos os corretores
 */
function gerarTodasComissoesFicticias(): Comissao[] {
  const statusOptions = ["pendente", "pago"]
  const descricoes = [
    "Comissão Plano de Saúde Individual",
    "Comissão Plano Familiar",
    "Comissão Plano Empresarial",
    "Comissão Plano Odontológico",
    "Comissão Seguro de Vida",
    "Comissão Plano Dental",
  ]

  const corretores = [
    { id: "cor-1", nome: "João Silva", email: "joao@exemplo.com" },
    { id: "cor-2", nome: "Maria Santos", email: "maria@exemplo.com" },
    { id: "cor-3", nome: "Pedro Oliveira", email: "pedro@exemplo.com" },
    { id: "cor-4", nome: "Ana Costa", email: "ana@exemplo.com" },
  ]

  return Array.from({ length: 50 }, (_, i) => {
    const corretor = corretores[i % corretores.length]
    const status = statusOptions[i % statusOptions.length]

    return {
      id: `com-${i}`,
      corretor_id: corretor.id,
      proposta_id: `prop-${i}`,
      valor: Math.floor(100 + Math.random() * 800),
      percentual: `${Math.floor(5 + Math.random() * 15)}%`,
      data: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000).toISOString(),
      status: status,
      data_pagamento:
        status === "pago"
          ? new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000).toISOString(),
      descricao: descricoes[i % descricoes.length],
      data_prevista: new Date(Date.now() + Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString(),
      corretor: corretor,
    }
  })
}

/**
 * Gera comissões fictícias para desenvolvimento (corretor específico)
 * @returns Array de comissões fictícias
 */
function gerarComissoesFicticias(): Comissao[] {
  const statusOptions = ["pendente", "pago"]
  const descricoes = [
    "Comissão Plano de Saúde Individual",
    "Comissão Plano Familiar",
    "Comissão Plano Empresarial",
    "Comissão Plano Odontológico",
  ]

  return Array.from({ length: 20 }, (_, i) => ({
    id: `com-${i}`,
    corretor_id: "dev-123",
    proposta_id: `prop-${i}`,
    valor: Math.floor(100 + Math.random() * 500),
    percentual: `${Math.floor(5 + Math.random() * 15)}%`,
    data: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString(),
    status: statusOptions[i % statusOptions.length],
    data_pagamento:
      statusOptions[i % statusOptions.length] === "pago"
        ? new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    created_at: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString(),
    descricao: descricoes[i % descricoes.length],
    data_prevista: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
  }))
}

/**
 * Gera resumo fictício para desenvolvimento
 * @returns Resumo fictício
 */
function gerarResumoFicticio(): ResumoComissoes {
  return {
    total: 25000,
    pagas: 15000,
    pendentes: 10000,
    total_corretores: 4,
  }
}

/**
 * Gera corretores fictícios para desenvolvimento
 * @returns Array de corretores fictícios
 */
function gerarCorretoresFicticios(): Corretor[] {
  return [
    {
      id: "cor-1",
      nome: "João Silva",
      email: "joao@exemplo.com",
      telefone: "(11) 99999-1111",
      ativo: true,
    },
    {
      id: "cor-2",
      nome: "Maria Santos",
      email: "maria@exemplo.com",
      telefone: "(11) 99999-2222",
      ativo: true,
    },
    {
      id: "cor-3",
      nome: "Pedro Oliveira",
      email: "pedro@exemplo.com",
      telefone: "(11) 99999-3333",
      ativo: true,
    },
    {
      id: "cor-4",
      nome: "Ana Costa",
      email: "ana@exemplo.com",
      telefone: "(11) 99999-4444",
      ativo: true,
    },
  ]
}

/**
 * Calcula o resumo das comissões de um corretor
 * @param comissoes Array de comissões do corretor
 * @returns Resumo das comissões
 */
export function calcularResumoComissoes(comissoes: Comissao[]): ResumoComissoes {
  const resumo: ResumoComissoes = {
    totalPendente: 0,
    totalPago: 0,
    porMes: {},
  }

  comissoes.forEach((comissao) => {
    const valor = Number(comissao.valor) || 0

    // Calcular totais por status
    if (comissao.status === "pendente") {
      resumo.totalPendente += valor
    } else if (comissao.status === "pago") {
      resumo.totalPago += valor
    }

    // Calcular totais por mês
    const data = new Date(comissao.data || comissao.created_at)
    const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`

    if (!resumo.porMes[mesAno]) {
      resumo.porMes[mesAno] = 0
    }

    resumo.porMes[mesAno] += valor
  })

  return resumo
}

/**
 * Busca uma comissão específica pelo ID
 * @param comissaoId ID da comissão
 * @returns Dados da comissão ou null se não encontrada
 */
export async function buscarComissaoPorId(comissaoId: string): Promise<Comissao | null> {
  try {
    // Verificar se estamos em ambiente de desenvolvimento com ID fictício
    if (
      comissaoId.startsWith("com-") &&
      (process.env.NODE_ENV === "development" || (typeof window !== 'undefined' && window.location.hostname === "localhost"))
    ) {
      console.log("Usando dados fictícios para comissão específica")

      // Retornar uma comissão fictícia específica
      const index = Number.parseInt(comissaoId.replace("com-", ""))
      const comissoes = gerarComissoesFicticias()
      return comissoes[index % comissoes.length] || null
    }

    const tenantId = await getCurrentTenantId()

    const { data, error } = await supabase
      .from("comissoes")
      .select(`
        *,
        corretores (*),
        propostas_corretores (*)
      `)
      .eq("id", comissaoId)
      .eq("tenant_id", tenantId)
      .single()

    if (error) {
      console.error("Erro ao buscar comissão por ID:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Erro ao buscar comissão por ID:", error)
    return null
  }
}
