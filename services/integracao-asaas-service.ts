import AsaasServiceInstance from "./asaas-service"
import { type AsaasCustomer, type AsaasCharge } from "./asaas-service"
import { supabase } from "@/lib/supabase"
import { buscarPropostaCompleta } from "./propostas-service-unificado"

export interface DadosClienteParaAsaas {
  proposta_id: string
  administradora_id: string
  valor_mensal: number
  data_vencimento: string
  data_vigencia: string
  dia_vencimento: number
  gerar_fatura?: boolean
  criar_assinatura?: boolean
  cliente_administradora_id?: string // ID do registro em clientes_administradoras (se já criado)
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

export interface ResultadoIntegracaoAsaas {
  cliente_asaas_id: string
  fatura_asaas_id: string
  assinatura_asaas_id?: string
  boleto_url?: string
  fatura_url?: string
  sucesso: boolean
  erros: string[]
}

/**
 * Serviço para integração automática com Asaas
 * Cadastra cliente, gera fatura e cria assinatura
 */
export class IntegracaoAsaasService {
  /**
   * Integração completa: Cliente + Fatura + Assinatura
   */
  static async integrarClienteCompleto(
    dados: DadosClienteParaAsaas
  ): Promise<ResultadoIntegracaoAsaas> {
    const resultado: ResultadoIntegracaoAsaas = {
      cliente_asaas_id: "",
      fatura_asaas_id: "",
      assinatura_asaas_id: "",
      sucesso: false,
      erros: []
    }

    try {
      console.log("🚀 Iniciando integração completa com Asaas...")
      console.log("📋 Dados:", dados)

      // 1. Buscar dados completos da proposta
      console.log("🔍 Buscando proposta:", dados.proposta_id)
      const proposta = await buscarPropostaCompleta(dados.proposta_id)
      if (!proposta) {
        console.error("❌ Proposta não encontrada:", dados.proposta_id)
        
        // Verificar se o cliente já foi cadastrado (pode ser que a proposta não exista mas o cliente sim)
        if (dados.cliente_administradora_id) {
          console.log("🔍 Verificando se cliente já foi cadastrado no Asaas...")
          const { data: clienteAdmin } = await supabase
            .from("clientes_administradoras")
            .select("asaas_customer_id")
            .eq("id", dados.cliente_administradora_id)
            .single()
          
          if (clienteAdmin?.asaas_customer_id) {
            console.log("✅ Cliente já cadastrado no Asaas:", clienteAdmin.asaas_customer_id)
            resultado.cliente_asaas_id = clienteAdmin.asaas_customer_id
            resultado.erros.push("Proposta não encontrada, mas cliente já cadastrado no Asaas")
            // Continuar com a integração usando os dados fornecidos
            // Mas sem os dados da proposta, não podemos continuar completamente
            throw new Error("Proposta não encontrada. Não é possível continuar a integração sem os dados da proposta.")
          }
        }
        
        throw new Error(`Proposta não encontrada: ${dados.proposta_id}. Verifique se a proposta existe no banco de dados.`)
      }

      // 2. Buscar configuração da administradora no Asaas
      const configAsaas = await this.buscarConfiguracaoAsaas(dados.administradora_id)
      if (!configAsaas) {
        throw new Error("Configuração do Asaas não encontrada para esta administradora")
      }

      // 3. Cadastrar cliente no Asaas
      console.log("👤 Cadastrando cliente no Asaas...")
      const clienteAsaas = await this.cadastrarClienteNoAsaas(proposta, configAsaas)
      resultado.cliente_asaas_id = clienteAsaas.id

      // 4. Salvar customer_id no banco
      await this.salvarCustomerId(dados.proposta_id, clienteAsaas.id)

      // 5. Gerar primeira fatura (se solicitado)
      if (dados.gerar_fatura !== false) {
        console.log("💰 Gerando primeira fatura...")
        console.log("   Proposta ID:", dados.proposta_id)
        console.log("   Administradora ID:", dados.administradora_id)
        console.log("   Cliente Admin ID (recebido):", dados.cliente_administradora_id)
        
        try {
          // Verificar se já existe fatura antes de criar no Asaas (evitar duplicação)
          const vencimentoFatura = dados.fatura_vencimento || dados.data_vencimento
          console.log("   Vencimento da fatura:", vencimentoFatura)
          
          let clienteAdminId = dados.cliente_administradora_id
          let faturaExistente: any = null
          
          // Se não tiver cliente_administradora_id, buscar
          if (!clienteAdminId) {
            console.log("   ⚠️ cliente_administradora_id não fornecido, buscando...")
            const { data: clienteAdmin, error: erroBusca } = await supabase
              .from("clientes_administradoras")
              .select("id")
              .eq("proposta_id", dados.proposta_id)
              .eq("administradora_id", dados.administradora_id)
              .maybeSingle()
            
            if (erroBusca) {
              console.error("   ❌ Erro ao buscar cliente_administradora:", erroBusca)
            }
            
            if (clienteAdmin) {
              clienteAdminId = clienteAdmin.id
              console.log("   ✅ Cliente Admin encontrado:", clienteAdminId)
            } else {
              console.log("   ⚠️ Cliente Admin não encontrado ainda, pode ser race condition")
            }
          } else {
            console.log("   ✅ Usando cliente_administradora_id fornecido:", clienteAdminId)
          }
          
          // Verificar se já existe fatura com mesmo cliente e vencimento
          if (clienteAdminId) {
            console.log("   🔍 Verificando faturas existentes...")
            console.log("      - Cliente Admin ID:", clienteAdminId)
            console.log("      - Vencimento:", vencimentoFatura)
            
            const { data: faturas, error: erroBuscaFaturas } = await supabase
              .from("faturas")
              .select("id, asaas_charge_id, vencimento, cliente_administradora_id")
              .eq("cliente_administradora_id", clienteAdminId)
              .eq("vencimento", vencimentoFatura)
            
            if (erroBuscaFaturas) {
              console.error("   ❌ Erro ao buscar faturas:", erroBuscaFaturas)
            }
            
            if (faturas && faturas.length > 0) {
              faturaExistente = faturas[0]
              console.log("   ⚠️ Fatura(s) já existe(m) no banco:")
              console.log("      - Total encontradas:", faturas.length)
              console.log("      - Primeira fatura ID:", faturaExistente.id)
              console.log("      - asaas_charge_id:", faturaExistente.asaas_charge_id || "NÃO TEM")
              console.log("      - Vencimento:", faturaExistente.vencimento)
              console.log("   🛑 PULANDO criação no Asaas para evitar duplicação")
              
              if (faturaExistente.asaas_charge_id) {
                resultado.fatura_asaas_id = faturaExistente.asaas_charge_id
                console.log("   ✅ Usando fatura existente do Asaas:", faturaExistente.asaas_charge_id)
                // Não criar nova fatura, mas continuar para criar assinatura se necessário
                // Não fazer return aqui, apenas pular a criação da fatura
              } else {
                console.log("   ⚠️ Fatura existe mas não tem asaas_charge_id, criando no Asaas...")
                // Continuar com a criação normal
              }
            } else {
              console.log("   ✅ Nenhuma fatura encontrada, prosseguindo com criação")
            }
          } else {
            console.log("   ⚠️ cliente_administradora_id ainda não disponível, prosseguindo (pode causar duplicação)")
          }
          
          // Só criar no Asaas se não encontrou fatura existente ou se não tem asaas_charge_id
          if (!faturaExistente || !faturaExistente.asaas_charge_id) {
            // Verificar novamente ANTES de criar no Asaas (double-check para evitar race condition)
            if (clienteAdminId) {
              console.log("   🔍 Double-check: Verificando faturas novamente antes de criar no Asaas...")
              const { data: faturasDoubleCheck } = await supabase
                .from("faturas")
                .select("id, asaas_charge_id")
                .eq("cliente_administradora_id", clienteAdminId)
                .eq("vencimento", vencimentoFatura)
                .limit(1)
              
              if (faturasDoubleCheck && faturasDoubleCheck.length > 0) {
                const faturaDoubleCheck = faturasDoubleCheck[0]
                console.log("   ⚠️ Double-check: Fatura encontrada durante verificação final!")
                console.log("      - Fatura ID:", faturaDoubleCheck.id)
                console.log("      - asaas_charge_id:", faturaDoubleCheck.asaas_charge_id || "NÃO TEM")
                console.log("   🛑 PULANDO criação no Asaas (race condition detectada)")
                
                if (faturaDoubleCheck.asaas_charge_id) {
                  resultado.fatura_asaas_id = faturaDoubleCheck.asaas_charge_id
                  console.log("   ✅ Usando fatura existente do Asaas:", faturaDoubleCheck.asaas_charge_id)
                }
                // Pular criação
              } else {
                console.log("   ✅ Double-check: Nenhuma fatura encontrada, prosseguindo com criação")
                
                console.log("   🚀 Criando fatura no Asaas...")
                const faturaAsaas = await this.gerarFaturaInicial(
                  clienteAsaas.id,
                  dados,
                  proposta,
                  configAsaas
                )
                console.log("   ✅ Fatura criada no Asaas:", faturaAsaas.id)
                
                resultado.fatura_asaas_id = faturaAsaas.id
                resultado.boleto_url = faturaAsaas.bankSlipUrl || undefined
                resultado.fatura_url = faturaAsaas.invoiceUrl

                // Salvar fatura no banco (já tem verificação de duplicação dentro)
                console.log("   💾 Salvando fatura no banco...")
                await this.salvarFaturaNoBanco(faturaAsaas, dados, proposta)
                console.log("   ✅ Fatura gerada e salva com sucesso!")
              }
            } else {
              // Se não tem clienteAdminId, criar normalmente (mas pode causar duplicação)
              console.log("   ⚠️ cliente_administradora_id não disponível, criando sem verificação final")
              console.log("   🚀 Criando fatura no Asaas...")
              const faturaAsaas = await this.gerarFaturaInicial(
                clienteAsaas.id,
                dados,
                proposta,
                configAsaas
              )
              console.log("   ✅ Fatura criada no Asaas:", faturaAsaas.id)
              
              resultado.fatura_asaas_id = faturaAsaas.id
              resultado.boleto_url = faturaAsaas.bankSlipUrl || undefined
              resultado.fatura_url = faturaAsaas.invoiceUrl

              // Salvar fatura no banco (já tem verificação de duplicação dentro)
              console.log("   💾 Salvando fatura no banco...")
              await this.salvarFaturaNoBanco(faturaAsaas, dados, proposta)
              console.log("   ✅ Fatura gerada e salva com sucesso!")
            }
          } else {
            console.log("   ⏭️ Fatura já existe, pulando criação")
          }
        } catch (faturaError: any) {
          console.error("❌ Erro ao gerar fatura:", faturaError)
          resultado.erros.push(`Erro ao gerar fatura: ${faturaError.message}`)
          // Continua mesmo se a fatura falhar
        }
      } else {
        console.log("⏭️ Geração de fatura pulada (não solicitada)")
      }

      // 6. Criar assinatura para faturamento recorrente (se solicitado)
      // IMPORTANTE: Com a nova lógica do wizard, não é mais possível criar fatura + assinatura ao mesmo tempo
      // Se criar_assinatura = true, significa que o usuário escolheu "Recorrente" e não "Fatura Única"
      if (dados.criar_assinatura === true) {
        console.log("🔄 Criando assinatura para faturamento recorrente...")
        console.log("   ℹ️ A assinatura criará automaticamente a primeira fatura")
        try {
          const assinaturaAsaas = await this.criarAssinaturaRecorrente(
            clienteAsaas.id,
            dados,
            proposta,
            configAsaas
          )
          resultado.assinatura_asaas_id = assinaturaAsaas.id
          console.log("✅ Assinatura criada com sucesso!")
        } catch (assinaturaError: any) {
          console.error("❌ Erro ao criar assinatura:", assinaturaError)
          resultado.erros.push(`Erro ao criar assinatura: ${assinaturaError.message}`)
          // Continua mesmo se a assinatura falhar
        }
      } else {
        console.log("⏭️ Criação de assinatura pulada (não solicitada)")
      }

      // Considerar sucesso se pelo menos o cliente foi cadastrado
      resultado.sucesso = !!resultado.cliente_asaas_id
      console.log("✅ Integração concluída! Cliente cadastrado:", resultado.cliente_asaas_id)

      return resultado

    } catch (error: any) {
      console.error("❌ Erro na integração com Asaas:", error)
      resultado.erros.push(error.message)
      return resultado
    }
  }

