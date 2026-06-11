import { supabaseAdmin } from "@/lib/supabase-admin"
import { faturaPertenceAFinanceira } from "@/lib/fatura-filtro-financeira"
import {
  faturaStatusEmAberto,
  faturaStatusPareceInconsistente,
  mapearStatusAsaas,
  normalizarStatusFatura,
} from "@/lib/fatura-status"

export const LIMITE_FATURAS_POR_EXECUCAO = 180

export type ModoSincronizacaoAsaas = "padrao" | "inconsistentes" | "todos"

export interface ResultadoSincronizacaoAsaas {
  faturas_atualizadas: number
  faturas_verificadas: number
  faturas_inconsistentes_encontradas: number
  faturas_na_fila: number
  faturas_restantes: number
  cobrancas_nao_encontradas: number
  proximo_offset: number | null
  erros: string[]
  alteracoes_status: Array<{
    fatura_id: string
    numero_fatura: string | null
    cliente_nome: string | null
    de: string
    para: string
  }>
}

type FaturaSyncRow = {
  id: string
  numero_fatura?: string | null
  cliente_nome?: string | null
  asaas_charge_id?: string | null
  gateway_id?: string | null
  status?: string | null
  pagamento_data?: string | null
  gateway_nome?: string | null
  financeira_id?: string | null
  valor?: number | null
  valor_total?: number | null
  vencimento?: string | null
  data_vencimento?: string | null
}

function extrairColunaInexistente(mensagem: string | undefined): string | null {
  const txt = String(mensagem || "")
  const m = txt.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+of relation/i)
  return m?.[1] || null
}

async function atualizarFaturaComFallback(
  faturaId: string,
  payloadInicial: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const payload = { ...payloadInicial }
  for (let i = 0; i < 6; i++) {
    const { error } = await supabaseAdmin.from("faturas").update(payload).eq("id", faturaId)
    if (!error) return { ok: true }

    const coluna = extrairColunaInexistente(error.message)
    if (coluna && Object.prototype.hasOwnProperty.call(payload, coluna)) {
      delete payload[coluna]
      continue
    }
    return { ok: false, error: error.message }
  }
  return { ok: false, error: "Falha ao atualizar fatura após múltiplos fallbacks de colunas." }
}

function deveBloquearRegressaoStatus(
  statusAtual: string | null | undefined,
  novoStatus: string
): boolean {
  const atual = normalizarStatusFatura(statusAtual)
  if (atual !== "paga") return false
  return novoStatus !== "paga" && novoStatus !== "cancelada"
}

function obterChargeIds(baseId: string): string[] {
  const limpo = String(baseId || "").trim()
  if (!limpo) return []
  const semPrefixo = limpo.replace(/^pay_/, "")
  const comPrefixo = semPrefixo ? `pay_${semPrefixo}` : ""
  return Array.from(new Set([limpo, semPrefixo, comPrefixo].filter(Boolean)))
}

function temChargeId(f: FaturaSyncRow): boolean {
  return Boolean(String(f.asaas_charge_id || f.gateway_id || "").trim())
}

function prioridadeSincronizacao(f: FaturaSyncRow): number {
  if (faturaStatusPareceInconsistente(f.status, f.pagamento_data)) return 0
  if (faturaStatusEmAberto(f.status)) return 1
  return 2
}

function ordenarFilaSincronizacao(faturas: FaturaSyncRow[]): FaturaSyncRow[] {
  return [...faturas].sort((a, b) => prioridadeSincronizacao(a) - prioridadeSincronizacao(b))
}

function montarFila(
  todas: FaturaSyncRow[],
  modo: ModoSincronizacaoAsaas
): FaturaSyncRow[] {
  const comCharge = todas.filter(temChargeId)

  if (modo === "todos") return ordenarFilaSincronizacao(comCharge)

  if (modo === "inconsistentes") {
    return ordenarFilaSincronizacao(
      comCharge.filter((f) => faturaStatusPareceInconsistente(f.status, f.pagamento_data))
    )
  }

  return ordenarFilaSincronizacao(
    comCharge.filter(
      (f) =>
        faturaStatusPareceInconsistente(f.status, f.pagamento_data) ||
        faturaStatusEmAberto(f.status)
    )
  )
}

type ConfigAsaas = { api_key: string; ambiente: string; nome?: string }

