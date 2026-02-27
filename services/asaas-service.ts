/**
 * Serviço de Integração com Asaas
 * Documentação oficial: https://docs.asaas.com
 */

// Interfaces para dados do Asaas
export interface AsaasCustomer {
  id?: string
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  postalCode?: string
  externalReference?: string
  notificationDisabled?: boolean
  observations?: string
}

export interface AsaasCharge {
  id?: string
  customer: string // ID do cliente no Asaas
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
  value: number
  dueDate: string // formato YYYY-MM-DD
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
  discount?: {
    value: number
    dueDateLimitDays: number
    type?: 'FIXED' | 'PERCENTAGE'
  }
  interest?: {
    value: number
    type?: 'FIXED' | 'PERCENTAGE'
  }
  fine?: {
    value: number
    type?: 'FIXED' | 'PERCENTAGE'
  }
  postalService?: boolean
  split?: Array<{
    walletId: string
    fixedValue?: number
    percentualValue?: number
  }>
}

export interface AsaasChargeResponse {
  id: string
  dateCreated: string
  customer: string
  paymentLink: string | null
  value: number
  netValue: number
  originalValue: number | null
  interestValue: number | null
  description: string | null
  billingType: string
  status: string
  dueDate: string
  originalDueDate: string
  paymentDate: string | null
  clientPaymentDate: string | null
  invoiceUrl: string
  bankSlipUrl: string | null
  transactionReceiptUrl: string | null
  invoiceNumber: string
  externalReference: string | null
  deleted: boolean
  postalService: boolean
  anticipated: boolean
  anticipable: boolean
}

export interface AsaasPaymentResponse {
  id: string
  dateCreated: string
  customer: string
  value: number
  netValue: number
  originalValue: number
  interestValue: number | null
  description: string | null
  billingType: string
  confirmedDate: string
  paymentDate: string
  creditDate: string
  estimatedCreditDate: string
  status: string
}

class AsaasService {
  private baseUrl = 'https://api.asaas.com/v3'
  private apiKey: string | null = null
  private ambiente: string = 'producao' // 'sandbox' ou 'producao'

  /**
   * Configura a API key e ambiente do Asaas
   * Pode ser obtida em: https://www.asaas.com/config/api
   */
  setApiKey(apiKey: string, ambiente: string = 'producao') {
    this.apiKey = apiKey
    this.ambiente = ambiente
    
    // Define a URL base baseada no ambiente
    if (ambiente === 'sandbox') {
      this.baseUrl = 'https://sandbox.asaas.com/api/v3'
    } else {
      // ambiente === 'producao'
      this.baseUrl = 'https://api.asaas.com/v3'
    }
    
    console.log(`🔧 [ASAAS] Ambiente configurado: ${ambiente}`)
    console.log(`🔧 [ASAAS] Base URL: ${this.baseUrl}`)
  }

  /**
   * Verifica se a API key está configurada
   */
  private checkApiKey() {
    if (!this.apiKey) {
      throw new Error('API Key do Asaas não configurada. Use setApiKey() primeiro.')
    }
  }

  /**
   * Faz uma requisição para a API do Asaas
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    this.checkApiKey()

    const keyPreview = this.apiKey
      ? `${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)} (len=${this.apiKey.length})`
      : "não configurada"
    console.log(`[ASAAS] Requisição: ${options.method || "GET"} ${this.baseUrl}${endpoint}`)
    console.log(`[ASAAS] API Key: ${keyPreview} | Ambiente: ${this.ambiente}`)

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey!,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      let errorParsed: unknown = errorBody
      try {
        errorParsed = JSON.parse(errorBody)
      } catch {
        // mantém como texto
      }
      console.error(`[ASAAS] Erro HTTP ${response.status} em ${endpoint}`)
      console.error(`[ASAAS] Resposta do Asaas:`, errorParsed)
      console.error(`[ASAAS] URL usada: ${this.baseUrl}${endpoint} (sandbox=${this.ambiente === "sandbox"})`)
      throw new Error(
        `Erro na requisição Asaas: ${response.status} - ${typeof errorParsed === "string" ? errorParsed : JSON.stringify(errorParsed)}`
      )
    }

    return response.json()
  }

  /**
   * CLIENTES
   */

