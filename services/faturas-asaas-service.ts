/**
 * Serviço de Integração: Faturas + Asaas
 * Gerencia o fluxo completo de geração de faturas via Asaas
 */

import { supabase } from "@/lib/supabase"
import AsaasService, { type AsaasCustomer, type AsaasCharge } from "./asaas-service"
import { FaturasService } from "./faturas-service"
import { ClientesAdministradorasService } from "./clientes-administradoras-service"

export interface ConfiguracaoAsaas {
  administradora_id: string
  api_key: string
  ambiente: 'producao' | 'sandbox'
  webhook_url?: string
  ativo: boolean
}

export interface DadosGeracaoFatura {
  administradora_id: string
  mes_referencia: string // formato: YYYY-MM
  dia_vencimento: number // 1-31
  tipo_cobranca: 'BOLETO' | 'PIX' | 'CREDIT_CARD'
  descricao?: string
  enviar_notificacao?: boolean
}

export interface ResultadoGeracaoFatura {
  sucesso: number
  erros: number
  faturas_criadas: Array<{
    cliente_nome: string
    fatura_id: string
    asaas_charge_id: string
    valor: number
    vencimento: string
    boleto_url?: string
  }>
  erros_detalhados: Array<{
    cliente_nome: string
    erro: string
  }>
}

class FaturasAsaasService {
  /**
   * Busca configuração do Asaas para uma administradora
   */
  async buscarConfiguracao(administradoraId: string): Promise<ConfiguracaoAsaas | null> {
    try {
      const { data, error } = await supabase
        .from("administradoras_config_financeira")
        .select("*")
        .eq("administradora_id", administradoraId)
        .eq("instituicao_financeira", "asaas")
        .eq("status_integracao", "ativa")
        .single()

      if (error) {
        console.error("Erro ao buscar configuração:", error)
        return null
      }

      return {
        administradora_id: data.administradora_id,
        api_key: data.api_key,
        ambiente: data.ambiente as 'producao' | 'sandbox',
        webhook_url: data.webhook_url,
        ativo: data.ativo
      }
    } catch (error) {
      console.error("Erro ao buscar configuração Asaas:", error)
      return null
    }
  }