  /**
   * Buscar configuração do Asaas para a administradora
   */
  private static async buscarConfiguracaoAsaas(administradora_id: string) {
    try {
      console.log("🔍 [ASAAS CONFIG] Buscando configuração para administradora:", administradora_id)
      console.log("🔍 [ASAAS CONFIG] Tipo do administradora_id:", typeof administradora_id)
      console.log("🔍 [ASAAS CONFIG] Tamanho do administradora_id:", administradora_id.length)
      console.log("🔍 [ASAAS CONFIG] Supabase client inicializado:", !!supabase)
      
      // Primeiro, vamos verificar se existe algum registro para esta administradora
      console.log("🔍 [ASAAS CONFIG] Verificando se existe algum registro...")
      const { data: countData, error: countError, count } = await supabase
        .from("administradoras_config_financeira")
        .select("administradora_id, status_integracao, ambiente", { count: 'exact' })
        .eq("administradora_id", administradora_id)
      
      console.log("📊 [ASAAS CONFIG] Verificação de existência:", { countData, countError, count })
      console.log("📊 [ASAAS CONFIG] Count retornado:", count)
      if (countData && countData.length > 0) {
        console.log("📊 [ASAAS CONFIG] Primeiro registro encontrado:", countData[0])
      }
      
      // Primeiro, vamos tentar a query exata
      console.log("🔍 [ASAAS CONFIG] Executando query com filtro status_integracao = 'ativa'")
      const { data, error } = await supabase
        .from("administradoras_config_financeira")
        .select("api_key, ambiente, status_integracao")
        .eq("administradora_id", administradora_id)
        .eq("status_integracao", "ativa")
        .maybeSingle()

      console.log("📊 [ASAAS CONFIG] Resultado da busca:", { data, error })
      console.log("📊 [ASAAS CONFIG] Data existe:", !!data)
      console.log("📊 [ASAAS CONFIG] Error existe:", !!error)

      if (error) {
        console.error("❌ [ASAAS CONFIG] Erro na query:", error)
        console.error("❌ [ASAAS CONFIG] Erro code:", error?.code)
        console.error("❌ [ASAAS CONFIG] Erro message:", error?.message)
        console.error("❌ [ASAAS CONFIG] Erro details:", error?.details)
        
        // Se der erro ou não encontrou, vamos tentar sem o filtro de status
        console.log("🔍 [ASAAS CONFIG] Tentando query alternativa sem filtro de status...")
        const { data: dataAlt, error: errorAlt } = await supabase
          .from("administradoras_config_financeira")
          .select("api_key, ambiente, status_integracao")
          .eq("administradora_id", administradora_id)
          .maybeSingle()
          
        console.log("📊 [ASAAS CONFIG] Resultado query alternativa:", { dataAlt, errorAlt })
        
        if (dataAlt && dataAlt.api_key) {
          console.log("✅ [ASAAS CONFIG] Configuração encontrada na query alternativa!")
          console.log("✅ [ASAAS CONFIG] Status atual:", dataAlt.status_integracao)
          console.log("✅ [ASAAS CONFIG] API Key length:", dataAlt.api_key?.length)
          console.log("✅ [ASAAS CONFIG] Ambiente:", dataAlt.ambiente)
          
          return {
            api_key: dataAlt.api_key,
            ambiente: dataAlt.ambiente || "producao"
          }
        }
        
        return null
      }

      if (!data) {
        console.error("❌ [ASAAS CONFIG] Nenhum dado retornado")
        return null
      }

      console.log("✅ [ASAAS CONFIG] Configuração encontrada!")
      console.log("✅ [ASAAS CONFIG] API Key length:", data.api_key?.length || 0)
      console.log("✅ [ASAAS CONFIG] Ambiente:", data.ambiente)
      console.log("✅ [ASAAS CONFIG] Status:", data.status_integracao)

      return {
        api_key: data.api_key,
        ambiente: data.ambiente || "producao"
      }
    } catch (error) {
      console.error("❌ [ASAAS CONFIG] Erro ao buscar configuração Asaas:", error)
      return null
    }
  }

