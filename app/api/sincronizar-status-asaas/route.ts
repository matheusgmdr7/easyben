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

function mapearStatusAsaas(status: string | null | undefined): string {
  const s = String(status || '').toUpperCase()
  const mapa: Record<string, string> = {
    PENDING: 'pendente',
    RECEIVED: 'paga',
    CONFIRMED: 'paga',
    RECEIVED_IN_CASH: 'paga',
    OVERDUE: 'atrasada',
    REFUNDED: 'cancelada',
    REFUND_REQUESTED: 'cancelada',
    CHARGEBACK_REQUESTED: 'cancelada',
    CHARGEBACK_DISPUTE: 'cancelada',
    AWAITING_CHARGEBACK_REVERSAL: 'cancelada',
    DELETED: 'cancelada',
    CANCELED: 'cancelada',
    CANCELLED: 'cancelada',
    AWAITING_RISK_ANALYSIS: 'pendente',
    DUNNING_REQUESTED: 'atrasada',
    DUNNING_RECEIVED: 'paga',
  }
  return mapa[s] || 'pendente'
}

function obterChargeIds(baseId: string): string[] {
  const limpo = String(baseId || '').trim()
  if (!limpo) return []
  const semPrefixo = limpo.replace(/^pay_/, '')
  const comPrefixo = semPrefixo ? `pay_${semPrefixo}` : ''
  return Array.from(new Set([limpo, semPrefixo, comPrefixo].filter(Boolean)))
}

async function buscarConfigAsaas(administradoraId: string): Promise<{ api_key: string; ambiente: string } | null> {
  const { data: adm } = await supabase
    .from('administradoras')
    .select('tenant_id')
    .eq('id', administradoraId)
    .maybeSingle()

  const tenantId = adm?.tenant_id || null

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

    // 1. Buscar configuração do Asaas (tabela atual e legado)
    const config = await buscarConfigAsaas(administradora_id)
    if (!config?.api_key) {
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
      .select('id, asaas_charge_id, gateway_id, status, valor, vencimento')
      .eq('administradora_id', administradora_id)
      .or('asaas_charge_id.not.is.null,gateway_id.not.is.null')

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

        const idBase = String(fatura.asaas_charge_id || fatura.gateway_id || '').trim()
        if (!idBase) continue
        const idsCandidatos = obterChargeIds(idBase)

        let charge: any = null
        let ultimoStatusHttp: number | null = null
        for (const id of idsCandidatos) {
          const response = await fetch(`${BASE_URL}/payments/${id}`, {
            headers: {
              access_token: API_KEY,
              'Content-Type': 'application/json',
            },
          })
          ultimoStatusHttp = response.status
          if (response.ok) {
            charge = await response.json()
            break
          }
        }

        if (!charge) {
          console.error(`❌ Erro ao buscar fatura ${idBase}: ${ultimoStatusHttp}`)
          continue
        }

        const novoStatus = mapearStatusAsaas(charge.status)

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
            console.log(`✅ Fatura ${idBase} atualizada: ${mudancas.join(', ')}`)
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