function financeiraAsaasAtiva(row: {
  instituicao_financeira?: string | null
  api_key?: string | null
  status_integracao?: string | null
}): boolean {
  return (
    String(row?.instituicao_financeira || "").toLowerCase() === "asaas" &&
    !!String(row?.api_key || "").trim() &&
    (row?.status_integracao == null || String(row.status_integracao).toLowerCase() !== "inativa")
  )
}

function deduplicarConfigs(configs: ConfigAsaas[]): ConfigAsaas[] {
  const vistos = new Set<string>()
  const out: ConfigAsaas[] = []
  for (const c of configs) {
    const key = String(c.api_key || "").trim()
    if (!key || vistos.has(key)) continue
    vistos.add(key)
    out.push(c)
  }
  return out
}

/** Todas as API keys Asaas ativas da administradora (consulta cobrança em qualquer financeira). */
async function buscarTodasConfigsAsaasAtivas(administradoraId: string): Promise<ConfigAsaas[]> {
  const { data: financeiras } = await supabaseAdmin
    .from("administradora_financeiras")
    .select("nome, api_key, ambiente, instituicao_financeira, status_integracao, ativo")
    .eq("administradora_id", administradoraId)
    .eq("ativo", true)

  const deFinanceiras = (financeiras || [])
    .filter(financeiraAsaasAtiva)
    .map((f: { api_key: string; ambiente?: string; nome?: string }) => ({
      api_key: String(f.api_key),
      ambiente: String(f.ambiente || "producao"),
      nome: String(f.nome || ""),
    }))

  if (deFinanceiras.length > 0) return deduplicarConfigs(deFinanceiras)

  const { data: legado } = await supabaseAdmin
    .from("administradoras_config_financeira")
    .select("api_key, ambiente")
    .eq("administradora_id", administradoraId)
    .eq("instituicao_financeira", "asaas")
    .not("api_key", "is", null)
    .limit(1)

  const legadoRow = Array.isArray(legado) ? legado[0] : legado
  if (legadoRow?.api_key) {
    return [
      {
        api_key: String(legadoRow.api_key),
        ambiente: String(legadoRow.ambiente || "producao"),
        nome: "LEGADO",
      },
    ]
  }

  return []
}

async function buscarConfigFinanceiraPorId(
  administradoraId: string,
  financeiraId: string
): Promise<ConfigAsaas | null> {
  const { data: uma } = await supabaseAdmin
    .from("administradora_financeiras")
    .select("nome, api_key, ambiente, instituicao_financeira, status_integracao, ativo")
    .eq("administradora_id", administradoraId)
    .eq("id", financeiraId)
    .eq("ativo", true)
    .maybeSingle()

  if (!uma || !financeiraAsaasAtiva(uma)) return null
  return {
    api_key: String(uma.api_key),
    ambiente: String(uma.ambiente || "producao"),
    nome: String(uma.nome || ""),
  }
}