  /**
   * Cria um novo cliente no Asaas
   */
  async createCustomer(customer: AsaasCustomer): Promise<AsaasCustomer> {
    console.log(`[ASAAS] createCustomer: nome=${customer.name}, cpfCnpj=${customer.cpfCnpj?.replace(/\d(?=\d{4})/g, "*")}`)
    return this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    })
  }

  /**
   * Busca um cliente por ID
   */
  async getCustomer(customerId: string): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>(`/customers/${customerId}`)
  }

  /**
   * Lista todos os clientes (paginado)
   */
  async listCustomers(
    offset: number = 0,
    limit: number = 100
  ): Promise<{ data: AsaasCustomer[]; totalCount: number; hasMore: boolean; offset: number; limit: number }> {
    const params = new URLSearchParams()
    params.append('offset', offset.toString())
    params.append('limit', limit.toString())

    return this.request<{ 
      data: AsaasCustomer[]
      totalCount: number
      hasMore: boolean
      offset: number
      limit: number
    }>(`/customers?${params.toString()}`)
  }

  /**
   * Busca um cliente por CPF/CNPJ
   * Formata automaticamente o CPF/CNPJ removendo caracteres não numéricos
   */
  async getCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    // Formatar CPF/CNPJ removendo pontos, traços e espaços
    const cpfCnpjLimpo = AsaasService.formatCpfCnpj(cpfCnpj)
    console.log(`🔍 [ASAAS] Buscando cliente por CPF/CNPJ: ${cpfCnpjLimpo} (original: ${cpfCnpj})`)
    
    const response = await this.request<{ data: AsaasCustomer[] }>(
      `/customers?cpfCnpj=${cpfCnpjLimpo}`
    )
    return response.data[0] || null
  }

  /**
   * Atualiza um cliente
   */
  async updateCustomer(
    customerId: string,
    customer: Partial<AsaasCustomer>
  ): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    })
  }

  /**
   * COBRANÇAS/FATURAS
   */

  /**
   * Cria uma nova cobrança (fatura)
   */
  async createCharge(charge: AsaasCharge): Promise<AsaasChargeResponse> {
    console.log(`💰 [ASAAS] Criando cobrança (fatura)...`)
    console.log(`📋 [ASAAS] Dados da cobrança:`, JSON.stringify(charge, null, 2))
    console.log(`🌐 [ASAAS] Endpoint: ${this.baseUrl}/payments`)
    
    try {
      const resultado = await this.request<AsaasChargeResponse>('/payments', {
        method: 'POST',
        body: JSON.stringify(charge),
      })
      
      console.log(`✅ [ASAAS] Cobrança criada com sucesso!`)
      console.log(`📋 [ASAAS] Charge ID:`, resultado.id)
      console.log(`📊 [ASAAS] Status:`, resultado.status)
      console.log(`🔗 [ASAAS] URL do boleto:`, resultado.bankSlipUrl || "Não disponível")
      console.log(`🔗 [ASAAS] URL da fatura:`, resultado.invoiceUrl || "Não disponível")
      
      return resultado
    } catch (error: any) {
      console.error(`❌ [ASAAS] Erro ao criar cobrança:`)
      console.error(`   Mensagem:`, error.message)
      console.error(`   Stack:`, error.stack)
      throw error
    }
  }

  /**
   * Busca uma cobrança por ID
   */
  async getCharge(chargeId: string): Promise<AsaasChargeResponse> {
    return this.request<AsaasChargeResponse>(`/payments/${chargeId}`)
  }

  /**
   * Lista cobranças com filtros
   */
  async listCharges(filters?: {
    customer?: string
    status?: string
    billingType?: string
    dateCreatedGe?: string
    dateCreatedLe?: string
    offset?: number
    limit?: number
  }): Promise<{ data: AsaasChargeResponse[]; totalCount: number }> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString())
      })
    }

    return this.request<{ data: AsaasChargeResponse[]; totalCount: number }>(
      `/payments?${params.toString()}`
    )
  }

  /**
   * Atualiza uma cobrança
   */
  async updateCharge(
    chargeId: string,
    charge: Partial<AsaasCharge>
  ): Promise<AsaasChargeResponse> {
    return this.request<AsaasChargeResponse>(`/payments/${chargeId}`, {
      method: 'PUT',
      body: JSON.stringify(charge),
    })
  }

  /**
   * Cancela uma cobrança
   */
  async deleteCharge(chargeId: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/payments/${chargeId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Confirma o recebimento de uma cobrança manualmente
   */
  async confirmPayment(
    chargeId: string,
    paymentData: {
      paymentDate: string // formato YYYY-MM-DD
      value: number
      notifyCustomer?: boolean
    }
  ): Promise<AsaasPaymentResponse> {
    return this.request<AsaasPaymentResponse>(
      `/payments/${chargeId}/receiveInCash`,
      {
        method: 'POST',
        body: JSON.stringify(paymentData),
      }
    )
  }

  /**
   * WEBHOOKS
   */

  /**
   * Verifica a assinatura do webhook para garantir autenticidade
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Implementar verificação de assinatura conforme documentação
    // https://docs.asaas.com/docs/webhooks#verificacao-de-assinatura
    return true // Placeholder
  }

  /**
   * UTILITÁRIOS
   */

  /**
   * Formata CPF/CNPJ para o formato aceito pelo Asaas (apenas números)
   */
  static formatCpfCnpj(cpfCnpj: string): string {
    return cpfCnpj.replace(/\D/g, '')
  }

  /**
   * Formata telefone para o formato aceito pelo Asaas
   */
  static formatPhone(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  /**
   * Formata data para o formato aceito pelo Asaas (YYYY-MM-DD)
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Converte status do Asaas para status da aplicação
   */
  static convertAsaasStatus(asaasStatus: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'pendente',
      'RECEIVED': 'paga',
      'CONFIRMED': 'paga',
      'OVERDUE': 'atrasada',
      'REFUNDED': 'cancelada',
      'RECEIVED_IN_CASH': 'paga',
      'REFUND_REQUESTED': 'cancelada',
      'CHARGEBACK_REQUESTED': 'cancelada',
      'CHARGEBACK_DISPUTE': 'cancelada',
      'AWAITING_CHARGEBACK_REVERSAL': 'cancelada',
    }
    return statusMap[asaasStatus] || 'pendente'
  }

  /**
   * Criar assinatura recorrente
   */
  async createSubscription(subscriptionData: any, apiKey?: string) {
    this.checkApiKey()
    
    // Usar apiKey passado como parâmetro ou o configurado
    const keyToUse = apiKey || this.apiKey!
    
    console.log(`🔄 [ASAAS] Criando assinatura recorrente...`)
    console.log(`🔑 [ASAAS] Usando API Key (primeiros 20 chars): ${keyToUse.substring(0, 20)}...`)
    console.log(`🌐 [ASAAS] Endpoint: ${this.baseUrl}/subscriptions`)
    console.log(`📋 [ASAAS] Dados da assinatura:`, JSON.stringify(subscriptionData, null, 2))
    
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'access_token': keyToUse,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
        console.error('❌ Erro ao criar assinatura no Asaas:')
        console.error('   Status:', response.status)
        console.error('   Erro:', JSON.stringify(errorData, null, 2))
        throw new Error(`Erro ao criar assinatura: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      console.log('✅ [ASAAS] Assinatura criada com sucesso!')
      console.log('📋 [ASAAS] Assinatura ID:', data.id)
      return data
    } catch (error: any) {
      console.error('❌ [ASAAS] Erro ao criar assinatura:', error.message)
      throw error
    }
  }

  /**
   * Buscar assinatura por ID
   */
  async getSubscription(subscriptionId: string, apiKey: string) {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Erro ao buscar assinatura:', errorData)
        throw new Error(`Erro ao buscar assinatura: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      return await response.json()
    } catch (error) {
      console.error('❌ Erro ao buscar assinatura:', error)
      throw error
    }
  }

  /**
   * Cancelar assinatura
   */
  async cancelSubscription(subscriptionId: string, apiKey: string) {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Erro ao cancelar assinatura:', errorData)
        throw new Error(`Erro ao cancelar assinatura: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      console.log('✅ Assinatura cancelada:', subscriptionId)
      return data
    } catch (error) {
      console.error('❌ Erro ao cancelar assinatura:', error)
      throw error
    }
  }
}

export { AsaasService }
export default new AsaasService()
