import { supabase } from "@/lib/supabase"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import AsaasServiceInstance, { type AsaasCharge, type AsaasCustomer } from "./asaas-service"
import {
  ConfiguracaoFaturamento,
  GruposBeneficiariosService,
  ConfiguracaoFaturamentoService,
} from "./grupos-beneficiarios-service"

export interface DadosFatura {
  grupo_id: string
  cliente_id: string
  cliente_tipo: "proposta" | "cliente_administradora"
  valor: number
  vencimento: string // YYYY-MM-DD
  descricao: string
  referencia_externa?: string
}

export interface ResultadoFaturamento {
  sucesso: boolean
  fatura_id?: string
  boleto_url?: string
  pix_qrcode?: string
  fatura_url?: string
  numero_boleto?: string
  linha_digitavel?: string
  erro?: string
  metodo_usado: "asaas" | "banco" | "manual"
}

/**
 * Service para gerenciar faturamento usando diferentes métodos
 */
export class FaturamentoService {
  /**
   * Gerar fatura para um cliente usando a configuração do grupo
   */
  static async gerarFatura(dados: DadosFatura): Promise<ResultadoFaturamento> {
    try {
      // 1. Buscar grupo e configuração de faturamento
      const grupo = await GruposBeneficiariosService.buscarPorId(dados.grupo_id)
      if (!grupo) {
        throw new Error("Grupo de beneficiários não encontrado")
      }

      if (!grupo.configuracao_faturamento_id) {
        throw new Error("Grupo não possui configuração de faturamento")
      }

      const config = await ConfiguracaoFaturamentoService.buscarPorId(
        grupo.configuracao_faturamento_id
      )
      if (!config) {
        throw new Error("Configuração de faturamento não encontrada")
      }

      // 2. Gerar fatura baseado no tipo
      switch (config.tipo_faturamento) {
        case "asaas":
          return await this.gerarFaturaAsaas(dados, config)
        case "banco":
          return await this.gerarFaturaBanco(dados, config)
        case "manual":
          return await this.gerarFaturaManual(dados, config)
        default:
          throw new Error(`Tipo de faturamento não suportado: ${config.tipo_faturamento}`)
      }
    } catch (error: any) {
      console.error("Erro ao gerar fatura:", error)
      return {
        sucesso: false,
        erro: error.message || "Erro ao gerar fatura",
        metodo_usado: "manual",
      }
    }
  }

  /**
   * Gerar fatura usando Asaas
   */
  private static async gerarFaturaAsaas(
    dados: DadosFatura,
    config: ConfiguracaoFaturamento
  ): Promise<ResultadoFaturamento> {
    try {
      if (!config.asaas_api_key) {
        throw new Error("API Key do Asaas não configurada")
      }

      // Configurar API key
      AsaasServiceInstance.setApiKey(config.asaas_api_key)

      // Buscar ou criar cliente no Asaas
      const clienteAsaasId = await this.obterOuCriarClienteAsaas(
        dados.cliente_id,
        dados.cliente_tipo,
        config.asaas_api_key
      )

      // Criar cobrança no Asaas
      const charge: AsaasCharge = {
        customer: clienteAsaasId,
        billingType: "BOLETO",
        value: dados.valor,
        dueDate: dados.vencimento,
        description: dados.descricao,
        externalReference: dados.referencia_externa || dados.cliente_id,
      }

      const chargeResponse = await AsaasServiceInstance.createCharge(charge)

      // Buscar dados do cliente para obter administradora_id e proposta_id
      const { administradora_id, proposta_id, cliente_administradora_id } = 
        await this.obterDadosCliente(dados.cliente_id, dados.cliente_tipo)

      // Salvar fatura no banco usando FaturasService
      const { FaturasService } = await import("./faturas-service")
      const fatura = await FaturasService.criar({
        cliente_administradora_id: cliente_administradora_id || dados.cliente_id,
        administradora_id,
        proposta_id: proposta_id || dados.cliente_id,
        valor_original: dados.valor,
        data_vencimento: dados.vencimento,
        observacoes: dados.descricao,
      })

      // Atualizar com dados do Asaas
      const tenantId = await getCurrentTenantId()
      await supabase
        .from("faturas")
        .update({
          gateway_id: chargeResponse.id,
          gateway_nome: "Asaas",
          boleto_url: chargeResponse.bankSlipUrl || undefined,
          asaas_charge_id: chargeResponse.id,
          asaas_boleto_url: chargeResponse.bankSlipUrl || undefined,
          asaas_invoice_url: chargeResponse.invoiceUrl,
          asaas_payment_link: chargeResponse.paymentLink || undefined,
        })
        .eq("id", fatura.id)
        .eq("tenant_id", tenantId)

      if (error) throw error

      return {
        sucesso: true,
        fatura_id: fatura.id,
        boleto_url: chargeResponse.bankSlipUrl || undefined,
        fatura_url: chargeResponse.invoiceUrl,
        metodo_usado: "asaas",
      }
    } catch (error: any) {
      console.error("Erro ao gerar fatura Asaas:", error)
      throw error
    }
  }

