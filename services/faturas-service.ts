import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

export interface Fatura {
  id: string
  cliente_administradora_id: string
  administradora_id: string
  proposta_id: string
  numero_fatura?: string
  referencia?: string
  valor_original: number
  valor_desconto: number
  valor_acrescimo: number
  valor_multa: number
  valor_juros: number
  valor_total: number
  valor_pago: number
  data_emissao: string
  data_vencimento: string
  data_pagamento?: string
  data_cancelamento?: string
  status: "pendente" | "paga" | "atrasada" | "cancelada" | "parcialmente_paga"
  gateway_id?: string
  gateway_nome?: string
  boleto_url?: string
  boleto_codigo_barras?: string
  boleto_linha_digitavel?: string
  pix_qrcode?: string
  pix_qrcode_url?: string
  pix_copia_cola?: string
  forma_pagamento?: string
  notificacao_enviada: boolean
  data_ultima_notificacao?: string
  tentativas_notificacao: number
  observacoes?: string
  // Campos Asaas
  asaas_charge_id?: string
  asaas_boleto_url?: string
  asaas_invoice_url?: string
  asaas_payment_link?: string
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface CriarFaturaData {
  cliente_administradora_id: string
  administradora_id: string
  proposta_id: string
  referencia?: string
  valor_original: number
  valor_desconto?: number
  valor_acrescimo?: number
  data_vencimento: string
  observacoes?: string
}

export interface Pagamento {
  id: string
  fatura_id: string
  valor_pago: number
  data_pagamento: string
  forma_pagamento: string
  transacao_id?: string
  comprovante_url?: string
  status: "pendente" | "confirmado" | "cancelado" | "estornado"
  observacoes?: string
  created_at?: string
  created_by?: string
}

/**
 * Service para gerenciar faturas e pagamentos
 */
export class FaturasService {
  /**
   * Gerar número de fatura único
   */
  private static async gerarNumeroFatura(administradoraId: string): Promise<string> {
    const tenantId = await getCurrentTenantId()
    const ano = new Date().getFullYear()
    const mes = String(new Date().getMonth() + 1).padStart(2, "0")

    // Buscar última fatura da administradora, filtrando por tenant
    const { data, error } = await supabase
      .from("faturas")
      .select("numero_fatura")
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .like("numero_fatura", `FAT-${ano}${mes}-%`)
      .order("created_at", { ascending: false })
      .limit(1)

    let proximoNumero = 1

    if (data && data.length > 0 && data[0].numero_fatura) {
      const ultimoNumero = data[0].numero_fatura.split("-").pop()
      proximoNumero = Number.parseInt(ultimoNumero || "0") + 1
    }

    return `FAT-${ano}${mes}-${String(proximoNumero).padStart(5, "0")}`
  }