async function buscarFaturasComCobranca(
  administradoraId: string,
  financeiraId: string | null,
  nomeFinanceiraSync: string,
  erros: string[]
): Promise<FaturaSyncRow[]> {
  const selectComFin =
    "id, numero_fatura, cliente_nome, asaas_charge_id, gateway_id, status, pagamento_data, gateway_nome, financeira_id, valor, valor_total, vencimento, data_vencimento"
  const selectSemFin =
    "id, numero_fatura, cliente_nome, asaas_charge_id, gateway_id, status, pagamento_data, gateway_nome, valor, valor_total, vencimento, data_vencimento"
  const selectMin =
    "id, numero_fatura, cliente_nome, asaas_charge_id, gateway_id, status, pagamento_data, valor, valor_total, vencimento, data_vencimento"

  let qF = supabaseAdmin
    .from("faturas")
    .select(selectComFin)
    .eq("administradora_id", administradoraId)
    .or("asaas_charge_id.not.is.null,gateway_id.not.is.null")

  let { data: faturas, error: faturasError } = await qF

  if (faturasError && extrairColunaInexistente(faturasError.message) === "financeira_id") {
    const retry = await supabaseAdmin
      .from("faturas")
      .select(selectSemFin)
      .eq("administradora_id", administradoraId)
      .or("asaas_charge_id.not.is.null,gateway_id.not.is.null")
    faturas = retry.data as FaturaSyncRow[] | null
    faturasError = retry.error
  }

  if (faturasError && extrairColunaInexistente(faturasError.message) === "gateway_nome") {
    const retry = await supabaseAdmin
      .from("faturas")
      .select(selectMin)
      .eq("administradora_id", administradoraId)
      .or("asaas_charge_id.not.is.null,gateway_id.not.is.null")
    faturas = retry.data as FaturaSyncRow[] | null
    faturasError = retry.error
  }

  if (faturasError && extrairColunaInexistente(faturasError.message) === "pagamento_data") {
    const retry = await supabaseAdmin
      .from("faturas")
      .select(selectMin.replace(", pagamento_data", ""))
      .eq("administradora_id", administradoraId)
      .or("asaas_charge_id.not.is.null,gateway_id.not.is.null")
    faturas = retry.data as FaturaSyncRow[] | null
    faturasError = retry.error
  }

  if (!faturasError && financeiraId && Array.isArray(faturas) && faturas.length > 0) {
    const amostra = faturas[0] as Record<string, unknown>
    const podeFiltrarPorFinanceira =
      Object.prototype.hasOwnProperty.call(amostra, "financeira_id") ||
      Object.prototype.hasOwnProperty.call(amostra, "gateway_nome")
    if (podeFiltrarPorFinanceira) {
      faturas = faturas.filter((r) =>
        faturaPertenceAFinanceira(r.financeira_id, r.gateway_nome, financeiraId, nomeFinanceiraSync, {
          tratarGatewayVazioComoMatch: false,
        })
      )
    } else {
      erros.push(
        "Aviso: não foi possível filtrar por financeira (colunas indisponíveis); sincronização considerou todas as faturas com cobrança."
      )
    }
  }

  if (faturasError) {
    const fallback = await supabaseAdmin
      .from("faturas")
      .select("id, numero_fatura, cliente_nome, asaas_charge_id, gateway_id, status")
      .eq("administradora_id", administradoraId)
      .or("asaas_charge_id.not.is.null,gateway_id.not.is.null")
    if (fallback.error) throw new Error(`Erro ao buscar faturas: ${fallback.error.message}`)
    faturas = fallback.data as FaturaSyncRow[] | null
    if (financeiraId) {
      erros.push(
        "Aviso: não foi possível filtrar por financeira (colunas indisponíveis); sincronização considerou todas as faturas com cobrança."
      )
    }
  }

  return Array.isArray(faturas) ? faturas : []
}

async function buscarChargeNoAsaas(
  configs: Array<{ api_key: string; ambiente: string }>,
  idsCandidatos: string[]
): Promise<{ charge: Record<string, unknown> | null; ultimoStatusHttp: number | null }> {
  let charge: Record<string, unknown> | null = null
  let ultimoStatusHttp: number | null = null

  for (const conf of configs) {
    const baseUrl =
      conf.ambiente === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3"

    for (const id of idsCandidatos) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const response = await fetch(`${baseUrl}/payments/${id}`, {
        headers: {
          access_token: conf.api_key,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))

      ultimoStatusHttp = response.status
      if (response.ok) {
        charge = (await response.json()) as Record<string, unknown>
        break
      }
    }
    if (charge) break
  }

  return { charge, ultimoStatusHttp }
}