  /**
   * Cadastrar cliente no Asaas
   */
  private static async cadastrarClienteNoAsaas(proposta: any, configAsaas: { api_key: string, ambiente: string }): Promise<AsaasCustomer> {
    // Configurar API Key e ambiente antes de usar
    AsaasServiceInstance.setApiKey(configAsaas.api_key, configAsaas.ambiente)
    
    const clienteData: AsaasCustomer = {
      name: proposta.nome,
      cpfCnpj: proposta.cpf?.replace(/\D/g, '') || '',
      email: proposta.email,
      phone: proposta.telefone?.replace(/\D/g, '') || '',
      mobilePhone: proposta.telefone?.replace(/\D/g, '') || '',
      address: proposta.endereco || '',
      addressNumber: proposta.numero || '',
      complement: proposta.complemento || '',
      province: proposta.bairro || '',
      postalCode: proposta.cep?.replace(/\D/g, '') || '',
      externalReference: proposta.id.toString(),
      observations: `Cliente cadastrado via sistema - Proposta ${proposta.id}`
    }

    console.log("📤 Dados do cliente para Asaas:", clienteData)
    
    const cliente = await AsaasServiceInstance.createCustomer(clienteData)
    console.log("✅ Cliente cadastrado no Asaas:", cliente.id)
    
    return cliente
  }

