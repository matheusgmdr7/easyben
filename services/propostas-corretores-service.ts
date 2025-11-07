import { supabase } from "@/lib/supabase"

/**
 * Busca todas as propostas de um corretor específico
 * @param corretorId ID do corretor
 * @returns Array de propostas do corretor
 */
export async function buscarPropostasPorCorretor(corretorId: string): Promise<any[]> {
  try {
    // Verificar se estamos em ambiente de desenvolvimento com corretor fictício
    if (
      corretorId === "dev-123" &&
      (process.env.NODE_ENV === "development" || window.location.hostname === "localhost")
    ) {
      console.log("Usando dados fictícios para propostas do corretor")

      // Retornar dados fictícios para desenvolvimento
      return gerarPropostasFicticias()
    }

    // Buscar propostas do corretor na tabela unificada 'propostas'
    const { data, error } = await supabase
      .from("propostas")
      .select(`
        id,
        corretor_id,
        corretor_nome,
        nome_titular,
        email_titular,
        whatsapp_titular,
        plano_nome,
        status,
        valor_proposta,
        data,
        created_at,
        operadora_nome
      `)
      .eq("corretor_id", corretorId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar propostas do corretor:", error)
      throw new Error(`Erro ao buscar propostas: ${error.message}`)
    }

    // Transformar os dados para o formato esperado pelo dashboard
    const propostasFormatadas = (data || []).map(proposta => ({
      id: proposta.id,
      corretor_id: proposta.corretor_id,
      corretor_nome: proposta.corretor_nome,
      cliente: proposta.nome_titular,
      email_cliente: proposta.email_titular,
      whatsapp_cliente: proposta.whatsapp_titular,
      produto: proposta.plano_nome,
      status: proposta.status,
      valor: proposta.valor_proposta,
      data: proposta.data,
      created_at: proposta.created_at,
      produto_nome: proposta.operadora_nome,
      plano_nome: proposta.plano_nome,
      valor_proposta: proposta.valor_proposta,
      comissao: Math.floor(proposta.valor_proposta * 0.1), // Calcular comissão (10% do valor)
    }))

    return propostasFormatadas
  } catch (error) {
    console.error("Erro ao buscar propostas do corretor:", error)

    // Em ambiente de desenvolvimento, retornar dados fictícios em caso de erro
    if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
      console.log("Usando dados fictícios como fallback para propostas")
      return gerarPropostasFicticias()
    }

    throw error
  }
}

/**
 * Gera propostas fictícias para desenvolvimento
 * @returns Array de propostas fictícias
 */
function gerarPropostasFicticias(): any[] {
  const statusOptions = ["pendente", "aprovada", "rejeitada"]
  const produtos = ["Plano de Saúde Individual", "Plano Familiar", "Plano Empresarial", "Plano Odontológico"]

  return Array.from({ length: 15 }, (_, i) => ({
    id: `prop-${i}`,
    corretor_id: "dev-123",
    cliente: `Cliente Teste ${i + 1}`,
    email_cliente: `cliente${i + 1}@exemplo.com`,
    whatsapp_cliente: `119${Math.floor(10000000 + Math.random() * 90000000)}`,
    produto: produtos[i % produtos.length],
    status: statusOptions[i % statusOptions.length],
    valor: Math.floor(500 + Math.random() * 1500),
    comissao: Math.floor(50 + Math.random() * 300),
    data: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString(),
    produto_nome: produtos[i % produtos.length],
    plano_nome: `${produtos[i % produtos.length]} ${i % 3 === 0 ? "Premium" : i % 3 === 1 ? "Standard" : "Básico"}`,
    valor_proposta: Math.floor(500 + Math.random() * 1500),
  }))
}

/**
 * Busca uma proposta específica pelo ID
 * @param propostaId ID da proposta
 * @returns Dados da proposta ou null se não encontrada
 */
export async function buscarPropostaPorId(propostaId: string): Promise<any | null> {
  try {
    // Verificar se estamos em ambiente de desenvolvimento com ID fictício
    if (
      propostaId.startsWith("prop-") &&
      (process.env.NODE_ENV === "development" || window.location.hostname === "localhost")
    ) {
      console.log("Usando dados fictícios para proposta específica")

      // Retornar uma proposta fictícia específica
      const index = Number.parseInt(propostaId.replace("prop-", ""))
      const propostas = gerarPropostasFicticias()
      return propostas[index % propostas.length] || null
    }

    const { data, error } = await supabase
      .from("propostas")
      .select(`
        id,
        corretor_id,
        corretor_nome,
        nome_titular,
        email_titular,
        whatsapp_titular,
        plano_nome,
        status,
        valor_proposta,
        data,
        created_at,
        operadora_nome
      `)
      .eq("id", propostaId)
      .single()

    if (error) {
      console.error("Erro ao buscar proposta por ID:", error)
      return null
    }

    // Transformar os dados para o formato esperado
    if (data) {
      return {
        id: data.id,
        corretor_id: data.corretor_id,
        corretor_nome: data.corretor_nome,
        cliente: data.nome_titular,
        email_cliente: data.email_titular,
        whatsapp_cliente: data.whatsapp_titular,
        produto: data.plano_nome,
        status: data.status,
        valor: data.valor_proposta,
        data: data.data,
        created_at: data.created_at,
        produto_nome: data.operadora_nome,
        plano_nome: data.plano_nome,
        valor_proposta: data.valor_proposta,
        comissao: Math.floor(data.valor_proposta * 0.1),
      }
    }

    return data
  } catch (error) {
    console.error("Erro ao buscar proposta por ID:", error)
    return null
  }
}

