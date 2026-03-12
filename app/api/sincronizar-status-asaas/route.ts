import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 60

interface ResultadoSincronizacao {
  faturas_atualizadas: number
  faturas_verificadas: number
  erros: string[]
  alteracoes_status: Array<{
    fatura_id: string
    numero_fatura: string | null
    cliente_nome: string | null
    de: string
    para: string
  }>
}

function extrairColunaInexistente(mensagem: string | undefined): string | null {
  const txt = String(mensagem || '')
  const m = txt.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+of relation/i)
  return m?.[1] || null
}

async function atualizarFaturaComFallback(
  faturaId: string,
  payloadInicial: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const payload = { ...payloadInicial }
  const tentativas = 6
  for (let i = 0; i < tentativas; i++) {
    const { error } = await supabase
      .from('faturas')
      .update(payload)
      .eq('id', faturaId)

    if (!error) return { ok: true }

    const coluna = extrairColunaInexistente(error.message)
    if (coluna && Object.prototype.hasOwnProperty.call(payload, coluna)) {
      delete payload[coluna]
      continue
    }

    return { ok: false, error: error.message }
  }

  return { ok: false, error: 'Falha ao atualizar fatura após múltiplos fallbacks de colunas.' }
}

function normalizarStatusLocal(status: string | null | undefined): string {
  const s = String(status || '').trim().toLowerCase()
  if (s === 'paid') return 'paga'
  if (s === 'overdue') return 'atrasada'
  if (s === 'cancelled' || s === 'canceled') return 'cancelada'
  return s
}

function deveBloquearRegressaoStatus(
  statusAtual: string | null | undefined,
  novoStatus: string
): boolean {
  const atual = normalizarStatusLocal(statusAtual)
  if (atual !== 'paga') return false
  // Se já está paga, só permitimos mudança para cancelada (estornos/cancelamentos).
  return novoStatus !== 'paga' && novoStatus !== 'cancelada'
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
    .not('api_key', 'is', null)
    .limit(1)

  const legadoRow = Array.isArray(legado) ? legado[0] : legado
  if (legadoRow?.api_key) {
    return {
      api_key: String(legadoRow.api_key),
      ambiente: String(legadoRow.ambiente || 'producao'),
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
      erros: [],
      alteracoes_status: []
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
    let { data: faturas, error: faturasError } = await supabase
      .from('faturas')
      .select('id, numero_fatura, cliente_nome, asaas_charge_id, gateway_id, status')
      .eq('administradora_id', administradora_id)
      .or('asaas_charge_id.not.is.null,gateway_id.not.is.null')

    if (faturasError) {
      // Fallback para schemas legados com divergência de colunas.
      const fallback = await supabase
        .from('faturas')
        .select('id, asaas_charge_id, gateway_id, status')
        .eq('administradora_id', administradora_id)
        .or('asaas_charge_id.not.is.null,gateway_id.not.is.null')
      faturas = fallback.data as any
      faturasError = fallback.error as any
    }

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
        const statusAtualNormalizado = normalizarStatusLocal(fatura.status)

        if (deveBloquearRegressaoStatus(statusAtualNormalizado, novoStatus)) {
          continue
        }

        // Em produção com schema heterogêneo, priorizamos sincronização de status.
        const valorAtualLocal = Number((fatura as any)?.valor ?? (fatura as any)?.valor_total ?? 0)
        const vencimentoAtualLocal = String((fatura as any)?.vencimento ?? (fatura as any)?.data_vencimento ?? '')
        const valorMudou = Math.abs(Number(charge?.value || 0) - valorAtualLocal) > 0.01
        const statusMudou = novoStatus !== statusAtualNormalizado
        const vencimentoMudou = String(charge?.dueDate || '') !== vencimentoAtualLocal

        if (statusMudou || valorMudou || vencimentoMudou) {
          const updateData: any = {
            status: novoStatus,
            valor: charge.value,
            vencimento: charge.dueDate,
            valor_total: charge.value,
            data_vencimento: charge.dueDate,
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

          const updateRes = await atualizarFaturaComFallback(String((fatura as any).id), updateData)
          if (!updateRes.ok) {
            console.error(`❌ Erro ao atualizar fatura ${(fatura as any).id}:`, updateRes.error)
            resultado.erros.push(`Fatura ${(fatura as any).id}: ${String(updateRes.error || 'erro ao atualizar')}`)
          } else {
            resultado.faturas_atualizadas++
            const mudancas = []
            if (statusMudou) mudancas.push(`status: ${(fatura as any).status} → ${novoStatus}`)
            if (valorMudou) mudancas.push(`valor: R$ ${valorAtualLocal} → R$ ${charge.value}`)
            if (vencimentoMudou) mudancas.push(`vencimento: ${vencimentoAtualLocal || '-'} → ${charge.dueDate}`)
            console.log(`✅ Fatura ${idBase} atualizada: ${mudancas.join(', ')}`)
            if (statusMudou) {
              resultado.alteracoes_status.push({
                fatura_id: String((fatura as any).id),
                numero_fatura: (fatura as any)?.numero_fatura ?? null,
                cliente_nome: (fatura as any)?.cliente_nome ?? null,
                de: statusAtualNormalizado || String((fatura as any)?.status || ""),
                para: novoStatus,
              })
            }
          }
        }

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 150))
      } catch (error: any) {
        resultado.erros.push(`Erro ao processar fatura ${(fatura as any)?.id}: ${error.message}`)
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