  /**
   * Gerar fatura usando banco (boleto bancário)
   */
  private static async gerarFaturaBanco(
    dados: DadosFatura,
    config: ConfiguracaoFaturamento
  ): Promise<ResultadoFaturamento> {
    try {
      if (!config.conta_cedente_id) {
        throw new Error("Conta cedente não configurada")
      }

      // Buscar dados da conta cedente
      const { data: contaCedente, error: contaError } = await supabase
        .from("contas_cedentes")
        .select("*")
        .eq("id", config.conta_cedente_id)
        .single()

      if (contaError || !contaCedente) {
        throw new Error("Conta cedente não encontrada")
      }

      // Gerar boleto via API do banco
      // Por enquanto, vamos criar uma estrutura básica
      // A integração real com cada banco será implementada conforme necessário
      const boletoData = await this.gerarBoletoBancario(dados, config, contaCedente)

      // Buscar dados do cliente para obter administradora_id e proposta_id
      const { administradora_id, proposta_id, cliente_administradora_id } = 
        await this.obterDadosCliente(dados.cliente_id, dados.cliente_tipo)

      // Salvar fatura no banco usando FaturasService
      const { FaturasService } = await import("./faturas-service")
      const fatura = await FaturasService.criar({
        cliente_administradora_id: cliente_administradora_id || dados.cliente_id,
        administradora_id,
        proposta_id: proposta_id || dados.cliente_id,
        valor_original: dados.valor,
        data_vencimento: dados.vencimento,
        observacoes: dados.descricao,
      })

      // Atualizar com dados do boleto bancário
      const tenantId = await getCurrentTenantId()
      await supabase
        .from("faturas")
        .update({
          gateway_nome: contaCedente.banco,
          boleto_url: boletoData.boleto_url,
          boleto_codigo_barras: boletoData.numero_boleto,
          boleto_linha_digitavel: boletoData.linha_digitavel,
        })
        .eq("id", fatura.id)
        .eq("tenant_id", tenantId)

      if (error) throw error

      return {
        sucesso: true,
        fatura_id: fatura.id,
        boleto_url: boletoData.boleto_url,
        numero_boleto: boletoData.numero_boleto,
        linha_digitavel: boletoData.linha_digitavel,
        metodo_usado: "banco",
      }
    } catch (error: any) {
      console.error("Erro ao gerar fatura banco:", error)
      throw error
    }
  }

  /**
   * Gerar fatura manual (sem integração)
   */
  private static async gerarFaturaManual(
    dados: DadosFatura,
    config: ConfiguracaoFaturamento
  ): Promise<ResultadoFaturamento> {
    try {
      // Buscar dados do cliente para obter administradora_id e proposta_id
      const { administradora_id, proposta_id, cliente_administradora_id } = 
        await this.obterDadosCliente(dados.cliente_id, dados.cliente_tipo)

      // Salvar fatura no banco usando FaturasService
      const { FaturasService } = await import("./faturas-service")
      const fatura = await FaturasService.criar({
        cliente_administradora_id: cliente_administradora_id || dados.cliente_id,
        administradora_id,
        proposta_id: proposta_id || dados.cliente_id,
        valor_original: dados.valor,
        data_vencimento: dados.vencimento,
        observacoes: dados.descricao + " (Faturamento manual - boleto deve ser gerado externamente)",
      })

      if (error) throw error

      return {
        sucesso: true,
        fatura_id: fatura.id,
        metodo_usado: "manual",
      }
    } catch (error: any) {
      console.error("Erro ao gerar fatura manual:", error)
      throw error
    }
  }

  /**
   * Obter ou criar cliente no Asaas
   */
  private static async obterOuCriarClienteAsaas(
    clienteId: string,
    clienteTipo: "proposta" | "cliente_administradora",
    apiKey: string
  ): Promise<string> {
    try {
      // Buscar dados do cliente
      let clienteData: any = null

      if (clienteTipo === "cliente_administradora") {
        const { data } = await supabase
          .from("clientes_administradoras")
          .select("*")
          .eq("id", clienteId)
          .single()
        clienteData = data
      } else {
        // Buscar da proposta
        const { data } = await supabase
          .from("propostas")
          .select("*")
          .eq("id", clienteId)
          .single()
        clienteData = data
      }

      if (!clienteData) {
        throw new Error("Cliente não encontrado")
      }

      // Verificar se já existe cliente no Asaas
      if (clienteData.asaas_customer_id) {
        return clienteData.asaas_customer_id
      }

      // Criar cliente no Asaas
      AsaasServiceInstance.setApiKey(apiKey)

      const asaasCustomer: AsaasCustomer = {
        name: clienteData.nome || clienteData.nome_cliente || "Cliente",
        cpfCnpj: (clienteData.cpf || clienteData.cpf_cliente || "").replace(/\D/g, ""),
        email: clienteData.email || clienteData.email_cliente,
        phone: clienteData.telefone || clienteData.telefone_cliente,
        externalReference: clienteId,
      }

      const customer = await AsaasServiceInstance.createCustomer(asaasCustomer)

      // Salvar customer_id no banco
      if (clienteTipo === "cliente_administradora") {
        await supabase
          .from("clientes_administradoras")
          .update({ asaas_customer_id: customer.id })
          .eq("id", clienteId)
      } else {
        await supabase
          .from("propostas")
          .update({ asaas_customer_id: customer.id })
          .eq("id", clienteId)
      }

      return customer.id
    } catch (error: any) {
      console.error("Erro ao obter/criar cliente Asaas:", error)
      throw error
    }
  }

