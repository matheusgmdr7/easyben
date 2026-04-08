import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { IntegracaoAsaasService } from "./integracao-asaas-service"

export interface ClienteAdministradora {
  id: string
  administradora_id: string
  proposta_id: string
  corretor_id?: string | null
  numero_contrato?: string
  data_vinculacao: string
  data_vencimento: string
  data_vigencia: string
  data_cancelamento?: string
  status: "ativo" | "suspenso" | "cancelado" | "inadimplente" | "aguardando_implantacao"
  valor_mensal: number
  dia_vencimento: number
  observacoes?: string
  numero_carteirinha?: string
  numero_carteirinha_odonto?: string
  implantado?: boolean
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface ClienteAdministradoraCompleto extends ClienteAdministradora {
  administradora_nome?: string
  administradora_cnpj?: string
  corretor_nome?: string | null
  cliente_nome?: string
  cliente_email?: string
  cliente_telefone?: string
  cliente_cpf?: string
  produto_nome?: string
  plano_nome?: string
  cobertura?: string
  acomodacao?: string
  total_faturas?: number
  faturas_pagas?: number
  faturas_atrasadas?: number
  faturas_pendentes?: number
}

export interface VincularClienteData {
  administradora_id: string
  proposta_id: string
  data_vencimento: string
  data_vigencia: string
  valor_mensal: number
  dia_vencimento?: number
  numero_contrato?: string
  observacoes?: string
  integrar_asaas?: boolean // Nova opção para integrar automaticamente com Asaas
  gerar_fatura?: boolean // Nova opção para gerar fatura inicial
  criar_assinatura?: boolean // Nova opção para criar assinatura recorrente
  fatura_juros?: number // Percentual de juros ao mês
  fatura_multa?: number // Percentual de multa
  fatura_vencimento?: string // Data de vencimento específica da fatura
  fatura_valor?: number // Valor específico da fatura
  fatura_descricao?: string // Descrição da fatura
  // Campos da assinatura recorrente
  assinatura_descricao?: string // Descrição que aparecerá nas faturas geradas pela assinatura
  assinatura_valor?: number // Valor da assinatura
  assinatura_juros?: number // Juros da assinatura
  assinatura_multa?: number // Multa da assinatura
}

export interface FiltrosClientes {
  status?: string
  nome?: string
  email?: string
  cpf?: string
  data_vinculacao_inicio?: string
  data_vinculacao_fim?: string
  valor_minimo?: number
  valor_maximo?: number
}

export interface PaginacaoClientes {
  pagina: number
  limite: number
  ordenacao: {
    campo: 'cliente_nome' | 'data_vinculacao' | 'valor_mensal' | 'status'
    direcao: 'asc' | 'desc'
  }
}

export interface ResultadoClientes {
  clientes: ClienteAdministradoraCompleto[]
  total: number
  pagina: number
  limite: number
  total_paginas: number
}

/**
 * Service para gerenciar clientes vinculados às administradoras
 */
export class ClientesAdministradorasService {
  /**
   * Vincular cliente (proposta) à administradora
   */
  static async vincularCliente(
    dados: VincularClienteData
  ): Promise<ClienteAdministradora> {
    try {
      const { data: userData } = await supabase.auth.getUser()

      const tenantId = await getCurrentTenantId()

      // Verificar se o cliente já está vinculado a esta administradora
      const { data: vinculoExistente } = await supabase
        .from("clientes_administradoras")
        .select("*")
        .eq("administradora_id", dados.administradora_id)
        .eq("proposta_id", dados.proposta_id)
        .eq("tenant_id", tenantId)
        .single()

      if (vinculoExistente) {
        throw new Error("Cliente já está vinculado a esta administradora")
      }

      // Criar vínculo (removendo campos que não existem na tabela)
      // Esses campos são apenas para a integração com Asaas, não para a tabela clientes_administradoras
      const { 
        gerar_fatura, 
        criar_assinatura, 
        fatura_juros,
        fatura_multa,
        fatura_vencimento,
        fatura_valor,
        fatura_descricao,
        assinatura_descricao,
        assinatura_valor,
        assinatura_juros,
        assinatura_multa,
        integrar_asaas,
        ...dadosInsert 
      } = dados
      
      const { data, error } = await supabase
        .from("clientes_administradoras")
        .insert([
          {
            ...dadosInsert,
            dia_vencimento: dados.dia_vencimento || 10,
            status: "ativo",
            data_vinculacao: new Date().toISOString(),
            created_by: userData?.user?.id,
            tenant_id: tenantId, // Adicionar tenant_id automaticamente
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao vincular cliente:", error)
        throw error
      }

      // Atualizar status da proposta para "transmitida"
      const { error: erroUpdateProposta } = await supabase
        .from("propostas")
        .update({
          status: "transmitida",
          administradora: dados.administradora_id,
          data_cadastro: new Date().toISOString(),
          data_vencimento: dados.data_vencimento,
          data_vigencia: dados.data_vigencia,
        })
        .eq("id", dados.proposta_id)
        .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto

      if (erroUpdateProposta) {
        console.error("⚠️ Erro ao atualizar status da proposta:", erroUpdateProposta)
        // Não bloquear o cadastro, mas logar o erro
      } else {
        console.log("✅ Status da proposta atualizado para 'transmitida'")
      }

      // Integração automática com Asaas (se solicitada)
      if (dados.integrar_asaas) {
        try {
          // Verificar se a proposta existe antes de integrar
          console.log("🔍 Verificando se proposta existe antes de integrar...")
          const { data: propostaVerificada, error: erroVerificacao } = await supabase
            .from("propostas")
            .select("id")
            .eq("id", dados.proposta_id)
            .eq("tenant_id", tenantId)
            .single()
          
          if (erroVerificacao || !propostaVerificada) {
            console.error("❌ Proposta não encontrada antes da integração:", erroVerificacao)
            throw new Error(`Proposta não encontrada: ${dados.proposta_id}. Não é possível integrar com Asaas.`)
          }
          
          console.log("✅ Proposta verificada, prosseguindo com integração...")
          
          // Pequeno delay para garantir que todas as atualizações foram commitadas
          await new Promise(resolve => setTimeout(resolve, 500))
          
          console.log("🚀 Iniciando integração automática com Asaas via API...")
          
          const dadosIntegracao = {
            proposta_id: dados.proposta_id,
            administradora_id: dados.administradora_id,
            valor_mensal: dados.valor_mensal,
            data_vencimento: dados.data_vencimento,
            data_vigencia: dados.data_vigencia,
            dia_vencimento: dados.dia_vencimento || 10,
            gerar_fatura: dados.gerar_fatura !== false, // Padrão: true se integrarAsaas
            criar_assinatura: dados.criar_assinatura || false,
            cliente_administradora_id: data.id, // Passar o ID diretamente para evitar race condition
            // Campos da fatura única
            fatura_juros: dados.fatura_juros,
            fatura_multa: dados.fatura_multa,
            fatura_vencimento: dados.fatura_vencimento,
            fatura_valor: dados.fatura_valor,
            fatura_descricao: dados.fatura_descricao,
            // Campos da assinatura recorrente
            assinatura_descricao: dados.assinatura_descricao,
            assinatura_valor: dados.assinatura_valor,
            assinatura_juros: dados.assinatura_juros,
            assinatura_multa: dados.assinatura_multa
          }
          
          console.log("📋 Dados de integração (com cliente_administradora_id):", dadosIntegracao)

          // Chamar API route ao invés do serviço direto (para evitar CORS)
          const response = await fetch('/api/integrar-cliente-asaas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosIntegracao)
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.erros?.[0] || 'Erro na integração com Asaas')
          }

          const resultado = await response.json()
          console.log("✅ Integração com Asaas realizada via API:", resultado)
          
        } catch (error: any) {
          console.error("⚠️ Erro na integração com Asaas (não bloqueia o cadastro):", error)
          // Não bloquear o cadastro se a integração com Asaas falhar
        }
      }

      return data
    } catch (error) {
      console.error("❌ Erro ao vincular cliente:", error)
      throw error
    }
  }

  /**
   * Buscar clientes de uma administradora
   */
  static async buscarPorAdministradora(
    administradoraId: string,
    filtros?: FiltrosClientes,
    paginacao?: PaginacaoClientes
  ): Promise<ResultadoClientes> {
    try {
      const tenantId = await getCurrentTenantId()
      const limite = paginacao?.limite || 10
      const pagina = paginacao?.pagina || 1
      const offset = (pagina - 1) * limite

      // Query para contar total
      let countQuery = supabase
        .from("vw_clientes_administradoras_completo")
        .select("*", { count: "exact", head: true })
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)

      // Aplicar filtros no count
      if (filtros?.status) {
        countQuery = countQuery.eq("status", filtros.status)
      }
      if (filtros?.nome) {
        countQuery = countQuery.ilike("cliente_nome", `%${filtros.nome}%`)
      }
      if (filtros?.email) {
        countQuery = countQuery.ilike("cliente_email", `%${filtros.email}%`)
      }
      if (filtros?.cpf) {
        countQuery = countQuery.ilike("cliente_cpf", `%${filtros.cpf}%`)
      }
      if (filtros?.data_vinculacao_inicio) {
        countQuery = countQuery.gte("data_vinculacao", filtros.data_vinculacao_inicio)
      }
      if (filtros?.data_vinculacao_fim) {
        countQuery = countQuery.lte("data_vinculacao", filtros.data_vinculacao_fim)
      }
      if (filtros?.valor_minimo) {
        countQuery = countQuery.gte("valor_mensal", filtros.valor_minimo)
      }
      if (filtros?.valor_maximo) {
        countQuery = countQuery.lte("valor_mensal", filtros.valor_maximo)
      }

      // Query para buscar dados
      let query = supabase
        .from("vw_clientes_administradoras_completo")
        .select("*")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .range(offset, offset + limite - 1)

      // Aplicar filtros
      if (filtros?.status) {
        query = query.eq("status", filtros.status)
      }
      if (filtros?.nome) {
        query = query.ilike("cliente_nome", `%${filtros.nome}%`)
      }
      if (filtros?.email) {
        query = query.ilike("cliente_email", `%${filtros.email}%`)
      }
      if (filtros?.cpf) {
        query = query.ilike("cliente_cpf", `%${filtros.cpf}%`)
      }
      if (filtros?.data_vinculacao_inicio) {
        query = query.gte("data_vinculacao", filtros.data_vinculacao_inicio)
      }
      if (filtros?.data_vinculacao_fim) {
        query = query.lte("data_vinculacao", filtros.data_vinculacao_fim)
      }
      if (filtros?.valor_minimo) {
        query = query.gte("valor_mensal", filtros.valor_minimo)
      }
      if (filtros?.valor_maximo) {
        query = query.lte("valor_mensal", filtros.valor_maximo)
      }

      // Aplicar ordenação
      const campo = paginacao?.ordenacao?.campo || 'data_vinculacao'
      const direcao = paginacao?.ordenacao?.direcao || 'desc'
      query = query.order(campo, { ascending: direcao === 'asc' })

      const [{ count }, { data, error }] = await Promise.all([
        countQuery,
        query
      ])

      if (error) {
        console.error("❌ Erro ao buscar clientes:", error)
        throw error
      }

      const total = count || 0
      const total_paginas = Math.ceil(total / limite)

      return {
        clientes: data || [],
        total,
        pagina,
        limite,
        total_paginas
      }
    } catch (error) {
      console.error("❌ Erro ao buscar clientes:", error)
      throw error
    }
  }