export async function sincronizarStatusFaturasComAsaas(opcoes: {
  administradoraId: string
  financeiraId?: string | null
  modo?: ModoSincronizacaoAsaas
  offset?: number
  limite?: number
}): Promise<ResultadoSincronizacaoAsaas> {
  const administradoraId = opcoes.administradoraId
  const financeiraId =
    opcoes.financeiraId != null && String(opcoes.financeiraId).trim() !== ""
      ? String(opcoes.financeiraId).trim()
      : null
  const modo: ModoSincronizacaoAsaas = opcoes.modo || "padrao"
  const offset = Math.max(0, Number(opcoes.offset || 0))
  const limite = Math.max(1, Number(opcoes.limite || LIMITE_FATURAS_POR_EXECUCAO))

  const resultado: ResultadoSincronizacaoAsaas = {
    faturas_atualizadas: 0,
    faturas_verificadas: 0,
    faturas_inconsistentes_encontradas: 0,
    faturas_na_fila: 0,
    faturas_restantes: 0,
    cobrancas_nao_encontradas: 0,
    proximo_offset: null,
    erros: [],
    alteracoes_status: [],
  }

  const configsBusca = await buscarTodasConfigsAsaasAtivas(administradoraId)
  if (configsBusca.length === 0) {
    throw new Error(
      "Configuração do Asaas não encontrada ou sem API key ativa para esta administradora."
    )
  }

  let nomeFinanceiraSync = "Financeira"
  if (financeiraId) {
    const fin = await buscarConfigFinanceiraPorId(administradoraId, financeiraId)
    if (fin?.nome) {
      nomeFinanceiraSync = String(fin.nome).trim() || nomeFinanceiraSync
    } else {
      resultado.erros.push(
        "Aviso: a financeira do filtro não tem API Asaas ativa; as cobranças serão consultadas nas demais financeiras configuradas."
      )
    }
  } else {
    nomeFinanceiraSync = String(configsBusca[0]?.nome || nomeFinanceiraSync).trim() || nomeFinanceiraSync
  }
  const todas = await buscarFaturasComCobranca(
    administradoraId,
    financeiraId,
    nomeFinanceiraSync,
    resultado.erros
  )

  resultado.faturas_inconsistentes_encontradas = todas.filter((f) =>
    faturaStatusPareceInconsistente(f.status, f.pagamento_data)
  ).length

  const filaOrdenada = montarFila(todas, modo)
  const fila = filaOrdenada.slice(offset, offset + limite)
  const restantes = Math.max(0, filaOrdenada.length - (offset + fila.length))

  resultado.faturas_na_fila = fila.length
  resultado.faturas_restantes = restantes
  if (restantes > 0) resultado.proximo_offset = offset + fila.length

  for (const fatura of fila) {
    try {
      resultado.faturas_verificadas++

      const idBase = String(fatura.asaas_charge_id || fatura.gateway_id || "").trim()
      if (!idBase) continue

      const { charge, ultimoStatusHttp } = await buscarChargeNoAsaas(configsBusca, obterChargeIds(idBase))
      if (!charge) {
        resultado.cobrancas_nao_encontradas++
        if (resultado.erros.length < 8) {
          resultado.erros.push(
            `Cobrança ${idBase} não encontrada no Asaas (HTTP ${ultimoStatusHttp ?? "?"})`
          )
        }
        continue
      }

      const novoStatus = mapearStatusAsaas(String(charge.status || ""))
      const statusAtualNormalizado = normalizarStatusFatura(fatura.status)

      if (deveBloquearRegressaoStatus(statusAtualNormalizado, novoStatus)) continue

      const valorAtualLocal = Number(fatura.valor ?? fatura.valor_total ?? 0)
      const vencimentoAtualLocal = String(fatura.vencimento ?? fatura.data_vencimento ?? "")
      const valorMudou = Math.abs(Number(charge.value || 0) - valorAtualLocal) > 0.01
      const statusMudou = novoStatus !== statusAtualNormalizado
      const vencimentoMudou = String(charge.dueDate || "") !== vencimentoAtualLocal

      if (!statusMudou && !valorMudou && !vencimentoMudou) continue

      const updateData: Record<string, unknown> = {
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
        updated_at: new Date().toISOString(),
      }

      if (novoStatus === "paga" && charge.paymentDate) {
        updateData.pagamento_data = charge.paymentDate
        updateData.pagamento_valor = charge.value
      }

      const updateRes = await atualizarFaturaComFallback(String(fatura.id), updateData)
      if (!updateRes.ok) {
        resultado.erros.push(`Fatura ${fatura.id}: ${String(updateRes.error || "erro ao atualizar")}`)
        continue
      }

      resultado.faturas_atualizadas++
      if (statusMudou) {
        resultado.alteracoes_status.push({
          fatura_id: String(fatura.id),
          numero_fatura: fatura.numero_fatura ?? null,
          cliente_nome: fatura.cliente_nome ?? null,
          de: statusAtualNormalizado || String(fatura.status || ""),
          para: novoStatus,
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 40))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      resultado.erros.push(`Erro ao processar fatura ${fatura.id}: ${msg}`)
    }
  }

  if (restantes > 0) {
    resultado.erros.push(
      `Sincronização parcial: ${restantes} fatura(s) na fila para a próxima execução (offset ${resultado.proximo_offset}).`
    )
  }

  if (resultado.cobrancas_nao_encontradas > 8) {
    resultado.erros.push(
      `Total de ${resultado.cobrancas_nao_encontradas} cobrança(s) não localizadas no Asaas nesta rodada.`
    )
  }

  return resultado
}