/**
 * Cria uma nova proposta para um corretor
 * @param propostaData Dados da proposta a ser criada
 * @returns Dados da proposta criada
 */
export async function criarProposta(propostaData: Partial<any>): Promise<any> {
  try {
    const { data, error } = await supabase.from("propostas_corretores").insert([propostaData]).select().single()

    if (error) {
      console.error("Erro ao criar proposta:", error)
      throw new Error(`Erro ao criar proposta: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("Erro ao criar proposta:", error)
    throw error
  }
}

/**
 * Atualiza uma proposta existente
 * @param propostaId ID da proposta a ser atualizada
 * @param propostaData Dados atualizados da proposta
 * @returns Dados da proposta atualizada
 */
export async function atualizarProposta(
  propostaId: string,
  propostaData: Partial<any>,
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from("propostas_corretores")
      .update(propostaData)
      .eq("id", propostaId)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar proposta:", error)
      throw new Error(`Erro ao atualizar proposta: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("Erro ao atualizar proposta:", error)
    throw error
  }
}

/**
 * Exclui uma proposta
 * @param propostaId ID da proposta a ser excluída
 * @returns true se a exclusão foi bem-sucedida
 */
export async function excluirProposta(propostaId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("propostas_corretores").delete().eq("id", propostaId)

    if (error) {
      console.error("Erro ao excluir proposta:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Erro ao excluir proposta:", error)
    return false
  }
}

/**
 * Busca todas as propostas de corretores para o painel administrativo
 * @returns Array de todas as propostas de corretores
 */
export async function buscarPropostasCorretores(): Promise<any[]> {
  try {
    // Verificar se estamos em ambiente de desenvolvimento
    if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
      console.log("Usando dados fictícios para propostas de corretores")
      return gerarPropostasFicticias()
    }

    // Buscar todas as propostas de corretores no banco de dados
    const { data, error } = await supabase
      .from("propostas_corretores")
      .select(`
        *,
        corretores (*),
        documentos_propostas_corretores (*)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Erro ao buscar propostas de corretores:", error)
      throw new Error(`Erro ao buscar propostas: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error("Erro ao buscar propostas de corretores:", error)

    // Em ambiente de desenvolvimento, retornar dados fictícios em caso de erro
    if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
      console.log("Usando dados fictícios como fallback")
      return gerarPropostasFicticias()
    }

    throw error
  }
}

export async function buscarVendas(): Promise<any[]> {
  console.warn("⚠️ buscarVendas ainda não implementada. Retornando lista vazia.")
  return []
}

export async function buscarResumoVendas(): Promise<{ total: number; aprovadas: number; pendentes: number; rejeitadas: number }> {
  console.warn("⚠️ buscarResumoVendas ainda não implementada. Retornando valores padrão.")
  return {
    total: 0,
    aprovadas: 0,
    pendentes: 0,
    rejeitadas: 0,
  }
}

export async function buscarCorretoras(): Promise<any[]> {
  console.warn("⚠️ buscarCorretoras ainda não implementada. Retornando lista vazia.")
  return []
}

/**
 * Atualiza o status de uma proposta de corretor
 * @param propostaId ID da proposta
 * @param novoStatus Novo status da proposta
 * @param motivoRejeicao Motivo da rejeição (opcional)
 * @returns true se a atualização foi bem-sucedida
 */
export async function atualizarStatusPropostaCorretor(
  propostaId: string,
  novoStatus: string,
  motivoRejeicao?: string,
): Promise<boolean> {
  try {
    // Verificar se estamos em ambiente de desenvolvimento com ID fictício
    if (
      propostaId.startsWith("prop-") &&
      (process.env.NODE_ENV === "development" || window.location.hostname === "localhost")
    ) {
      console.log(`Simulando atualização de status para ${novoStatus}`)
      return true
    }

    const updateData: any = {
      status: novoStatus,
      updated_at: new Date().toISOString(),
    }

    if (motivoRejeicao) {
      updateData.motivo_rejeicao = motivoRejeicao
    }

    const { error } = await supabase.from("propostas_corretores").update(updateData).eq("id", propostaId)

    if (error) {
      console.error("Erro ao atualizar status da proposta:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Erro ao atualizar status da proposta:", error)
    return false
  }
}