  /**
   * Calcular multa e juros para fatura atrasada
   */
  private static calcularMultaJuros(
    valorOriginal: number,
    dataVencimento: string,
    multaPerc: number = 2,
    jurosPerc: number = 1
  ): { multa: number; juros: number } {
    const hoje = new Date()
    const vencimento = new Date(dataVencimento)

    if (hoje <= vencimento) {
      return { multa: 0, juros: 0 }
    }

    // Calcular dias de atraso
    const diasAtraso = Math.floor(
      (hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Multa é aplicada uma vez
    const multa = (valorOriginal * multaPerc) / 100

    // Juros são proporcionais ao número de dias (considerando mês de 30 dias)
    const mesesAtraso = diasAtraso / 30
    const juros = (valorOriginal * jurosPerc * mesesAtraso) / 100

    return {
      multa: Number.parseFloat(multa.toFixed(2)),
      juros: Number.parseFloat(juros.toFixed(2)),
    }
  }

  /**
   * Criar nova fatura
   */
  static async criar(dados: CriarFaturaData): Promise<Fatura> {
    try {
      const { data: userData } = await supabase.auth.getUser()

      const tenantId = await getCurrentTenantId()
      
      // Gerar número da fatura
      const numeroFatura = await this.gerarNumeroFatura(dados.administradora_id)

      // Calcular valor total
      const valorDesconto = dados.valor_desconto || 0
      const valorAcrescimo = dados.valor_acrescimo || 0
      const valorTotal = dados.valor_original - valorDesconto + valorAcrescimo

      const { data, error } = await supabase
        .from("faturas")
        .insert([
          {
            ...dados,
            numero_fatura: numeroFatura,
            valor_desconto: valorDesconto,
            valor_acrescimo: valorAcrescimo,
            valor_multa: 0,
            valor_juros: 0,
            valor_total: valorTotal,
            valor_pago: 0,
            data_emissao: new Date().toISOString(),
            status: "pendente",
            notificacao_enviada: false,
            tentativas_notificacao: 0,
            created_by: userData?.user?.id,
            tenant_id: tenantId, // Adicionar tenant_id automaticamente
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao criar fatura:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("❌ Erro ao criar fatura:", error)
      throw error
    }
  }

  /**
   * Buscar faturas por cliente
   */
  static async buscarPorCliente(
    clienteAdministradoraId: string
  ): Promise<Fatura[]> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("faturas")
        .select("*")
        .eq("cliente_administradora_id", clienteAdministradoraId)
        .eq("tenant_id", tenantId)
        .order("vencimento", { ascending: false })

      if (error) {
        console.error("❌ Erro ao buscar faturas:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("❌ Erro ao buscar faturas:", error)
      throw error
    }
  }

  /**
   * Buscar faturas por administradora com paginação
   */
  static async buscarPorAdministradora(
    administradoraId: string,
    filtros?: {
      status?: string
      data_inicio?: string
      data_fim?: string
      cliente_nome?: string
      page?: number
      limit?: number
    }
  ): Promise<{
    faturas: Fatura[]
    total: number
    totalPages: number
    currentPage: number
  }> {
    try {
      // Buscar tenant_id da administradora para garantir que usamos o mesmo tenant_id usado na importação
      const { data: administradora, error: adminError } = await supabase
        .from("administradoras")
        .select("tenant_id")
        .eq("id", administradoraId)
        .single()

      if (adminError || !administradora) {
        throw new Error("Administradora não encontrada")
      }

      const tenantId = administradora.tenant_id
      const page = filtros?.page || 1
      const limit = filtros?.limit || 10
      const offset = (page - 1) * limit

      // Query para contar total
      let countQuery = supabase
        .from("faturas")
        .select("*", { count: 'exact', head: true })
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)

      // Query para buscar dados
      let dataQuery = supabase
        .from("faturas")
        .select("*")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .order("vencimento", { ascending: false })
        .range(offset, offset + limit - 1)

      // Aplicar filtros
      if (filtros?.status && filtros.status !== "todos") {
        countQuery = countQuery.eq("status", filtros.status)
        dataQuery = dataQuery.eq("status", filtros.status)
      }
      if (filtros?.data_inicio) {
        countQuery = countQuery.gte("vencimento", filtros.data_inicio)
        dataQuery = dataQuery.gte("vencimento", filtros.data_inicio)
      }
      if (filtros?.data_fim) {
        countQuery = countQuery.lte("vencimento", filtros.data_fim)
        dataQuery = dataQuery.lte("vencimento", filtros.data_fim)
      }
      if (filtros?.cliente_nome) {
        countQuery = countQuery.ilike("cliente_nome", `%${filtros.cliente_nome}%`)
        dataQuery = dataQuery.ilike("cliente_nome", `%${filtros.cliente_nome}%`)
      }

      // Executar queries
      const [{ count }, { data, error }] = await Promise.all([
        countQuery,
        dataQuery
      ])

      if (error) {
        console.error("❌ Erro ao buscar faturas:", error)
        throw error
      }

      return {
        faturas: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page
      }
    } catch (error) {
      console.error("❌ Erro ao buscar faturas:", error)
      throw error
    }
  }

  /**
   * Buscar fatura por ID
   */
  static async buscarPorId(id: string): Promise<Fatura | null> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("faturas")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("❌ Erro ao buscar fatura:", error)
        throw error
      }

      return data || null
    } catch (error) {
      console.error("❌ Erro ao buscar fatura:", error)
      throw error
    }
  }

  /**
   * Atualizar fatura
   */
  static async atualizar(
    id: string,
    dados: Partial<Fatura>
  ): Promise<Fatura> {
    try {
      const tenantId = await getCurrentTenantId()
      
      // Remover tenant_id dos dados de atualização (não deve ser alterado)
      const { tenant_id, ...dadosSemTenant } = dados
      
      const { data, error } = await supabase
        .from("faturas")
        .update(dadosSemTenant)
        .eq("id", id)
        .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao atualizar fatura:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("❌ Erro ao atualizar fatura:", error)
      throw error
    }
  }

  /**
   * Atualizar status das faturas vencidas
   */
  static async atualizarFaturasVencidas(): Promise<number> {
    try {
      const tenantId = await getCurrentTenantId()
      const hoje = new Date().toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("faturas")
        .update({ status: "atrasada" })
        .eq("status", "pendente")
        .eq("tenant_id", tenantId)
        .lt("vencimento", hoje)
        .select()

      if (error) {
        console.error("❌ Erro ao atualizar faturas vencidas:", error)
        throw error
      }

      return data?.length || 0
    } catch (error) {
      console.error("❌ Erro ao atualizar faturas vencidas:", error)
      throw error
    }
  }

  /**
   * Registrar pagamento
   */
  static async registrarPagamento(
    faturaId: string,
    dados: {
      valor_pago: number
      forma_pagamento: string
      transacao_id?: string
      comprovante_url?: string
      observacoes?: string
    }
  ): Promise<Pagamento> {
    try {
      const { data: userData } = await supabase.auth.getUser()

      // Buscar fatura
      const fatura = await this.buscarPorId(faturaId)
      if (!fatura) {
        throw new Error("Fatura não encontrada")
      }

      const tenantId = await getCurrentTenantId()
      
      // Criar registro de pagamento
      const { data: pagamentoData, error: pagamentoError } = await supabase
        .from("pagamentos")
        .insert([
          {
            fatura_id: faturaId,
            ...dados,
            data_pagamento: new Date().toISOString(),
            status: "confirmado",
            created_by: userData?.user?.id,
            tenant_id: tenantId, // Adicionar tenant_id automaticamente
          },
        ])
        .select()
        .single()

      if (pagamentoError) {
        console.error("❌ Erro ao registrar pagamento:", pagamentoError)
        throw pagamentoError
      }

      // Atualizar fatura
      const novoValorPago = fatura.valor_pago + dados.valor_pago
      const novoStatus =
        novoValorPago >= fatura.valor_total
          ? "paga"
          : "parcialmente_paga"

      await this.atualizar(faturaId, {
        valor_pago: novoValorPago,
        status: novoStatus,
        data_pagamento:
          novoStatus === "paga" ? new Date().toISOString() : fatura.data_pagamento,
      })

      // Se foi pago totalmente, atualizar status do cliente para ativo
      if (novoStatus === "paga") {
        const { error: updateError } = await supabase
          .from("clientes_administradoras")
          .update({ status: "ativo" })
          .eq("id", fatura.cliente_administradora_id)
          .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto

        if (updateError) {
          console.error("❌ Erro ao atualizar status do cliente:", updateError)
        }
      }

      return pagamentoData
    } catch (error) {
      console.error("❌ Erro ao registrar pagamento:", error)
      throw error
    }
  }

  /**
   * Cancelar fatura
   */
  static async cancelar(id: string): Promise<void> {
    try {
      await this.atualizar(id, {
        status: "cancelada",
        data_cancelamento: new Date().toISOString(),
      })
    } catch (error) {
      console.error("❌ Erro ao cancelar fatura:", error)
      throw error
    }
  }

  /**
   * Gerar faturas mensais para todos os clientes ativos de uma administradora
   */
  static async gerarFaturasMensais(
    administradoraId: string,
    referencia: string // Ex: "01/2025"
  ): Promise<{ sucesso: number; erros: number; detalhes: any[] }> {
    try {
      const tenantId = await getCurrentTenantId()
      
      // Buscar clientes ativos
      const { data: clientes, error: clientesError } = await supabase
        .from("clientes_administradoras")
        .select("*")
        .eq("administradora_id", administradoraId)
        .eq("status", "ativo")
        .eq("tenant_id", tenantId)

      if (clientesError) {
        throw clientesError
      }

      if (!clientes || clientes.length === 0) {
        return { sucesso: 0, erros: 0, detalhes: [] }
      }

      const resultados = {
        sucesso: 0,
        erros: 0,
        detalhes: [] as any[],
      }

      // Gerar fatura para cada cliente
      for (const cliente of clientes) {
        try {
          // Verificar se já existe fatura para esta referência
          const { data: faturaExistente } = await supabase
            .from("faturas")
            .select("id")
            .eq("cliente_administradora_id", cliente.id)
            .eq("referencia", referencia)
            .eq("tenant_id", tenantId)
            .single()

          if (faturaExistente) {
            resultados.detalhes.push({
              cliente_id: cliente.id,
              status: "já_existe",
              mensagem: "Fatura já existe para esta referência",
            })
            continue
          }

          // Calcular data de vencimento
          const [mes, ano] = referencia.split("/")
          const dataVencimento = new Date(
            Number.parseInt(ano),
            Number.parseInt(mes) - 1,
            cliente.dia_vencimento
          )
            .toISOString()
            .split("T")[0]

          // Criar fatura
          await this.criar({
            cliente_administradora_id: cliente.id,
            administradora_id: administradoraId,
            proposta_id: cliente.proposta_id,
            referencia,
            valor_original: cliente.valor_mensal,
            data_vencimento: dataVencimento,
          })

          resultados.sucesso++
          resultados.detalhes.push({
            cliente_id: cliente.id,
            status: "sucesso",
            mensagem: "Fatura gerada com sucesso",
          })
        } catch (error: any) {
          resultados.erros++
          resultados.detalhes.push({
            cliente_id: cliente.id,
            status: "erro",
            mensagem: error.message,
          })
        }
      }

      return resultados
    } catch (error) {
      console.error("❌ Erro ao gerar faturas mensais:", error)
      throw error
    }
  }

  /**
   * Buscar pagamentos de uma fatura
   */
  static async buscarPagamentos(faturaId: string): Promise<Pagamento[]> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("fatura_id", faturaId)
        .eq("tenant_id", tenantId)
        .order("data_pagamento", { ascending: false })

      if (error) {
        console.error("❌ Erro ao buscar pagamentos:", error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error("❌ Erro ao buscar pagamentos:", error)
      throw error
    }
  }

  /**
   * Buscar estatísticas financeiras
   */
  static async buscarEstatisticas(
    administradoraId: string,
    filtros?: {
      data_inicio?: string
      data_fim?: string
    }
  ): Promise<{
    total_pendentes: number
    total_atrasadas: number
    total_pagas: number
    total_em_aberto: number
    valor_pendente: number
    valor_atrasado: number
    valor_recebido: number
    valor_em_aberto: number
    }> {
    try {
      const tenantId = await getCurrentTenantId()
      
      // Query base
      let query = supabase
        .from("faturas")
        .select("status, valor, vencimento, pagamento_data, pagamento_valor")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)

      // Aplicar filtros de data se fornecidos
      if (filtros?.data_inicio) {
        query = query.gte("vencimento", filtros.data_inicio)
      }
      if (filtros?.data_fim) {
        query = query.lte("vencimento", filtros.data_fim)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const stats = {
        total_pendentes: 0,
        total_atrasadas: 0,
        total_pagas: 0,
        total_em_aberto: 0,
        valor_pendente: 0,
        valor_atrasado: 0,
        valor_recebido: 0,
        valor_em_aberto: 0,
      }

      data?.forEach((fatura: any) => {
        const valor = Number.parseFloat(fatura.valor) || 0
        const valorPago = Number.parseFloat(fatura.pagamento_valor) || 0

        if (fatura.status === "pendente") {
          stats.total_pendentes++
          stats.valor_pendente += valor
          stats.total_em_aberto++
          stats.valor_em_aberto += valor
        } else if (fatura.status === "atrasada") {
          stats.total_atrasadas++
          stats.valor_atrasado += valor
          stats.total_em_aberto++
          stats.valor_em_aberto += valor
        } else if (fatura.status === "paga" || fatura.status === "pago") {
          stats.total_pagas++
          stats.valor_recebido += valorPago > 0 ? valorPago : valor
        }
      })

      return stats
    } catch (error) {
      console.error("❌ Erro ao buscar estatísticas:", error)
      throw error
    }
  }
}
