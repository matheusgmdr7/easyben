import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ResultadoSincronizacao {
  faturas_atualizadas: number
  faturas_verificadas: number
  erros: string[]
}

/**
 * API Route para sincronizar status das faturas com o Asaas
 * Atualiza faturas que foram pagas mas ainda estão como "pendente" no banco
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

    const resultado: ResultadoSincronizacao = {
      faturas_atualizadas: 0,
      faturas_verificadas: 0,
      erros: []
    }

    console.log('🔄 Iniciando sincronização de status...')

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
        { error: 'Configuração do Asaas não encontrada' },
        { status: 404 }
      )
    }

    const API_KEY = config.api_key
    const BASE_URL = config.ambiente === 'sandbox' 
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3'

    // 2. Buscar faturas com asaas_charge_id
    const { data: faturas, error: faturasError } = await supabase
      .from('faturas')
      .select('id, asaas_charge_id, status, valor, vencimento')
      .eq('administradora_id', administradora_id)
      .not('asaas_charge_id', 'is', null)

    if (faturasError) {
      return NextResponse.json(
        { error: `Erro ao buscar faturas: ${faturasError.message}` },
        { status: 500 }
      )
    }

    console.log(`📊 Total de faturas para verificar: ${faturas?.length || 0}`)

    // 3. Verificar status de cada fatura no Asaas
    for (const fatura of faturas || []) {
      try {
        resultado.faturas_verificadas++

        // Buscar status atual no Asaas
        const response = await fetch(
          `${BASE_URL}/payments/${fatura.asaas_charge_id}`,
          {
            headers: {
              'access_token': API_KEY,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          console.error(`❌ Erro ao buscar fatura ${fatura.asaas_charge_id}: ${response.status}`)
          continue
        }

        const charge = await response.json()

        // Mapear status do Asaas
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

        const novoStatus = statusMap[charge.status] || 'pendente'

        // Verificar se QUALQUER dado mudou (não apenas o status)
        const valorMudou = Math.abs(charge.value - fatura.valor) > 0.01
        const statusMudou = novoStatus !== fatura.status
        const vencimentoMudou = charge.dueDate !== fatura.vencimento

        if (statusMudou || valorMudou || vencimentoMudou) {
          const updateData: any = {
            status: novoStatus,
            valor: charge.value,
            vencimento: charge.dueDate,
            asaas_boleto_url: charge.bankSlipUrl || null,
            asaas_invoice_url: charge.invoiceUrl || null,
            asaas_payment_link: charge.invoiceUrl || null,
            boleto_codigo: charge.nossoNumero || null,
            boleto_linha_digitavel: charge.identificationField || null,
            updated_at: new Date().toISOString()
          }

          // Se foi pago, salvar data e valor do pagamento
          if (novoStatus === 'paga' && charge.paymentDate) {
            updateData.pagamento_data = charge.paymentDate
            updateData.pagamento_valor = charge.value
          }

          const { error: updateError } = await supabase
            .from('faturas')
            .update(updateData)
            .eq('id', fatura.id)

          if (updateError) {
            console.error(`❌ Erro ao atualizar fatura ${fatura.id}:`, updateError)
            resultado.erros.push(`Fatura ${fatura.id}: ${updateError.message}`)
          } else {
            resultado.faturas_atualizadas++
            const mudancas = []
            if (statusMudou) mudancas.push(`status: ${fatura.status} → ${novoStatus}`)
            if (valorMudou) mudancas.push(`valor: R$ ${fatura.valor} → R$ ${charge.value}`)
            if (vencimentoMudou) mudancas.push(`vencimento: ${fatura.vencimento} → ${charge.dueDate}`)
            console.log(`✅ Fatura ${fatura.asaas_charge_id} atualizada: ${mudancas.join(', ')}`)
          }
        }

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error: any) {
        resultado.erros.push(`Erro ao processar fatura ${fatura.id}: ${error.message}`)
      }
    }

    console.log(`✅ Sincronização concluída: ${resultado.faturas_atualizadas} faturas atualizadas`)

    return NextResponse.json(resultado)
  } catch (error: any) {
    console.error('Erro na sincronização:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