  /**
   * Salvar customer_id no banco
   */
  private static async salvarCustomerId(proposta_id: string, customer_id: string) {
    try {
      const { error } = await supabase
        .from("clientes_administradoras")
        .update({ asaas_customer_id: customer_id })
        .eq("proposta_id", proposta_id)

      if (error) {
        console.error("❌ Erro ao salvar customer_id:", error)
        throw error
      }

      console.log("✅ Customer ID salvo no banco:", customer_id)
    } catch (error) {
      console.error("❌ Erro ao salvar customer_id:", error)
      throw error
    }
  }

  /**
   * Gerar primeira fatura no Asaas
   */
  private static async gerarFaturaInicial(
    customerId: string,
    dados: DadosClienteParaAsaas,
    proposta: any,
    configAsaas: { api_key: string, ambiente: string }
  ) {
    // Configurar API Key e ambiente antes de usar
    AsaasServiceInstance.setApiKey(configAsaas.api_key, configAsaas.ambiente)
    
    // Usar valores específicos da fatura se fornecidos, senão usar valores padrão
    const valorFatura = dados.fatura_valor || dados.valor_mensal
    const vencimentoFatura = dados.fatura_vencimento || dados.data_vencimento
    // IMPORTANTE: Usar a descrição fornecida no wizard, senão usar padrão
    const descricaoFatura = dados.fatura_descricao || `Plano ${proposta.produto_nome || 'Saúde'} - ${proposta.nome}`
    
    console.log("📝 Descrição da fatura:")
    console.log("   - Descrição fornecida (fatura_descricao):", dados.fatura_descricao || "NÃO FORNECIDA")
    console.log("   - Descrição que será usada:", descricaoFatura)
    
    const faturaData: AsaasCharge = {
      customer: customerId,
      billingType: 'BOLETO',
      value: valorFatura,
      dueDate: vencimentoFatura,
      description: descricaoFatura,
      externalReference: `proposta_${proposta.id}_fatura_inicial`
      // Removido postalService: true para evitar erro quando a data de entrega calculada ultrapassa o vencimento
    }
    
    // Adicionar juros se fornecido
    if (dados.fatura_juros && dados.fatura_juros > 0) {
      faturaData.interest = {
        value: dados.fatura_juros,
        type: 'PERCENTAGE'
      }
      console.log(`📊 Juros configurado: ${dados.fatura_juros}% ao mês`)
    }
    
    // Adicionar multa se fornecido
    if (dados.fatura_multa && dados.fatura_multa > 0) {
      faturaData.fine = {
        value: dados.fatura_multa,
        type: 'PERCENTAGE'
      }
      console.log(`📊 Multa configurada: ${dados.fatura_multa}%`)
    }

    console.log("📤 Dados da fatura para Asaas:", JSON.stringify(faturaData, null, 2))
    console.log("🔑 Customer ID:", customerId)
    console.log("💰 Valor:", valorFatura)
    console.log("📅 Data vencimento:", vencimentoFatura)
    
    try {
      const fatura = await AsaasServiceInstance.createCharge(faturaData)
      console.log("✅ Fatura criada no Asaas com sucesso!")
      console.log("📋 Fatura ID:", fatura.id)
      console.log("🔗 URL do boleto:", fatura.bankSlipUrl || "Não disponível")
      console.log("🔗 URL da fatura:", fatura.invoiceUrl || "Não disponível")
      console.log("📊 Status:", fatura.status)
      
      return fatura
    } catch (error: any) {
      console.error("❌ Erro detalhado ao criar fatura no Asaas:")
      console.error("   Mensagem:", error.message)
      console.error("   Stack:", error.stack)
      throw error
    }
  }