  /**
   * Salva ou atualiza configuração do Asaas
   */
  async salvarConfiguracao(config: ConfiguracaoAsaas): Promise<void> {
    try {
      const { error } = await supabase
        .from("administradoras_config_financeira")
        .upsert({
          administradora_id: config.administradora_id,
          gateway: "asaas",
          api_key: config.api_key,
          ambiente: config.ambiente,
          webhook_url: config.webhook_url,
          ativo: config.ativo,
          atualizado_em: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error("Erro ao salvar configuração:", error)
      throw error
    }
  }

  /**
   * Cria ou busca cliente no Asaas
   */
  private async obterOuCriarClienteAsaas(
    clienteId: string,
    apiKey: string
  ): Promise<string> {
    try {
      // Configurar API key
      AsaasService.setApiKey(apiKey)

      // Buscar dados do cliente
      const { data: cliente, error } = await supabase
        .from("clientes_administradoras")
        .select(`
          *,
          proposta:propostas(
            nome,
            cpf,
            email,
            telefone,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            cep
          )
        `)
        .eq("id", clienteId)
        .single()

      if (error || !cliente) {
        throw new Error("Cliente não encontrado")
      }

      // Se já tem asaas_customer_id, retornar
      if (cliente.asaas_customer_id) {
        return cliente.asaas_customer_id
      }

      // Criar cliente no Asaas
      const proposta = Array.isArray(cliente.proposta) ? cliente.proposta[0] : cliente.proposta
      
      const asaasCustomer: AsaasCustomer = {
        name: proposta.nome,
        cpfCnpj: AsaasService.formatCpfCnpj(proposta.cpf),
        email: proposta.email,
        phone: proposta.telefone ? AsaasService.formatPhone(proposta.telefone) : undefined,
        mobilePhone: proposta.telefone ? AsaasService.formatPhone(proposta.telefone) : undefined,
        address: proposta.endereco,
        addressNumber: proposta.numero,
        complement: proposta.complemento,
        province: proposta.bairro,
        postalCode: proposta.cep ? AsaasService.formatCpfCnpj(proposta.cep) : undefined,
        externalReference: clienteId,
        notificationDisabled: false
      }

      const customerCreated = await AsaasService.createCustomer(asaasCustomer)

      // Salvar asaas_customer_id no banco
      await supabase
        .from("clientes_administradoras")
        .update({ asaas_customer_id: customerCreated.id })
        .eq("id", clienteId)

      return customerCreated.id!
    } catch (error) {
      console.error("Erro ao obter/criar cliente no Asaas:", error)
      throw error
    }
  }

  /**
   * Gera fatura para um cliente específico
   */
  async gerarFaturaCliente(
    clienteId: string,
    dados: {
      valor: number
      vencimento: string // YYYY-MM-DD
      descricao: string
      tipo_cobranca: 'BOLETO' | 'PIX' | 'CREDIT_CARD'
      api_key: string
    }
  ): Promise<{
    fatura_id: string
    asaas_charge_id: string
    boleto_url?: string
    pix_qrcode?: string
  }> {
    try {
      // 1. Obter ou criar cliente no Asaas
      const asaasCustomerId = await this.obterOuCriarClienteAsaas(clienteId, dados.api_key)

      // 2. Configurar API key
      AsaasService.setApiKey(dados.api_key)

      // 3. Criar cobrança no Asaas
      const charge: AsaasCharge = {
        customer: asaasCustomerId,
        billingType: dados.tipo_cobranca,
        value: dados.valor,
        dueDate: dados.vencimento,
        description: dados.descricao,
        externalReference: clienteId
      }

      const chargeCreated = await AsaasService.createCharge(charge)

      // 4. Criar fatura no nosso banco
      const fatura = await FaturasService.criar({
        cliente_administradora_id: clienteId,
        proposta_id: "", // Será preenchido pela trigger
        valor: dados.valor,
        data_vencimento: dados.vencimento,
        data_emissao: new Date().toISOString().split('T')[0],
        status: "pendente",
        descricao: dados.descricao,
        asaas_charge_id: chargeCreated.id,
        asaas_boleto_url: chargeCreated.bankSlipUrl || undefined,
        asaas_invoice_url: chargeCreated.invoiceUrl,
        asaas_payment_link: chargeCreated.paymentLink || undefined
      })

      return {
        fatura_id: fatura.id,
        asaas_charge_id: chargeCreated.id,
        boleto_url: chargeCreated.bankSlipUrl || undefined,
        pix_qrcode: undefined // PIX será implementado posteriormente
      }
    } catch (error) {
      console.error("Erro ao gerar fatura:", error)
      throw error
    }
  }

  /**
   * Gera faturas em lote para todos os clientes de uma administradora
   */
  async gerarFaturasLote(dados: DadosGeracaoFatura): Promise<ResultadoGeracaoFatura> {
    const resultado: ResultadoGeracaoFatura = {
      sucesso: 0,
      erros: 0,
      faturas_criadas: [],
      erros_detalhados: []
    }

    try {
      // 1. Buscar configuração do Asaas
      const config = await this.buscarConfiguracao(dados.administradora_id)
      if (!config) {
        throw new Error("Configuração do Asaas não encontrada")
      }

      // 2. Buscar clientes ativos da administradora
      const { data: clientes, error } = await supabase
        .from("clientes_administradoras")
        .select(`
          *,
          proposta:propostas(nome, cpf)
        `)
        .eq("administradora_id", dados.administradora_id)
        .eq("status", "ativo")

      if (error) throw error

      if (!clientes || clientes.length === 0) {
        throw new Error("Nenhum cliente ativo encontrado")
      }

      // 3. Calcular data de vencimento
      const [ano, mes] = dados.mes_referencia.split('-')
      const dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, dados.dia_vencimento)
      const vencimentoFormatado = AsaasService.formatDate(dataVencimento)

      // 4. Gerar fatura para cada cliente
      for (const cliente of clientes) {
        try {
          const proposta = Array.isArray(cliente.proposta) ? cliente.proposta[0] : cliente.proposta
          
          const fatura = await this.gerarFaturaCliente(cliente.id, {
            valor: cliente.valor_mensal || 0,
            vencimento: vencimentoFormatado,
            descricao: dados.descricao || `Mensalidade referente a ${dados.mes_referencia}`,
            tipo_cobranca: dados.tipo_cobranca,
            api_key: config.api_key
          })

          resultado.sucesso++
          resultado.faturas_criadas.push({
            cliente_nome: proposta.nome,
            fatura_id: fatura.fatura_id,
            asaas_charge_id: fatura.asaas_charge_id,
            valor: cliente.valor_mensal || 0,
            vencimento: vencimentoFormatado,
            boleto_url: fatura.boleto_url
          })
        } catch (error) {
          const proposta = Array.isArray(cliente.proposta) ? cliente.proposta[0] : cliente.proposta
          resultado.erros++
          resultado.erros_detalhados.push({
            cliente_nome: proposta.nome,
            erro: error instanceof Error ? error.message : "Erro desconhecido"
          })
        }
      }

      // 5. Registrar log da operação
      await this.registrarLog({
        administradora_id: dados.administradora_id,
        operacao: "gerar_faturas_lote",
        status: resultado.erros === 0 ? "sucesso" : "parcial",
        detalhes: {
          mes_referencia: dados.mes_referencia,
          total_clientes: clientes.length,
          sucesso: resultado.sucesso,
          erros: resultado.erros
        }
      })

      return resultado
    } catch (error) {
      console.error("Erro ao gerar faturas em lote:", error)
      throw error
    }
  }

  /**
   * Atualiza status de uma fatura baseado no webhook do Asaas
   */
  async atualizarStatusFatura(
    asaasChargeId: string,
    novoStatus: string,
    dadosPagamento?: {
      data_pagamento?: string
      valor_pago?: number
    }
  ): Promise<void> {
    try {
      const statusMapeado = AsaasService.convertAsaasStatus(novoStatus)

      const updateData: any = {
        status: statusMapeado,
        atualizado_em: new Date().toISOString()
      }

      if (dadosPagamento?.data_pagamento) {
        updateData.data_pagamento = dadosPagamento.data_pagamento
      }

      if (dadosPagamento?.valor_pago) {
        updateData.valor_pago = dadosPagamento.valor_pago
      }

      const { error } = await supabase
        .from("faturas")
        .update(updateData)
        .eq("asaas_charge_id", asaasChargeId)

      if (error) throw error
    } catch (error) {
      console.error("Erro ao atualizar status da fatura:", error)
      throw error
    }
  }

  /**
   * Registra log de integração
   */
  private async registrarLog(dados: {
    administradora_id: string
    operacao: string
    status: string
    detalhes: any
  }): Promise<void> {
    try {
      await supabase.from("logs_integracao_financeira").insert({
        administradora_id: dados.administradora_id,
        gateway: "asaas",
        operacao: dados.operacao,
        status: dados.status,
        detalhes: dados.detalhes,
        criado_em: new Date().toISOString()
      })
    } catch (error) {
      console.error("Erro ao registrar log:", error)
      // Não lançar erro para não interromper o fluxo principal
    }
  }

  /**
   * Busca estatísticas de faturas por administradora
   */
  async buscarEstatisticas(administradoraId: string): Promise<{
    total_faturas: number
    valor_total: number
    faturas_pendentes: number
    valor_pendente: number
    faturas_pagas: number
    valor_recebido: number
    faturas_atrasadas: number
    valor_atrasado: number
  }> {
    try {
      const { data, error } = await supabase
        .rpc("calcular_estatisticas_faturas", {
          p_administradora_id: administradoraId
        })

      if (error) throw error

      return data || {
        total_faturas: 0,
        valor_total: 0,
        faturas_pendentes: 0,
        valor_pendente: 0,
        faturas_pagas: 0,
        valor_recebido: 0,
        faturas_atrasadas: 0,
        valor_atrasado: 0
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error)
      return {
        total_faturas: 0,
        valor_total: 0,
        faturas_pendentes: 0,
        valor_pendente: 0,
        faturas_pagas: 0,
        valor_recebido: 0,
        faturas_atrasadas: 0,
        valor_atrasado: 0
      }
    }
  }
}

export default new FaturasAsaasService()
