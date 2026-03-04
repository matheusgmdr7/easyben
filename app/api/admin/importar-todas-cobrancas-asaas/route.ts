import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

interface ResultadoImportacao {
  total_cobrancas_encontradas: number
  faturas_importadas: number
  faturas_atualizadas: number
  faturas_ja_existentes: number
  faturas_sem_cliente: number
  erros: string[]
}

/**
 * API Route para importar TODAS as cobranças do Asaas
 * Não faz match por CPF, importa tudo que está no Asaas
 * 
 * Rota: POST /api/admin/importar-todas-cobrancas-asaas
 * Body: { administradora_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { administradora_id } = await request.json()

    if (!administradora_id) {
      return NextResponse.json(
        { error: 'administradora_id é obrigatório' },
        { status: 400 }
      )
    }

    console.log('🚀 Iniciando importação de TODAS as cobranças do Asaas...')
    console.log('📋 Administradora ID:', administradora_id)

    const resultado: ResultadoImportacao = {
      total_cobrancas_encontradas: 0,
      faturas_importadas: 0,
      faturas_atualizadas: 0,
      faturas_ja_existentes: 0,
      faturas_sem_cliente: 0,
      erros: []
    }

    // 1. Buscar configuração do Asaas e tenant_id
    console.log('🔍 Buscando configuração do Asaas...')
    
    const { data: administradora } = await supabase
      .from('administradoras')
      .select('tenant_id')
      .eq('id', administradora_id)
      .single()

    const config = await buscarConfigAsaas(administradora_id)

    if (!config?.api_key) {
      console.error('❌ Configuração não encontrada')
      return NextResponse.json(
        { 
          error: 'Configuração do Asaas não encontrada',
          debug: {
            administradora_id,
            error: 'Nenhuma financeira Asaas ativa com API key'
          }
        },
        { status: 404 }
      )
    }

    console.log('✅ Configuração encontrada!')
    console.log('   Ambiente:', config.ambiente)

    const API_KEY = config.api_key
    const BASE_URL = config.ambiente === 'sandbox' 
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3'

    // 2. Buscar TODAS as cobranças do Asaas (paginado)
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
          
          if (response.status === 401 || response.status === 403) {
            resultado.erros.push(`Erro de autenticação: Verifique a API Key`)
            break
          }
          
          resultado.erros.push(`Erro ${response.status}: ${errorText}`)
          break
        }

        const data = await response.json()
        const cobrancas = data.data || []
        
        todasCobrancas.push(...cobrancas)
        resultado.total_cobrancas_encontradas += cobrancas.length
        
        console.log(`   ✅ ${cobrancas.length} cobranças encontradas nesta página`)
        console.log(`   📊 Total acumulado: ${todasCobrancas.length}`)

        // Verificar se há mais páginas
        hasMore = data.hasMore || false
        offset += limit

        // Limite de segurança
        if (offset >= 10000) {
          console.log('⚠️ Limite de 10.000 cobranças atingido')
          break
        }

        // Pequeno delay para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error: any) {
        console.error('❌ Erro ao buscar cobranças:', error)
        resultado.erros.push(`Erro ao buscar cobranças: ${error.message}`)
        break
      }
    }

    console.log(`✅ Total de cobranças encontradas no Asaas: ${todasCobrancas.length}`)

    // 3. Buscar clientes do banco para fazer match (opcional)
    console.log('🔍 Buscando clientes no banco para fazer match...')
    
    const { data: clientesBanco } = await supabase
      .from('clientes_administradoras')
      .select(`
        id,
        asaas_customer_id,
        proposta:propostas(
          id,
          nome,
          cpf,
          email,
          telefone
        )
      `)
      .eq('administradora_id', administradora_id)

    console.log(`   ✅ ${clientesBanco?.length || 0} clientes encontrados no banco`)

    // Criar mapa de customer_id -> cliente_administradora_id para match rápido
    const mapaCustomerId: Record<string, any> = {}
    if (clientesBanco) {
      for (const cliente of clientesBanco) {
        if (cliente.asaas_customer_id) {
          mapaCustomerId[cliente.asaas_customer_id] = cliente
        }
      }
    }

    // 4. Mapear status do Asaas
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

    // 5. Importar cada cobrança
    console.log('💾 Importando cobranças no banco...')
    
    for (let i = 0; i < todasCobrancas.length; i++) {
      const charge = todasCobrancas[i]
      
      try {
        // Verificar se já existe no banco
        const { data: faturaExistente } = await supabase
          .from('faturas')
          .select('id, cliente_administradora_id')
          .eq('asaas_charge_id', charge.id)
          .maybeSingle()

        if (faturaExistente) {
          // Atualizar fatura existente
          const statusFatura = statusMap[charge.status?.toUpperCase() || ''] || 'pendente'
          
          const { error: updateError } = await supabase
            .from('faturas')
            .update({
              valor: charge.value || 0,
              vencimento: charge.dueDate ? charge.dueDate.split('T')[0] : null,
              status: statusFatura,
              asaas_boleto_url: charge.bankSlipUrl || null,
              asaas_invoice_url: charge.invoiceUrl || null,
              asaas_payment_link: charge.paymentLink || null,
              pagamento_data: charge.paymentDate ? charge.paymentDate.split('T')[0] : null,
              pagamento_valor: (charge.status === 'RECEIVED' || charge.status === 'CONFIRMED') ? charge.value : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', faturaExistente.id)

          if (updateError) {
            resultado.erros.push(`Erro ao atualizar fatura ${charge.id}: ${updateError.message}`)
          } else {
            resultado.faturas_atualizadas++
          }
          continue
        }

        // Tentar fazer match com cliente no banco
        let clienteMatch = mapaCustomerId[charge.customer]
        let clienteId = null
        let clienteNome = null
        let clienteCpf = null
        let clienteEmail = null
        let clienteTelefone = null

        if (clienteMatch) {
          const proposta = Array.isArray(clienteMatch.proposta) 
            ? clienteMatch.proposta[0] 
            : clienteMatch.proposta

          if (proposta) {
            clienteId = clienteMatch.id
            clienteNome = proposta.nome
            clienteCpf = proposta.cpf
            clienteEmail = proposta.email
            clienteTelefone = proposta.telefone
          }
        }

        // Se não encontrou match, ainda assim importa (mas sem cliente_administradora_id)
        if (!clienteId) {
          resultado.faturas_sem_cliente++
        }

        // Preparar dados para inserção
        const statusFatura = statusMap[charge.status?.toUpperCase() || ''] || 'pendente'
        const vencimento = charge.dueDate ? charge.dueDate.split('T')[0] : null
        const dataEmissao = charge.dateCreated ? charge.dateCreated.split('T')[0] : new Date().toISOString().split('T')[0]

        const dadosInsert: any = {
          administradora_id: administradora_id,
          cliente_administradora_id: clienteId,
          cliente_id: clienteCpf,
          cliente_nome: clienteNome,
          cliente_email: clienteEmail,
          cliente_telefone: clienteTelefone,
          numero_fatura: charge.invoiceNumber || charge.id || `ASAAS-${charge.id?.slice(0, 8)}`,
          valor: charge.value || 0,
          vencimento: vencimento,
          status: statusFatura,
          asaas_charge_id: charge.id,
          asaas_boleto_url: charge.bankSlipUrl || null,
          asaas_invoice_url: charge.invoiceUrl || null,
          asaas_payment_link: charge.paymentLink || null,
          boleto_codigo: charge.nossoNumero || null,
          boleto_linha_digitavel: charge.identificationField || null,
          pagamento_data: charge.paymentDate ? charge.paymentDate.split('T')[0] : null,
          pagamento_valor: (charge.status === 'RECEIVED' || charge.status === 'CONFIRMED') ? charge.value : null,
          tenant_id: administradora?.tenant_id || null,
          created_at: dataEmissao,
          updated_at: new Date().toISOString()
        }

        // Inserir fatura
        const { error: insertError } = await supabase
          .from('faturas')
          .insert(dadosInsert)

        if (insertError) {
          resultado.erros.push(`Erro ao inserir fatura ${charge.id}: ${insertError.message}`)
        } else {
          resultado.faturas_importadas++
        }

        // Log de progresso a cada 50 cobranças
        if ((i + 1) % 50 === 0) {
          console.log(`   📊 Progresso: ${i + 1}/${todasCobrancas.length} (${Math.round((i + 1) / todasCobrancas.length * 100)}%)`)
        }

      } catch (error: any) {
        resultado.erros.push(`Erro ao processar cobrança ${charge.id}: ${error.message}`)
      }
    }

    console.log('✅ Importação concluída!')
    console.log('📊 Resumo:', resultado)

    return NextResponse.json({
      sucesso: true,
      ...resultado
    })

  } catch (error: any) {
    console.error('❌ Erro na importação:', error)
    return NextResponse.json(
      { 
        sucesso: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