  /**
   * Buscar cliente específico
   */
  static async buscarPorId(id: string): Promise<ClienteAdministradoraCompleto | null> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("vw_clientes_administradoras_completo")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("❌ Erro ao buscar cliente:", error)
        throw error
      }

      return data || null
    } catch (error) {
      console.error("❌ Erro ao buscar cliente:", error)
      throw error
    }
  }

  /**
   * Atualizar dados do vínculo
   */
  static async atualizar(
    id: string,
    dados: Partial<{
      numero_contrato: string
      data_vencimento: string
      data_vigencia: string
      valor_mensal: number
      dia_vencimento: number
      observacoes: string
      numero_carteirinha: string
      implantado: boolean
      status: "ativo" | "suspenso" | "cancelado" | "inadimplente" | "aguardando_implantacao"
    }>
  ): Promise<ClienteAdministradora> {
    try {
      // Se implantado foi alterado, atualizar status automaticamente
      const dadosAtualizacao: any = { ...dados }
      
      if (dados.implantado !== undefined) {
        if (dados.implantado === true) {
          // Se foi marcado como implantado e o status atual é "aguardando_implantacao", mudar para "ativo"
          const clienteAtual = await this.buscarPorId(id)
          if (clienteAtual?.status === "aguardando_implantacao") {
            dadosAtualizacao.status = "ativo"
          }
        } else {
          // Se foi marcado como não implantado, mudar status para "aguardando_implantacao"
          dadosAtualizacao.status = "aguardando_implantacao"
        }
      }

      const tenantId = await getCurrentTenantId()
      
      // Remover tenant_id dos dados de atualização (não deve ser alterado)
      const { tenant_id, ...dadosSemTenant } = dadosAtualizacao

      const { data, error } = await supabase
        .from("clientes_administradoras")
        .update(dadosSemTenant)
        .eq("id", id)
        .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao atualizar cliente:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("❌ Erro ao atualizar cliente:", error)
      throw error
    }
  }

  /**
   * Alterar status do cliente
   */
  static async alterarStatus(
    id: string,
    status: "ativo" | "suspenso" | "cancelado" | "inadimplente" | "aguardando_implantacao"
  ): Promise<void> {
    try {
      const dados: any = { status }

      // Se estiver cancelando, adicionar data de cancelamento
      if (status === "cancelado") {
        dados.data_cancelamento = new Date().toISOString()
      }

      const tenantId = await getCurrentTenantId()
      
      const { error } = await supabase
        .from("clientes_administradoras")
        .update(dados)
        .eq("id", id)
        .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto

      if (error) {
        console.error("❌ Erro ao alterar status:", error)
        throw error
      }
    } catch (error) {
      console.error("❌ Erro ao alterar status:", error)
      throw error
    }
  }

  /**
   * Cancelar vínculo com cliente
   */
  static async cancelarVinculo(id: string): Promise<void> {
    try {
      await this.alterarStatus(id, "cancelado")
    } catch (error) {
      console.error("❌ Erro ao cancelar vínculo:", error)
      throw error
    }
  }

  /**
   * Transferir cliente de uma administradora para outra
   */
  static async transferirCliente(
    clienteAdministradoraId: string,
    novaAdministradoraId: string
  ): Promise<ClienteAdministradora> {
    try {
      // Buscar dados do cliente atual
      const clienteAtual = await this.buscarPorId(clienteAdministradoraId)
      
      if (!clienteAtual) {
        throw new Error("Cliente não encontrado")
      }

      const tenantId = await getCurrentTenantId()
      
      // Verificar se o cliente já está vinculado à nova administradora
      const { data: vinculoExistente } = await supabase
        .from("clientes_administradoras")
        .select("*")
        .eq("administradora_id", novaAdministradoraId)
        .eq("proposta_id", clienteAtual.proposta_id)
        .eq("tenant_id", tenantId)
        .single()

      if (vinculoExistente) {
        throw new Error("Cliente já está vinculado a esta administradora")
      }

      // Atualizar administradora_id
      const { data, error } = await supabase
        .from("clientes_administradoras")
        .update({
          administradora_id: novaAdministradoraId,
          updated_at: new Date().toISOString()
        })
        .eq("id", clienteAdministradoraId)
        .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao transferir cliente:", error)
        throw error
      }

      // Atualizar faturas para a nova administradora (se necessário)
      const { error: erroFaturas } = await supabase
        .from("faturas")
        .update({
          administradora_id: novaAdministradoraId,
          updated_at: new Date().toISOString()
        })
        .eq("cliente_administradora_id", clienteAdministradoraId)
        .eq("tenant_id", tenantId) // Garantir que só atualiza do tenant correto

      if (erroFaturas) {
        console.warn("⚠️ Aviso ao atualizar faturas:", erroFaturas)
        // Não bloquear a transferência se houver erro nas faturas
      }

      return data
    } catch (error) {
      console.error("❌ Erro ao transferir cliente:", error)
      throw error
    }
  }

  /**
   * Buscar dados completos do cliente (proposta) com histórico
   */
  static async buscarDadosCompletos(clienteAdministradoraId: string): Promise<any> {
    try {
      const tenantId = await getCurrentTenantId()
      
      // Buscar dados do vínculo
      const { data: clienteData, error: clienteError } = await supabase
        .from("vw_clientes_administradoras_completo")
        .select("*")
        .eq("id", clienteAdministradoraId)
        .eq("tenant_id", tenantId)
        .single()

      if (clienteError) {
        throw clienteError
      }

      // Buscar dados completos da proposta
      const { data: propostaData, error: propostaError } = await supabase
        .from("propostas")
        .select("*")
        .eq("id", clienteData.proposta_id)
        .eq("tenant_id", tenantId)
        .single()

      if (propostaError) {
        throw propostaError
      }

      // Buscar dependentes
      const { data: dependentesData } = await supabase
        .from("dependentes_propostas")
        .select("*")
        .eq("proposta_id", clienteData.proposta_id)
        .eq("tenant_id", tenantId)

      // Buscar questionários de saúde
      const { data: questionariosData } = await supabase
        .from("questionarios_saude")
        .select("*")
        .eq("proposta_id", clienteData.proposta_id)
        .eq("tenant_id", tenantId)

      // Buscar faturas
      const { data: faturasData } = await supabase
        .from("faturas")
        .select("*")
        .eq("cliente_administradora_id", clienteAdministradoraId)
        .eq("tenant_id", tenantId)
        .order("data_vencimento", { ascending: false })

      return {
        cliente: clienteData,
        proposta: propostaData,
        dependentes: dependentesData || [],
        questionarios_saude: questionariosData || [],
        faturas: faturasData || [],
      }
    } catch (error) {
      console.error("❌ Erro ao buscar dados completos:", error)
      throw error
    }
  }

  /**
   * Verificar se cliente está inadimplente
   */
  static async verificarInadimplencia(clienteAdministradoraId: string): Promise<boolean> {
    try {
      const tenantId = await getCurrentTenantId()
      
      const { data, error } = await supabase
        .from("faturas")
        .select("*", { count: "exact", head: true })
        .eq("cliente_administradora_id", clienteAdministradoraId)
        .eq("status", "atrasada")
        .eq("tenant_id", tenantId)

      if (error) {
        throw error
      }

      const temFaturasAtrasadas = (data?.length || 0) > 0

      // Se tem faturas atrasadas, atualizar status do cliente
      if (temFaturasAtrasadas) {
        await this.alterarStatus(clienteAdministradoraId, "inadimplente")
      }

      return temFaturasAtrasadas
    } catch (error) {
      console.error("❌ Erro ao verificar inadimplência:", error)
      throw error
    }
  }
}