  /**
   * Salvar fatura no banco local
   */
  private static async salvarFaturaNoBanco(
    faturaAsaas: any,
    dados: DadosClienteParaAsaas,
    proposta: any
  ) {
    try {
      let clienteAdminId: string
      
      // Se o ID já foi passado, usar diretamente (evita race condition)
      if (dados.cliente_administradora_id) {
        console.log("✅ Usando cliente_administradora_id passado diretamente:", dados.cliente_administradora_id)
        clienteAdminId = dados.cliente_administradora_id
      } else {
        // Caso contrário, buscar no banco (backward compatibility)
        console.log("🔍 Buscando cliente_administradora_id...")
        console.log("   proposta_id:", dados.proposta_id)
        console.log("   administradora_id:", dados.administradora_id)
        
        // Buscar o ID correto de clientes_administradoras com retry
        let clienteAdmin = null
        let tentativas = 0
        const maxTentativas = 5
        const delayInicial = 1000 // 1 segundo
        
        while (tentativas < maxTentativas && !clienteAdmin) {
          tentativas++
          const delay = delayInicial * tentativas // Delay crescente: 1s, 2s, 3s, 4s, 5s
          
          console.log(`   Tentativa ${tentativas}/${maxTentativas} (aguardando ${delay}ms)...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          const { data, error: erroBusca } = await supabase
            .from("clientes_administradoras")
            .select("id")
            .eq("proposta_id", dados.proposta_id)
            .eq("administradora_id", dados.administradora_id)
            .single()

          if (!erroBusca && data) {
            clienteAdmin = data
            console.log(`✅ Cliente_administradora encontrado na tentativa ${tentativas}:`, clienteAdmin.id)
            break
          } else {
            console.log(`   ⚠️ Tentativa ${tentativas} falhou:`, erroBusca?.message || 'Registro não encontrado')
          }
        }

        if (!clienteAdmin) {
          console.error("❌ Erro ao buscar cliente_administradora após", maxTentativas, "tentativas:")
          console.error("   proposta_id:", dados.proposta_id)
          console.error("   administradora_id:", dados.administradora_id)
          throw new Error(`Cliente não encontrado em clientes_administradoras após ${maxTentativas} tentativas. Verifique se o vínculo foi criado corretamente.`)
        }
        
        clienteAdminId = clienteAdmin.id
      }
      
      const vencimentoFatura = dados.fatura_vencimento || dados.data_vencimento
      const valorFatura = dados.fatura_valor || dados.valor_mensal
      
      console.log("📝 Tentando inserir fatura no banco:")
      console.log("   - cliente_administradora_id:", clienteAdminId)
      console.log("   - administradora_id:", dados.administradora_id)
      console.log("   - valor:", valorFatura)
      console.log("   - vencimento:", vencimentoFatura)
      console.log("   - asaas_charge_id:", faturaAsaas.id)
      
      // Verificar se já existe uma fatura com o mesmo asaas_charge_id (evitar duplicação)
      const { data: faturaExistente, error: erroBusca } = await supabase
        .from("faturas")
        .select("id, asaas_charge_id, vencimento, cliente_administradora_id")
        .eq("asaas_charge_id", faturaAsaas.id)
        .maybeSingle()
      
      if (faturaExistente) {
        console.log("⚠️ Fatura já existe no banco com este asaas_charge_id:", faturaExistente.id)
        console.log("   Pulando inserção para evitar duplicação")
        return faturaExistente
      }
      
      // Verificar se já existe uma fatura com mesmo cliente e vencimento (evitar duplicação)
      // IMPORTANTE: Verificar ANTES de inserir para evitar criar duas faturas
      // Usar .limit(1) para garantir que pegamos apenas uma, mesmo se houver múltiplas
      const { data: faturasMesmoVencimento, error: erroBuscaVencimento } = await supabase
        .from("faturas")
        .select("id, vencimento, asaas_charge_id, cliente_administradora_id")
        .eq("cliente_administradora_id", clienteAdminId)
        .eq("vencimento", vencimentoFatura)
        .limit(1)
      
      if (faturasMesmoVencimento && faturasMesmoVencimento.length > 0) {
        const faturaMesmoVencimento = faturasMesmoVencimento[0]
        console.log("⚠️ Já existe uma fatura para este cliente com o mesmo vencimento:", faturaMesmoVencimento.id)
        console.log("   Cliente ID:", clienteAdminId)
        console.log("   Vencimento:", vencimentoFatura)
        console.log("   Total de faturas encontradas:", faturasMesmoVencimento.length)
        console.log("   Pulando inserção para evitar duplicação")
        
        // Se a fatura existente não tem asaas_charge_id, atualizar com o novo
        if (!faturaMesmoVencimento.asaas_charge_id) {
          console.log("   Atualizando fatura existente com asaas_charge_id...")
          const { error: erroUpdate } = await supabase
            .from("faturas")
            .update({
              asaas_charge_id: faturaAsaas.id,
              asaas_boleto_url: faturaAsaas.bankSlipUrl || null,
              asaas_invoice_url: faturaAsaas.invoiceUrl || null,
              asaas_payment_link: faturaAsaas.paymentLink || null,
              boleto_codigo: faturaAsaas.nossoNumero || null,
              boleto_linha_digitavel: faturaAsaas.identificationField || null,
              updated_at: new Date().toISOString()
            })
            .eq("id", faturaMesmoVencimento.id)
          
          if (erroUpdate) {
            console.error("❌ Erro ao atualizar fatura existente:", erroUpdate)
          } else {
            console.log("✅ Fatura existente atualizada com sucesso")
          }
        } else {
          console.log("⚠️ Fatura existente já tem asaas_charge_id:", faturaMesmoVencimento.asaas_charge_id)
          console.log("   Não atualizando para evitar sobrescrever dados")
        }
        return faturaMesmoVencimento
      }
      
      console.log("✅ Nenhuma fatura duplicada encontrada, prosseguindo com inserção...")
      console.log("   Cliente ID:", clienteAdminId)
      console.log("   Vencimento:", vencimentoFatura)
      
      const dadosInsert = {
        cliente_administradora_id: clienteAdminId,
        administradora_id: dados.administradora_id,
        cliente_id: proposta.cpf,
        cliente_nome: proposta.nome,
        cliente_email: proposta.email,
        cliente_telefone: proposta.telefone || proposta.celular || null,
        numero_fatura: `INI-${proposta.id}-${new Date().getFullYear()}`,
        valor: dados.fatura_valor || dados.valor_mensal,
        vencimento: vencimentoFatura,
        status: "pendente",
        asaas_charge_id: faturaAsaas.id,
        asaas_boleto_url: faturaAsaas.bankSlipUrl || null,
        asaas_invoice_url: faturaAsaas.invoiceUrl || null,
        asaas_payment_link: faturaAsaas.paymentLink || null,
        boleto_codigo: faturaAsaas.nossoNumero || null,
        boleto_linha_digitavel: faturaAsaas.identificationField || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log("📋 Dados completos do insert:", JSON.stringify(dadosInsert, null, 2))
      
      const { data: faturaSalva, error } = await supabase
        .from("faturas")
        .insert(dadosInsert)
        .select()
        .single()

      if (error) {
        console.error("❌ Erro ao salvar fatura no banco:")
        console.error("   Código:", error.code)
        console.error("   Mensagem:", error.message)
        console.error("   Detalhes:", error.details)
        console.error("   Hint:", error.hint)
        throw error
      }

      console.log("✅ Fatura salva no banco local com sucesso!")
      console.log("   ID da fatura:", faturaSalva?.id)
      console.log("   Número da fatura:", faturaSalva?.numero_fatura)
      console.log("   asaas_charge_id:", faturaSalva?.asaas_charge_id)
      console.log("   cliente_administradora_id:", faturaSalva?.cliente_administradora_id)
      console.log("   Valor:", faturaSalva?.valor)
      console.log("   Vencimento:", faturaSalva?.vencimento)
      
      // Verificação final: confirmar que a fatura foi salva corretamente
      if (!faturaSalva?.id) {
        console.error("❌ ERRO CRÍTICO: Fatura não foi retornada após inserção!")
        throw new Error("Fatura não foi criada corretamente no banco de dados")
      }
      
      if (!faturaSalva?.cliente_administradora_id) {
        console.error("❌ ERRO CRÍTICO: Fatura salva sem cliente_administradora_id!")
        console.error("   Tentando corrigir...")
        
        // Tentar atualizar a fatura com o cliente_administradora_id
        const { error: erroUpdate } = await supabase
          .from("faturas")
          .update({ cliente_administradora_id: clienteAdminId })
          .eq("id", faturaSalva.id)
        
        if (erroUpdate) {
          console.error("❌ Erro ao corrigir cliente_administradora_id:", erroUpdate)
          throw new Error("Fatura foi criada mas sem cliente_administradora_id e não foi possível corrigir")
        } else {
          console.log("✅ Fatura corrigida com cliente_administradora_id")
          // Buscar a fatura atualizada
          const { data: faturaCorrigida } = await supabase
            .from("faturas")
            .select("*")
            .eq("id", faturaSalva.id)
            .single()
          
          return faturaCorrigida || faturaSalva
        }
      }
      
      // Retornar a fatura salva para garantir que foi criada
      return faturaSalva
    } catch (error) {
      console.error("❌ Erro ao salvar fatura:", error)
      throw error
    }
  }

  /**
   * Criar assinatura para faturamento recorrente
   */
  private static async criarAssinaturaRecorrente(
    customerId: string,
    dados: DadosClienteParaAsaas,
    proposta: any,
    configAsaas: { api_key: string, ambiente: string }
  ) {
    try {
      // Configurar API Key e ambiente antes de usar
      AsaasServiceInstance.setApiKey(configAsaas.api_key, configAsaas.ambiente)
      
      // Calcular próximo vencimento
      const proximoVencimento = this.calcularProximoVencimento(dados.data_vencimento, dados.dia_vencimento)
      
      // Criar assinatura no Asaas
      // Usar descrição do wizard se fornecida, senão usar padrão
      const descricaoAssinatura = dados.assinatura_descricao || dados.fatura_descricao
        ? (dados.assinatura_descricao || dados.fatura_descricao)
        : `Plano ${proposta.produto_nome || 'Saúde'} - ${proposta.nome}`
      
      // Usar valor da assinatura se fornecido, senão usar valor_mensal
      const valorAssinatura = dados.assinatura_valor || dados.valor_mensal
      
      const assinaturaData: any = {
        customer: customerId,
        billingType: 'BOLETO',
        value: valorAssinatura,
        nextDueDate: proximoVencimento,
        cycle: 'MONTHLY',
        description: descricaoAssinatura,
        externalReference: `proposta_${proposta.id}_assinatura`,
        postalService: true
      }
      
      // Adicionar juros se fornecido
      if (dados.assinatura_juros && dados.assinatura_juros > 0) {
        assinaturaData.interest = {
          value: dados.assinatura_juros,
          type: 'PERCENTAGE'
        }
        console.log(`📊 Juros da assinatura configurado: ${dados.assinatura_juros}% ao mês`)
      }
      
      // Adicionar multa se fornecido
      if (dados.assinatura_multa && dados.assinatura_multa > 0) {
        assinaturaData.fine = {
          value: dados.assinatura_multa,
          type: 'PERCENTAGE'
        }
        console.log(`📊 Multa da assinatura configurada: ${dados.assinatura_multa}%`)
      }

      console.log("📤 Dados da assinatura para Asaas:", JSON.stringify(assinaturaData, null, 2))
      console.log("🔑 Customer ID:", customerId)
      console.log("💰 Valor:", dados.valor_mensal)
      console.log("📅 Próximo vencimento:", proximoVencimento)
      
      const assinatura = await AsaasServiceInstance.createSubscription(assinaturaData, configAsaas.api_key)
      console.log("✅ Assinatura criada no Asaas com sucesso!")
      console.log("📋 Assinatura ID:", assinatura.id)
      console.log("📊 Status:", assinatura.status || "N/A")
      
      return assinatura
    } catch (error: any) {
      console.error("❌ Erro detalhado ao criar assinatura no Asaas:")
      console.error("   Mensagem:", error.message)
      console.error("   Stack:", error.stack)
      throw error
    }
  }

  /**
   * Calcular próximo vencimento baseado no dia do mês
   */
  private static calcularProximoVencimento(dataVencimento: string, diaVencimento: number): string {
    const hoje = new Date()
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento)
    
    // Se o dia já passou neste mês, usar o próximo mês
    if (hoje.getDate() > diaVencimento) {
      return proximoMes.toISOString().split('T')[0]
    }
    
    // Senão, usar este mês
    const esteMes = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento)
    return esteMes.toISOString().split('T')[0]
  }

  /**
   * Integração simplificada - apenas cadastrar cliente
   */
  static async cadastrarClienteApenas(dados: DadosClienteParaAsaas): Promise<ResultadoIntegracaoAsaas> {
    const resultado: ResultadoIntegracaoAsaas = {
      cliente_asaas_id: "",
      fatura_asaas_id: "",
      sucesso: false,
      erros: []
    }

    try {
      console.log("🚀 Cadastrando apenas cliente no Asaas...")

      const proposta = await buscarPropostaCompleta(dados.proposta_id)
      if (!proposta) {
        throw new Error("Proposta não encontrada")
      }

      const configAsaas = await this.buscarConfiguracaoAsaas(dados.administradora_id)
      if (!configAsaas) {
        throw new Error("Configuração do Asaas não encontrada")
      }

      const clienteAsaas = await this.cadastrarClienteNoAsaas(proposta, configAsaas.api_key)
      resultado.cliente_asaas_id = clienteAsaas.id

      await this.salvarCustomerId(dados.proposta_id, clienteAsaas.id)

      resultado.sucesso = true
      console.log("✅ Cliente cadastrado no Asaas com sucesso!")

      return resultado

    } catch (error: any) {
      console.error("❌ Erro ao cadastrar cliente:", error)
      resultado.erros.push(error.message)
      return resultado
    }
  }
}