  /**
   * Gerar boleto bancário (estrutura básica - será expandida conforme necessário)
   */
  private static async gerarBoletoBancario(
    dados: DadosFatura,
    config: ConfiguracaoFaturamento,
    contaCedente: any
  ): Promise<{
    numero_boleto: string
    linha_digitavel: string
    boleto_url: string
  }> {
    // Por enquanto, retornar estrutura básica
    // A integração real com cada banco será implementada conforme necessário
    // Exemplos: Banco do Brasil, Bradesco, Itaú, etc.

    const numeroBoleto = `000${Date.now()}`
    const linhaDigitavel = this.gerarLinhaDigitavel(numeroBoleto, contaCedente)

    return {
      numero_boleto: numeroBoleto,
      linha_digitavel: linhaDigitavel,
      boleto_url: `/api/boletos/${numeroBoleto}`, // URL para gerar PDF do boleto
    }
  }

  /**
   * Gerar linha digitável do boleto (formato básico)
   */
  private static gerarLinhaDigitavel(numeroBoleto: string, contaCedente: any): string {
    // Implementação básica - será expandida conforme necessário
    // Cada banco tem seu próprio formato de linha digitável
    const bancoCodigo = contaCedente.banco || "000"
    const agencia = contaCedente.agencia.replace(/\D/g, "").padStart(4, "0")
    const conta = contaCedente.conta.replace(/\D/g, "").padStart(10, "0")
    const nossoNumero = numeroBoleto.padStart(10, "0")

    // Formato simplificado: banco(3) + agencia(4) + conta(10) + nossoNumero(10) + DV(1)
    const linha = `${bancoCodigo}${agencia}${conta}${nossoNumero}`
    const dv = this.calcularDVModulo10(linha)

    return `${linha}${dv}`.replace(/(\d{5})(\d{5})(\d{5})(\d{5})(\d{5})(\d{1})/, "$1.$2 $3.$4 $5.$6")
  }

  /**
   * Calcular dígito verificador módulo 10
   */
  private static calcularDVModulo10(numero: string): string {
    let soma = 0
    let multiplicador = 2

    for (let i = numero.length - 1; i >= 0; i--) {
      let digito = parseInt(numero[i]) * multiplicador
      if (digito > 9) {
        digito = Math.floor(digito / 10) + (digito % 10)
      }
      soma += digito
      multiplicador = multiplicador === 2 ? 1 : 2
    }

    const resto = soma % 10
    return resto === 0 ? "0" : String(10 - resto)
  }

  /**
   * Buscar configuração de faturamento por ID
   */
  static async buscarConfiguracaoPorId(configId: string): Promise<ConfiguracaoFaturamento | null> {
    return await ConfiguracaoFaturamentoService.buscarPorId(configId)
  }

  /**
   * Obter dados do cliente (administradora_id, proposta_id, cliente_administradora_id)
   */
  private static async obterDadosCliente(
    clienteId: string,
    clienteTipo: "proposta" | "cliente_administradora"
  ): Promise<{
    administradora_id: string
    proposta_id: string
    cliente_administradora_id: string
  }> {
    if (clienteTipo === "cliente_administradora") {
      const { data: clienteAdmin, error } = await supabase
        .from("clientes_administradoras")
        .select("id, administradora_id, proposta_id")
        .eq("id", clienteId)
        .single()

      if (error || !clienteAdmin) {
        throw new Error("Cliente administradora não encontrado")
      }

      return {
        administradora_id: clienteAdmin.administradora_id,
        proposta_id: clienteAdmin.proposta_id || clienteId,
        cliente_administradora_id: clienteAdmin.id,
      }
    } else {
      // Buscar da proposta
      const { data: proposta, error } = await supabase
        .from("propostas")
        .select("id, administradora_id")
        .eq("id", clienteId)
        .single()

      if (error || !proposta) {
        throw new Error("Proposta não encontrada")
      }

      // Buscar cliente_administradora relacionado
      const { data: clienteAdmin } = await supabase
        .from("clientes_administradoras")
        .select("id")
        .eq("proposta_id", proposta.id)
        .maybeSingle()

      return {
        administradora_id: proposta.administradora_id || "",
        proposta_id: proposta.id,
        cliente_administradora_id: clienteAdmin?.id || proposta.id,
      }
    }
  }
}
