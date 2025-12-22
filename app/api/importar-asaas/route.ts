import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ResultadoImportacao {
  clientes_importados: number
  clientes_nao_encontrados: number
  faturas_importadas: number
  erros: string[]
}

/**
 * API Route para importar clientes e faturas do Asaas
 * Roda no servidor para evitar problemas de CORS
 * 
 * Configuração de timeout: 60 segundos (para processar muitas cobranças)
 */
export const maxDuration = 60 // 60 segundos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { administradora_id, importar_todas_cobrancas } = body

    console.log('📥 Parâmetros recebidos:', { 
      administradora_id, 
      importar_todas_cobrancas, 
      tipo: typeof importar_todas_cobrancas,
      body_completo: JSON.stringify(body)
    })

    if (!administradora_id) {
      return NextResponse.json(
        { error: 'administradora_id é obrigatório' },
        { status: 400 }
      )
    }

    // Se importar_todas_cobrancas for true, importar TODAS as cobranças sem filtro
    const deveImportarTodas = importar_todas_cobrancas === true || 
                              importar_todas_cobrancas === 'true' || 
                              String(importar_todas_cobrancas).toLowerCase() === 'true'
    
    console.log('🔍 Verificação importar_todas_cobrancas:', {
      valor: importar_todas_cobrancas,
      tipo: typeof importar_todas_cobrancas,
      deveImportarTodas
    })

    if (deveImportarTodas) {
      console.log('🚀 Chamando importarTodasCobrancas...')
      return await importarTodasCobrancas(administradora_id)
    }

    console.log('⚠️ Continuando com função antiga (importar por cliente)')

    const resultado: ResultadoImportacao = {
      clientes_importados: 0,
      clientes_nao_encontrados: 0,
      faturas_importadas: 0,
      erros: []
    }

    // 1. Buscar configuração do Asaas
    console.log('🔍 Buscando configuração para:', administradora_id)
    
    const { data: config, error: configError } = await supabase
      .from('administradoras_config_financeira')
      .select('api_key, ambiente')
      .eq('administradora_id', administradora_id)
      .eq('instituicao_financeira', 'asaas')
      .eq('status_integracao', 'ativa')
      .single()

    console.log('📊 Resultado da busca:', { config, configError })

    if (configError || !config) {
      console.error('❌ Configuração não encontrada:', configError)
      return NextResponse.json(
        { 
          error: 'Configuração do Asaas não encontrada',
          debug: {
            administradora_id,
            error: configError?.message,
            code: configError?.code
          }
        },
        { status: 404 }
      )
    }

    console.log('✅ Configuração encontrada!')

    const API_KEY = config.api_key
    const BASE_URL = config.ambiente === 'sandbox' 
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3'

    // 2. Buscar clientes do banco
    const { data: clientesBanco, error: errorBanco } = await supabase
      .from('clientes_administradoras')
      .select(`
        id,
        asaas_customer_id,
        valor_mensal,
        data_vencimento,
        proposta:propostas(
          id,
          nome,
          cpf,
          email,
          telefone
        )
      `)
      .eq('administradora_id', administradora_id)

    if (errorBanco) {
      return NextResponse.json(
        { error: `Erro ao buscar clientes: ${errorBanco.message}` },
        { status: 500 }
      )
    }

    console.log(`📊 Total de clientes no banco: ${clientesBanco?.length || 0}`)

    // 3. Buscar customers do Asaas (paginado)
    let offset = 0
    const limit = 100
    let hasMore = true
    const customersAsaas: any[] = []

    while (hasMore) {
      try {
        const response = await fetch(
          `${BASE_URL}/customers?offset=${offset}&limit=${limit}`,
          {
            headers: {
              'access_token': API_KEY,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          console.error(`Erro ao buscar customers: ${response.status}`)
          break
        }

        const data = await response.json()
        customersAsaas.push(...(data.data || []))
        
        console.log(`📥 Buscados ${data.data?.length || 0} customers do Asaas (offset: ${offset})`)
        
        hasMore = data.hasMore || false
        offset += limit

        // Limite de segurança para não sobrecarregar
        if (offset >= 1000) {
          console.log('⚠️ Limite de 1000 customers atingido')
          break
        }
      } catch (error) {
        console.error('Erro ao buscar customers:', error)
        break
      }
    }

    console.log(`📊 Total de customers no Asaas: ${customersAsaas.length}`)

    // 4. Fazer match e importar
    for (const clienteBanco of clientesBanco || []) {
      try {
        const proposta = Array.isArray(clienteBanco.proposta) 
          ? clienteBanco.proposta[0] 
          : clienteBanco.proposta

        if (!proposta || !proposta.cpf) {
          resultado.erros.push(`Cliente ${clienteBanco.id} sem CPF`)
          continue
        }

        // Limpar CPF
        const cpfLimpo = proposta.cpf.replace(/\D/g, '')

        let asaasCustomerId = clienteBanco.asaas_customer_id

        // Se não tem customer_id, buscar no Asaas
        if (!asaasCustomerId) {
          const customerAsaas = customersAsaas.find(c => 
            c.cpfCnpj?.replace(/\D/g, '') === cpfLimpo
          )

          if (customerAsaas) {
            // Match encontrado! Salvar customer_id
            const { error: updateError } = await supabase
              .from('clientes_administradoras')
              .update({ 
                asaas_customer_id: customerAsaas.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', clienteBanco.id)

            if (updateError) {
              resultado.erros.push(`Erro ao atualizar ${proposta.nome}: ${updateError.message}`)
              continue
            } else {
              resultado.clientes_importados++
              asaasCustomerId = customerAsaas.id
              console.log(`✅ ${proposta.nome} → ${customerAsaas.id}`)
            }
          } else {
            resultado.clientes_nao_encontrados++
            console.log(`⚠️ ${proposta.nome} (${cpfLimpo}) não encontrado`)
            continue
          }
        }

        // Importar cobranças (para clientes novos E existentes)
        if (asaasCustomerId) {
          console.log(`📥 Buscando cobranças para ${proposta.nome} (${asaasCustomerId})`)
          await importarCobrancasCliente(
            clienteBanco.id,
            administradora_id,
            asaasCustomerId,
            proposta,
            API_KEY,
            BASE_URL,
            resultado
          )
        }
      } catch (error: any) {
        resultado.erros.push(`Erro: ${error.message}`)
      }
    }

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('Erro na importação:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Importa cobranças de um cliente específico
 */
async function importarCobrancasCliente(
  clienteId: string,
  administradoraId: string,
  asaasCustomerId: string,
  proposta: any,
  apiKey: string,
  baseUrl: string,
  resultado: ResultadoImportacao
) {
  try {
    // Buscar TODAS as cobranças do Asaas (sem filtro de status para evitar rate limit)
    const url = `${baseUrl}/payments?customer=${asaasCustomerId}&limit=100`
    
    const response = await fetch(url, {
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erro ${response.status} ao buscar cobranças: ${errorText}`)
      return
    }

    const { data: charges } = await response.json()

    if (!charges || charges.length === 0) {
      console.log(`⚠️ Nenhuma cobrança encontrada para customer ${asaasCustomerId}`)
      return
    }

    console.log(`✅ Buscadas ${charges.length} cobranças para customer ${asaasCustomerId}`)
    
    // Pequeno delay para evitar rate limit
    await new Promise(resolve => setTimeout(resolve, 100))

    // Mapear status
    const statusMap: Record<string, string> = {
      'PENDING': 'pendente',
      'RECEIVED': 'paga',
      'CONFIRMED': 'paga',
      'OVERDUE': 'atrasada',
      'REFUNDED': 'cancelada',
      'RECEIVED_IN_CASH': 'paga',
      'REFUND_REQUESTED': 'cancelada',
      'CHARGEBACK_REQUESTED': 'cancelada',
      'AWAITING_RISK_ANALYSIS': 'pendente'
    }

    // Importar cada cobrança
    for (const charge of charges) {
      try {
        // Verificar se já existe
        const { data: existe } = await supabase
          .from('faturas')
          .select('id')
          .eq('asaas_charge_id', charge.id)
          .single()

        if (existe) {
          continue
        }

        // Inserir fatura
        const { error: insertError } = await supabase
          .from('faturas')
          .insert({
            cliente_administradora_id: clienteId,
            administradora_id: administradoraId,
            cliente_id: proposta.cpf,
            cliente_nome: proposta.nome,
            cliente_email: proposta.email || '',
            cliente_telefone: proposta.telefone || '',
            valor: charge.value,
            vencimento: charge.dueDate,
            status: statusMap[charge.status] || 'pendente',
            asaas_charge_id: charge.id,
            asaas_boleto_url: charge.bankSlipUrl || null,
            asaas_invoice_url: charge.invoiceUrl || null,
            asaas_payment_link: charge.invoiceUrl || null,
            boleto_codigo: charge.nossoNumero || null,
            boleto_linha_digitavel: charge.identificationField || null,
            pagamento_data: charge.paymentDate || null,
            pagamento_valor: charge.status === 'RECEIVED' ? charge.value : null,
            created_at: charge.dateCreated,
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`❌ Erro ao inserir fatura:`, insertError)
        } else {
          resultado.faturas_importadas++
        }
      } catch (error: any) {
        resultado.erros.push(`Erro ao importar cobrança: ${error.message}`)
      }
    }
  } catch (error: any) {
    console.error('Erro ao importar cobranças:', error)
  }
}

/**
 * Importa TODAS as cobranças do Asaas sem filtro de cliente
 */
async function importarTodasCobrancas(administradora_id: string) {
  console.log('🚀 importarTodasCobrancas chamada para:', administradora_id)
  
  const resultado: ResultadoImportacao = {
    clientes_importados: 0,
    clientes_nao_encontrados: 0,
    faturas_importadas: 0,
    erros: []
  }

  try {
    // 1. Buscar configuração do Asaas
    const { data: config, error: configError } = await supabase
      .from('administradoras_config_financeira')
      .select('api_key, ambiente')
      .eq('administradora_id', administradora_id)
      .eq('instituicao_financeira', 'asaas')
      .eq('status_integracao', 'ativa')
      .single()

    if (configError || !config) {
      return NextResponse.json(
        { 
          error: 'Configuração do Asaas não encontrada',
          debug: { administradora_id, error: configError?.message }
        },
        { status: 404 }
      )
    }

    const API_KEY = config.api_key
    const BASE_URL = config.ambiente === 'sandbox' 
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3'

    // 2. Buscar TODAS as cobranças (paginado)
    console.log('📥 Buscando TODAS as cobranças do Asaas...')
    let offset = 0
    const limit = 100
    let hasMore = true
    const todasCobrancas: any[] = []

    while (hasMore) {
      try {
        const url = `${BASE_URL}/payments?offset=${offset}&limit=${limit}`
        console.log(`   Buscando página ${Math.floor(offset / limit) + 1} (offset: ${offset})...`)
        
        const response = await fetch(url, {
          headers: {
            'access_token': API_KEY,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ Erro ${response.status} ao buscar cobranças: ${errorText}`)
          resultado.erros.push(`Erro ${response.status}: ${errorText}`)
          break
        }

        const data = await response.json()
        const cobrancas = data.data || []
        todasCobrancas.push(...cobrancas)
        
        console.log(`   ✅ ${cobrancas.length} cobranças encontradas nesta página`)
        console.log(`   📊 Total acumulado: ${todasCobrancas.length}`)
        
        hasMore = data.hasMore || false
        offset += limit

        if (offset >= 10000) {
          console.log('⚠️ Limite de 10.000 cobranças atingido')
          break
        }
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error: any) {
        console.error('❌ Erro ao buscar cobranças:', error)
        resultado.erros.push(`Erro ao buscar cobranças: ${error.message}`)
        break
      }
    }

    console.log(`✅ Total de cobranças encontradas no Asaas: ${todasCobrancas.length}`)

    // 3. Buscar clientes para match
    const { data: clientesBanco } = await supabase
      .from('clientes_administradoras')
      .select('id, asaas_customer_id, proposta:propostas(nome, cpf, email, telefone)')
      .eq('administradora_id', administradora_id)

    const mapaCustomerId: Record<string, any> = {}
    if (clientesBanco) {
      for (const cliente of clientesBanco) {
        if (cliente.asaas_customer_id) {
          mapaCustomerId[cliente.asaas_customer_id] = cliente
        }
      }
    }

    // 4. Importar cada cobrança em lotes para evitar timeout
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

    // Processar em lotes de 50 para otimizar performance
    const BATCH_SIZE = 50
    let faturasJaExistentes = 0

    for (let i = 0; i < todasCobrancas.length; i += BATCH_SIZE) {
      const batch = todasCobrancas.slice(i, i + BATCH_SIZE)
      
      // Verificar quais já existem em lote
      const chargeIds = batch.map(c => c.id)
      const { data: faturasExistentes } = await supabase
        .from('faturas')
        .select('asaas_charge_id')
        .in('asaas_charge_id', chargeIds)

      const idsExistentes = new Set(faturasExistentes?.map(f => f.asaas_charge_id) || [])
      faturasJaExistentes += idsExistentes.size

      // Preparar dados para inserção em lote
      const dadosParaInserir: any[] = []

      for (const charge of batch) {
        if (idsExistentes.has(charge.id)) continue

        // Fazer match com cliente
        const clienteMatch = mapaCustomerId[charge.customer]
        const proposta = clienteMatch?.proposta 
          ? (Array.isArray(clienteMatch.proposta) ? clienteMatch.proposta[0] : clienteMatch.proposta)
          : null

        const statusFatura = statusMap[charge.status?.toUpperCase() || ''] || 'pendente'

        dadosParaInserir.push({
          cliente_administradora_id: clienteMatch?.id || null,
          administradora_id: administradora_id,
          cliente_id: proposta?.cpf || charge.customer || `ASAAS-${charge.id?.slice(0, 8)}`, // Usar customer ID do Asaas se não tiver CPF
          cliente_nome: proposta?.nome || charge.description || `Cliente Asaas ${charge.customer}` || 'Cliente não identificado',
          cliente_email: proposta?.email || '',
          cliente_telefone: proposta?.telefone || '',
          numero_fatura: charge.invoiceNumber || charge.id || `ASAAS-${charge.id?.slice(0, 8)}`,
          valor: charge.value || 0,
          vencimento: charge.dueDate ? charge.dueDate.split('T')[0] : null,
          status: statusFatura,
          asaas_charge_id: charge.id,
          asaas_boleto_url: charge.bankSlipUrl || null,
          asaas_invoice_url: charge.invoiceUrl || null,
          asaas_payment_link: charge.paymentLink || null,
          pagamento_data: charge.paymentDate ? charge.paymentDate.split('T')[0] : null,
          pagamento_valor: (charge.status === 'RECEIVED' || charge.status === 'CONFIRMED') ? charge.value : null,
          created_at: charge.dateCreated || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }

      // Inserir lote
      if (dadosParaInserir.length > 0) {
        const { error: insertError } = await supabase
          .from('faturas')
          .insert(dadosParaInserir)

        if (insertError) {
          resultado.erros.push(`Erro ao inserir lote ${i}-${i + batch.length}: ${insertError.message}`)
        } else {
          resultado.faturas_importadas += dadosParaInserir.length
        }
      }

      // Log de progresso
      if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= todasCobrancas.length) {
        console.log(`   📊 Progresso: ${Math.min(i + BATCH_SIZE, todasCobrancas.length)}/${todasCobrancas.length} (${Math.round(Math.min(i + BATCH_SIZE, todasCobrancas.length) / todasCobrancas.length * 100)}%)`)
      }
    }

    console.log('✅ Importação concluída!')
    console.log('📊 Resumo:', {
      total_cobrancas_encontradas: todasCobrancas.length,
      faturas_importadas: resultado.faturas_importadas,
      erros: resultado.erros.length
    })

    const faturasSemCliente = todasCobrancas.length - resultado.faturas_importadas - faturasJaExistentes

    return NextResponse.json({
      sucesso: true,
      total_cobrancas_encontradas: todasCobrancas.length,
      faturas_importadas: resultado.faturas_importadas,
      faturas_atualizadas: 0,
      faturas_ja_existentes: faturasJaExistentes,
      faturas_sem_cliente: faturasSemCliente,
      erros: resultado.erros
    })
  } catch (error: any) {
    return NextResponse.json(
      { sucesso: false, error: error.message },
      { status: 500 }
    )
  }
}
