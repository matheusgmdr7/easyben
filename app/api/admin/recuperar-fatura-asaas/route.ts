import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import AsaasServiceInstance from '@/services/asaas-service'

/**
 * API Route para recuperar faturas do Asaas e salvá-las no banco
 * Útil quando a fatura foi criada no Asaas mas não foi salva no banco
 */

async function buscarConfigAsaas(administradoraId: string): Promise<{ api_key: string; ambiente: string } | null> {
  const { data: administradora } = await supabase
    .from('administradoras')
    .select('tenant_id')
    .eq('id', administradoraId)
    .maybeSingle()

  const tenantId = administradora?.tenant_id || null
  if (tenantId) {
    const { data: financeiras } = await supabase
      .from('administradora_financeiras')
      .select('api_key, ambiente, instituicao_financeira, status_integracao, ativo')
      .eq('administradora_id', administradoraId)
      .eq('tenant_id', tenantId)
      .eq('ativo', true)

    const asaasAtual = (financeiras || []).find(
      (f: any) =>
        String(f?.instituicao_financeira || '').toLowerCase() === 'asaas' &&
        String(f?.status_integracao || '').toLowerCase() === 'ativa' &&
        !!f?.api_key
    )
    if (asaasAtual) {
      return {
        api_key: String((asaasAtual as any).api_key),
        ambiente: String((asaasAtual as any).ambiente || 'producao'),
      }
    }
  }

  const { data: legado } = await supabase
    .from('administradoras_config_financeira')
    .select('api_key, ambiente')
    .eq('administradora_id', administradoraId)
    .eq('instituicao_financeira', 'asaas')
    .eq('status_integracao', 'ativa')
    .maybeSingle()

  if (legado?.api_key) {
    return {
      api_key: String(legado.api_key),
      ambiente: String(legado.ambiente || 'producao'),
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 API Route /api/admin/recuperar-fatura-asaas chamada!")
    const body = await request.json()
    const { cliente_administradora_id, administradora_id, api_key } = body
    
    console.log("📥 Recuperando faturas do Asaas para cliente:", cliente_administradora_id)
    console.log("📥 Dados recebidos:", { cliente_administradora_id, administradora_id, api_key: api_key ? "***" : "não fornecida" })
    
    if (!cliente_administradora_id || !administradora_id) {
      return NextResponse.json(
        { 
          sucesso: false,
          erros: ['cliente_administradora_id e administradora_id são obrigatórios'] 
        },
        { status: 400 }
      )
    }

    // Buscar API key do banco se não foi fornecida
    let apiKeyToUse = api_key
    let ambienteAsaas = 'producao'
    
    if (!apiKeyToUse) {
      console.log("🔍 Buscando API key no banco...")
      const config = await buscarConfigAsaas(administradora_id)
      if (!config?.api_key) {
        return NextResponse.json(
          { 
            sucesso: false,
            erros: ['API key do Asaas não encontrada. Configure na administradora ou forneça via parâmetro.'] 
          },
          { status: 400 }
        )
      }

      apiKeyToUse = config.api_key
      ambienteAsaas = config.ambiente || 'producao'
      console.log("✅ API key encontrada no banco, ambiente:", ambienteAsaas)
    }

    // 1. Buscar dados do cliente no banco
    // Primeiro, tentar buscar na view (mesma fonte que o frontend usa)
    console.log("🔍 Buscando cliente no banco com ID:", cliente_administradora_id)
    
    let cliente: any = null
    let erroCliente: any = null
    
    // Tentar buscar na view primeiro (igual ao frontend)
    const { data: clienteView, error: erroView } = await supabase
      .from('vw_clientes_administradoras_completo')
      .select('id, proposta_id, administradora_id')
      .eq('id', cliente_administradora_id)
      .maybeSingle()

    if (!erroView && clienteView) {
      cliente = clienteView
      console.log("✅ Cliente encontrado na view:", cliente.id, "Proposta ID:", cliente.proposta_id)
    } else {
      // Se não encontrou na view, tentar na tabela diretamente
      console.log("⚠️ Cliente não encontrado na view, tentando na tabela...")
      const { data: clienteTable, error: erroTable } = await supabase
        .from('clientes_administradoras')
        .select('id, proposta_id, administradora_id')
        .eq('id', cliente_administradora_id)
        .maybeSingle()

      if (erroTable) {
        erroCliente = erroTable
      } else if (clienteTable) {
        cliente = clienteTable
        console.log("✅ Cliente encontrado na tabela:", cliente.id, "Proposta ID:", cliente.proposta_id)
      }
    }

    if (erroCliente) {
      console.error("❌ Erro ao buscar cliente:", erroCliente)
      return NextResponse.json(
        { 
          sucesso: false,
          erros: [`Erro ao buscar cliente: ${erroCliente.message}`] 
        },
        { status: 500 }
      )
    }

    if (!cliente) {
      console.error("❌ Cliente não encontrado com ID:", cliente_administradora_id)
      // Log detalhado para debug
      console.log("🔍 Debug - ID recebido:", cliente_administradora_id)
      console.log("🔍 Debug - Administradora ID:", administradora_id)
      
      // Verificar se o ID parece ser um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(cliente_administradora_id)) {
        return NextResponse.json(
          { 
            sucesso: false,
            erros: [`ID inválido: ${cliente_administradora_id}. O ID deve ser um UUID válido.`] 
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          sucesso: false,
          erros: [`Cliente não encontrado com ID: ${cliente_administradora_id}. Verifique se o ID está correto na tabela clientes_administradoras.`] 
        },
        { status: 404 }
      )
    }

    // 2. Buscar dados da proposta separadamente
    if (!cliente.proposta_id) {
      return NextResponse.json(
        { 
          sucesso: false,
          erros: ['Cliente não possui proposta_id associado'] 
        },
        { status: 404 }
      )
    }

    const { data: proposta, error: erroProposta } = await supabase
      .from('propostas')
      .select('id, nome, email, cpf, telefone')
      .eq('id', cliente.proposta_id)
      .maybeSingle()

    if (erroProposta || !proposta) {
      console.error("❌ Erro ao buscar proposta:", erroProposta)
      return NextResponse.json(
        { 
          sucesso: false,
          erros: [`Proposta não encontrada: ${erroProposta?.message || 'Proposta não existe'}`] 
        },
        { status: 404 }
      )
    }

    console.log("✅ Proposta encontrada:", proposta.nome)

    // 3. Buscar cliente no Asaas
    console.log("🔧 Configurando API key do Asaas...")
    AsaasServiceInstance.setApiKey(apiKeyToUse, ambienteAsaas)
    
    // Buscar cliente no Asaas por CPF (limpar formatação)
    const cpfLimpo = proposta.cpf?.replace(/\D/g, '') || proposta.cpf
    console.log("🔍 Buscando cliente no Asaas por CPF:", cpfLimpo)
    console.log("🔍 CPF original:", proposta.cpf)
    const asaasCustomer = await AsaasServiceInstance.getCustomerByCpfCnpj(cpfLimpo)

    if (!asaasCustomer) {
      console.error("❌ Cliente não encontrado no Asaas com CPF:", proposta.cpf)
      return NextResponse.json(
        { 
          sucesso: false,
          erros: ['Cliente não encontrado no Asaas'] 
        },
        { status: 404 }
      )
    }

    console.log("✅ Cliente encontrado no Asaas:", asaasCustomer.id)

    // 4. Buscar cobranças (faturas) do cliente no Asaas
    const chargesResponse = await AsaasServiceInstance.listCharges({
      customer: asaasCustomer.id
    })

    const charges = chargesResponse?.data || []
    console.log(`✅ Encontradas ${charges.length} cobranças no Asaas`)

    if (charges.length === 0) {
      console.warn("⚠️ Nenhuma cobrança encontrada no Asaas para este cliente")
      return NextResponse.json(
        { 
          sucesso: false,
          erros: ['Nenhuma cobrança encontrada no Asaas para este cliente'] 
        },
        { status: 404 }
      )
    }

    // 5. Para cada cobrança, verificar se já existe no banco e salvar se não existir
    const faturasSalvas = []
    const faturasExistentes = []
    const erros = []

    for (const charge of charges) {
      try {
        // Verificar se já existe no banco
        const { data: faturaExistente } = await supabase
          .from('faturas')
          .select('id, asaas_charge_id')
          .eq('asaas_charge_id', charge.id)
          .maybeSingle()

        if (faturaExistente) {
          console.log(`⚠️ Fatura já existe no banco: ${faturaExistente.id}`)
          faturasExistentes.push({
            asaas_charge_id: charge.id,
            fatura_id: faturaExistente.id
          })
          continue
        }

        // Verificar se existe com cliente_administradora_id mas sem asaas_charge_id
        // (caso de fatura criada mas sem link com Asaas)
        const vencimento = charge.dueDate ? charge.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]
        const { data: faturaSimilar } = await supabase
          .from('faturas')
          .select('id')
          .eq('cliente_administradora_id', cliente_administradora_id)
          .eq('vencimento', vencimento)
          .is('asaas_charge_id', null)
          .maybeSingle()

        if (faturaSimilar) {
          // Atualizar fatura existente com dados do Asaas
          console.log(`🔄 Atualizando fatura existente: ${faturaSimilar.id}`)
          
          // Mapear status do Asaas para nosso sistema
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
            'DUNNING_REQUESTED': 'atrasada',
            'DUNNING_RECEIVED': 'paga',
            'AWAITING_RISK_ANALYSIS': 'pendente'
          }
          
          const statusFatura = statusMap[charge.status?.toUpperCase() || ''] || 'pendente'
          console.log(`📊 Status do Asaas: ${charge.status} → Status mapeado: ${statusFatura}`)
          
          const { error: erroUpdate } = await supabase
            .from('faturas')
            .update({
              asaas_charge_id: charge.id,
              asaas_boleto_url: charge.bankSlipUrl || null,
              asaas_invoice_url: charge.invoiceUrl || null,
              asaas_payment_link: charge.paymentLink || null,
              status: statusFatura,
              updated_at: new Date().toISOString()
            })
            .eq('id', faturaSimilar.id)

          if (erroUpdate) {
            console.error(`❌ Erro ao atualizar fatura:`, erroUpdate)
            erros.push(`Erro ao atualizar fatura ${faturaSimilar.id}: ${erroUpdate.message}`)
          } else {
            faturasSalvas.push({
              asaas_charge_id: charge.id,
              fatura_id: faturaSimilar.id,
              acao: 'atualizada'
            })
          }
          continue
        }

        // Criar nova fatura no banco
        console.log(`💾 Salvando nova fatura do Asaas: ${charge.id}`)
        
        // Mapear status do Asaas para nosso sistema (mesmo mapeamento usado em importar-asaas-service.ts)
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
          'DUNNING_REQUESTED': 'atrasada',
          'DUNNING_RECEIVED': 'paga',
          'AWAITING_RISK_ANALYSIS': 'pendente'
        }
        
        const statusFatura = statusMap[charge.status?.toUpperCase() || ''] || 'pendente'
        console.log(`📊 Status do Asaas: ${charge.status} → Status mapeado: ${statusFatura}`)
        
        // Preparar dados para inserção (mesmo formato usado em integracao-asaas-service.ts e importar-asaas-service.ts)
        const valorFatura = charge.value || 0
        const dataEmissao = charge.dateCreated ? charge.dateCreated.split('T')[0] : new Date().toISOString().split('T')[0]
        
        const dadosInsert: any = {
          cliente_administradora_id: cliente_administradora_id,
          administradora_id: administradora_id,
          cliente_id: proposta.cpf,
          cliente_nome: proposta.nome,
          cliente_email: proposta.email,
          cliente_telefone: proposta.telefone || null,
          numero_fatura: charge.invoiceNumber || charge.id || `ASAAS-${charge.id?.slice(0, 8)}`,
          valor: valorFatura,
          vencimento: vencimento,
          status: statusFatura,
          asaas_charge_id: charge.id,
          asaas_boleto_url: charge.bankSlipUrl || null,
          asaas_invoice_url: charge.invoiceUrl || null,
          asaas_payment_link: charge.paymentLink || null,
          boleto_codigo: charge.nossoNumero || null,
          boleto_linha_digitavel: charge.identificationField || null,
          created_at: charge.dateCreated || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Adicionar campos opcionais se existirem na tabela
        // (algumas tabelas podem ter campos adicionais que não estão em todas as versões)
        if (charge.paymentDate) {
          dadosInsert.pagamento_data = charge.paymentDate.split('T')[0]
          if (statusFatura === 'paga') {
            dadosInsert.pagamento_valor = valorFatura
          }
        }
        
        console.log("📋 Dados para inserir:", JSON.stringify(dadosInsert, null, 2))
        
        const { data: novaFatura, error: erroInsert } = await supabase
          .from('faturas')
          .insert(dadosInsert)
          .select()
          .single()

        if (erroInsert) {
          console.error(`❌ Erro ao salvar fatura:`, erroInsert)
          erros.push(`Erro ao salvar fatura ${charge.id}: ${erroInsert.message}`)
        } else {
          faturasSalvas.push({
            asaas_charge_id: charge.id,
            fatura_id: novaFatura.id,
            acao: 'criada'
          })
        }

      } catch (error: any) {
        console.error(`❌ Erro ao processar cobrança ${charge.id}:`, error)
        erros.push(`Erro ao processar cobrança ${charge.id}: ${error.message}`)
      }
    }

    // Considerar sucesso se pelo menos uma fatura foi salva ou atualizada
    const sucessoParcial = faturasSalvas.length > 0 || faturasExistentes.length > 0
    const sucessoTotal = erros.length === 0 && (faturasSalvas.length > 0 || faturasExistentes.length > 0)
    
    console.log("📊 Resumo da recuperação:", {
      total_cobrancas: charges.length,
      faturas_salvas: faturasSalvas.length,
      faturas_existentes: faturasExistentes.length,
      erros: erros.length,
      sucesso_total: sucessoTotal,
      sucesso_parcial: sucessoParcial
    })
    
    return NextResponse.json({
      sucesso: sucessoTotal,
      sucesso_parcial: sucessoParcial && !sucessoTotal,
      faturas_salvas: faturasSalvas.length,
      faturas_existentes: faturasExistentes.length,
      total_processadas: charges.length,
      faturas: {
        salvas: faturasSalvas,
        existentes: faturasExistentes
      },
      erros: erros.length > 0 ? erros : undefined
    })

  } catch (error: any) {
    console.error("❌ Erro ao recuperar faturas do Asaas:", error)
    return NextResponse.json(
      { 
        sucesso: false,
        erros: [error.message || 'Erro desconhecido'] 
      },
      { status: 500 }
    )
  }
}

