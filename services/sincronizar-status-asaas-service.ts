import { supabaseAdmin } from "@/lib/supabase-admin"
import { faturaPertenceAFinanceira } from "@/lib/fatura-filtro-financeira"
import {
  faturaStatusEmAberto,
  faturaStatusPareceInconsistente,
  mapearStatusAsaas,
  normalizarStatusFatura,
} from "@/lib/fatura-status"

/** Lote pequeno para caber no maxDuration (60s) da Vercel por requisição. */
export const LIMITE_FATURAS_POR_EXECUCAO = 40

/** reconciliare = mesma fila do padrao (em aberto + inconsistentes), pensado para varredura pós-falha de update. */
export type ModoSincronizacaoAsaas = "padrao" | "inconsistentes" | "todos" | "reconciliare"

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
  /** Detalhe do sync pontual (numero_fatura / fatura_id) para suporte. */
  diagnostico_pontual?: {
    fatura_id: string | null
    numero_fatura: string | null
    status_local: string | null
    asaas_charge_id_local: string | null
    cliente_administradora_id: string | null
    asaas_customer_id: string | null
    charge_encontrada: boolean
    status_asaas: string | null
    motivo_sem_atualizacao: string | null
  }
}

type FaturaSyncRow = {
  id: string
  numero_fatura?: string | null
  cliente_nome?: string | null
  cliente_administradora_id?: string | null
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
  // Postgres clássico: column "x" of relation "faturas"
  const m1 = txt.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+of relation/i)
  if (m1?.[1]) return m1[1]
  // PostgREST / schema cache: Could not find the 'data_vencimento' column of 'faturas'
  const m2 = txt.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i)
  if (m2?.[1]) return m2[1]
  const m3 = txt.match(/['"]([a-zA-Z0-9_]+)['"] column of ['"]/i)
  return m3?.[1] || null
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

/** Em aberto sem charge id, mas com número Asaas — ainda dá para reconciliar via customer. */
function elegivelSemCharge(f: FaturaSyncRow): boolean {
  if (temChargeId(f)) return false
  if (!faturaStatusEmAberto(f.status)) return false
  return Boolean(String(f.numero_fatura || "").trim() && String(f.cliente_administradora_id || "").trim())
}

function montarFila(
  todas: FaturaSyncRow[],
  modo: ModoSincronizacaoAsaas
): FaturaSyncRow[] {
  const comCharge = todas.filter(temChargeId)
  const semCharge = todas.filter(elegivelSemCharge)

  if (modo === "todos") return ordenarFilaSincronizacao([...comCharge, ...semCharge])

  if (modo === "inconsistentes") {
    return ordenarFilaSincronizacao(
      comCharge.filter((f) => faturaStatusPareceInconsistente(f.status, f.pagamento_data))
    )
  }

  // padrao + reconciliare: em aberto / inconsistentes com charge + sem charge reconciliável
  return ordenarFilaSincronizacao([
    ...comCharge.filter(
      (f) =>
        faturaStatusPareceInconsistente(f.status, f.pagamento_data) ||
        faturaStatusEmAberto(f.status)
    ),
    ...semCharge,
  ])
}

type ConfigAsaas = { api_key: string; ambiente: string; nome?: string }

function financeiraAsaasAtiva(row: {
  instituicao_financeira?: string | null
  api_key?: string | null
  status_integracao?: string | null
}): boolean {
  const inst = String(row?.instituicao_financeira || "")
    .trim()
    .toLowerCase()
  const status = String(row?.status_integracao || "")
    .trim()
    .toLowerCase()
  const apiOk = !!String(row?.api_key || "").trim()
  if (!apiOk) return false
  if (inst && inst !== "asaas") return false
  if (status === "inativa") return false
  return true
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

  let { data: legado } = await supabaseAdmin
    .from("administradoras_config_financeira")
    .select("api_key, ambiente, instituicao_financeira, status_integracao")
    .eq("administradora_id", administradoraId)
    .eq("status_integracao", "ativa")
    .not("api_key", "is", null)
    .limit(1)

  if (!legado?.length) {
    const retry = await supabaseAdmin
      .from("administradoras_config_financeira")
      .select("api_key, ambiente, instituicao_financeira, status_integracao")
      .eq("administradora_id", administradoraId)
      .not("api_key", "is", null)
      .limit(1)
    legado = retry.data
  }

  const legadoRow = Array.isArray(legado) ? legado[0] : legado
  if (legadoRow?.api_key) {
    const inst = String(legadoRow.instituicao_financeira || "")
      .trim()
      .toLowerCase()
    const status = String(legadoRow.status_integracao || "")
      .trim()
      .toLowerCase()
    if (inst && inst !== "asaas") return []
    if (status === "inativa") return []
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
  erros: string[],
  filtros?: { numeroFatura?: string | null; faturaId?: string | null }
): Promise<FaturaSyncRow[]> {
  const selectComFin =
    "id, numero_fatura, cliente_nome, cliente_administradora_id, asaas_charge_id, gateway_id, status, pagamento_data, gateway_nome, financeira_id, valor, valor_total, vencimento"
  const selectSemFin =
    "id, numero_fatura, cliente_nome, cliente_administradora_id, asaas_charge_id, gateway_id, status, pagamento_data, gateway_nome, valor, valor_total, vencimento"
  const selectMin =
    "id, numero_fatura, cliente_nome, cliente_administradora_id, asaas_charge_id, gateway_id, status, pagamento_data, valor, valor_total, vencimento"

  const numeroFatura = String(filtros?.numeroFatura || "").trim()
  const faturaId = String(filtros?.faturaId || "").trim()
  const alvoPontual = Boolean(numeroFatura || faturaId)

  // Alvo pontual: não exige charge id (caso típico de fatura órfã / insert manual).
  let qF = supabaseAdmin.from("faturas").select(selectComFin).eq("administradora_id", administradoraId)
  if (faturaId) qF = qF.eq("id", faturaId)
  else if (numeroFatura) qF = qF.eq("numero_fatura", numeroFatura)
  else qF = qF.or("asaas_charge_id.not.is.null,gateway_id.not.is.null")

  let { data: faturas, error: faturasError } = await qF

  if (faturasError && extrairColunaInexistente(faturasError.message) === "financeira_id") {
    let retryQ = supabaseAdmin
      .from("faturas")
      .select(selectSemFin)
      .eq("administradora_id", administradoraId)
    if (faturaId) retryQ = retryQ.eq("id", faturaId)
    else if (numeroFatura) retryQ = retryQ.eq("numero_fatura", numeroFatura)
    else {
      retryQ = retryQ.or("asaas_charge_id.not.is.null,gateway_id.not.is.null")
    }
    const retry = await retryQ
    faturas = retry.data as FaturaSyncRow[] | null
    faturasError = retry.error
  }

  if (faturasError && extrairColunaInexistente(faturasError.message) === "gateway_nome") {
    let retryQ = supabaseAdmin
      .from("faturas")
      .select(selectMin)
      .eq("administradora_id", administradoraId)
    if (faturaId) retryQ = retryQ.eq("id", faturaId)
    else if (numeroFatura) retryQ = retryQ.eq("numero_fatura", numeroFatura)
    else retryQ = retryQ.or("asaas_charge_id.not.is.null,gateway_id.not.is.null")
    const retry = await retryQ
    faturas = retry.data as FaturaSyncRow[] | null
    faturasError = retry.error
  }

  if (faturasError && extrairColunaInexistente(faturasError.message) === "pagamento_data") {
    let retryQ = supabaseAdmin
      .from("faturas")
      .select(selectMin.replace(", pagamento_data", ""))
      .eq("administradora_id", administradoraId)
    if (faturaId) retryQ = retryQ.eq("id", faturaId)
    else if (numeroFatura) retryQ = retryQ.eq("numero_fatura", numeroFatura)
    else retryQ = retryQ.or("asaas_charge_id.not.is.null,gateway_id.not.is.null")
    const retry = await retryQ
    faturas = retry.data as FaturaSyncRow[] | null
    faturasError = retry.error
  }

  if (faturasError && extrairColunaInexistente(faturasError.message) === "cliente_administradora_id") {
    let retryQ = supabaseAdmin
      .from("faturas")
      .select(selectMin.replace(", cliente_administradora_id", ""))
      .eq("administradora_id", administradoraId)
    if (faturaId) retryQ = retryQ.eq("id", faturaId)
    else if (numeroFatura) retryQ = retryQ.eq("numero_fatura", numeroFatura)
    else retryQ = retryQ.or("asaas_charge_id.not.is.null,gateway_id.not.is.null")
    const retry = await retryQ
    faturas = retry.data as FaturaSyncRow[] | null
    faturasError = retry.error
  }

  if (!faturasError && financeiraId && Array.isArray(faturas) && faturas.length > 0 && !alvoPontual) {
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
    let fallbackQ = supabaseAdmin
      .from("faturas")
      .select("id, numero_fatura, cliente_nome, asaas_charge_id, gateway_id, status")
      .eq("administradora_id", administradoraId)
    if (faturaId) fallbackQ = fallbackQ.eq("id", faturaId)
    else if (numeroFatura) fallbackQ = fallbackQ.eq("numero_fatura", numeroFatura)
    else fallbackQ = fallbackQ.or("asaas_charge_id.not.is.null,gateway_id.not.is.null")
    const fallback = await fallbackQ
    if (fallback.error) throw new Error(`Erro ao buscar faturas: ${fallback.error.message}`)
    faturas = fallback.data as FaturaSyncRow[] | null
    if (financeiraId && !alvoPontual) {
      erros.push(
        "Aviso: não foi possível filtrar por financeira (colunas indisponíveis); sincronização considerou todas as faturas com cobrança."
      )
    }
  }

  let lista = Array.isArray(faturas) ? faturas : []

  // Complemento: em aberto sem charge id, com número — reconciliáveis via customer/invoiceNumber
  if (!alvoPontual && !faturasError) {
    const { data: semCharge } = await supabaseAdmin
      .from("faturas")
      .select(selectComFin)
      .eq("administradora_id", administradoraId)
      .in("status", ["pendente", "atrasada", "vencida"])
      .not("numero_fatura", "is", null)
      .is("asaas_charge_id", null)
      .is("gateway_id", null)
      .limit(80)

    if (Array.isArray(semCharge) && semCharge.length > 0) {
      const ids = new Set(lista.map((f) => String(f.id)))
      for (const row of semCharge as FaturaSyncRow[]) {
        if (!ids.has(String(row.id))) lista.push(row)
      }
    }
  }

  return lista
}

function invoiceNumberBate(a: unknown, b: unknown): boolean {
  const na = String(a || "").trim()
  const nb = String(b || "").trim()
  if (!na || !nb) return false
  if (na === nb) return true
  const da = na.replace(/\D/g, "")
  const db = nb.replace(/\D/g, "")
  return Boolean(da && db && da === db)
}

async function buscarChargePorNumeroNoCliente(
  configs: Array<{ api_key: string; ambiente: string }>,
  clienteAdministradoraId: string,
  numeroFatura: string
): Promise<Record<string, unknown> | null> {
  const caId = String(clienteAdministradoraId || "").trim()
  const numero = String(numeroFatura || "").trim()
  if (!caId || !numero) return null

  const { data: ca } = await supabaseAdmin
    .from("clientes_administradoras")
    .select("asaas_customer_id")
    .eq("id", caId)
    .maybeSingle()

  const customerId = String((ca as { asaas_customer_id?: string } | null)?.asaas_customer_id || "").trim()
  if (!customerId) return null

  for (const conf of configs) {
    const baseUrl =
      conf.ambiente === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3"
    let offset = 0
    for (let page = 0; page < 5; page++) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const url = `${baseUrl}/payments?customer=${encodeURIComponent(customerId)}&offset=${offset}&limit=100`
      const response = await fetch(url, {
        headers: {
          access_token: conf.api_key,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))

      if (!response.ok) break
      const json = (await response.json()) as { data?: Array<Record<string, unknown>>; hasMore?: boolean }
      const data = Array.isArray(json.data) ? json.data : []
      const match = data.find((c) => invoiceNumberBate(c.invoiceNumber, numero) || invoiceNumberBate(c.id, numero))
      if (match) return match
      if (!json.hasMore || data.length === 0) break
      offset += data.length
    }
  }
  return null
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
      const timeout = setTimeout(() => controller.abort(), 5000)
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
  /** Sync pontual (ex.: fatura paga no banco e ainda pendente no sistema). */
  numeroFatura?: string | null
  faturaId?: string | null
}): Promise<ResultadoSincronizacaoAsaas> {
  const administradoraId = opcoes.administradoraId
  const financeiraId =
    opcoes.financeiraId != null && String(opcoes.financeiraId).trim() !== ""
      ? String(opcoes.financeiraId).trim()
      : null
  const modoRaw = opcoes.modo || "padrao"
  const modo: ModoSincronizacaoAsaas =
    modoRaw === "inconsistentes" || modoRaw === "todos" || modoRaw === "reconciliare"
      ? modoRaw
      : "padrao"
  const offset = Math.max(0, Number(opcoes.offset || 0))
  const limite = Math.max(1, Number(opcoes.limite || LIMITE_FATURAS_POR_EXECUCAO))
  const numeroFaturaFiltro = String(opcoes.numeroFatura || "").trim() || null
  const faturaIdFiltro = String(opcoes.faturaId || "").trim() || null
  const alvoPontual = Boolean(numeroFaturaFiltro || faturaIdFiltro)

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
    diagnostico_pontual: undefined,
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
    resultado.erros,
    { numeroFatura: numeroFaturaFiltro, faturaId: faturaIdFiltro }
  )

  if (alvoPontual && todas.length === 0) {
    throw new Error(
      numeroFaturaFiltro
        ? `Fatura número ${numeroFaturaFiltro} não encontrada nesta administradora.`
        : `Fatura ${faturaIdFiltro} não encontrada nesta administradora.`
    )
  }

  resultado.faturas_inconsistentes_encontradas = todas.filter((f) =>
    faturaStatusPareceInconsistente(f.status, f.pagamento_data)
  ).length

  const filaOrdenada = alvoPontual ? ordenarFilaSincronizacao(todas) : montarFila(todas, modo)
  const fila = filaOrdenada.slice(offset, offset + limite)
  const restantes = Math.max(0, filaOrdenada.length - (offset + fila.length))

  resultado.faturas_na_fila = fila.length
  resultado.faturas_restantes = restantes
  if (restantes > 0) resultado.proximo_offset = offset + fila.length

  for (const fatura of fila) {
    try {
      resultado.faturas_verificadas++

      const idBase = String(fatura.asaas_charge_id || fatura.gateway_id || "").trim()
      const caIdFatura = String(fatura.cliente_administradora_id || "").trim()
      let asaasCustomerIdDiag: string | null = null
      if (alvoPontual && caIdFatura) {
        const { data: caDiag } = await supabaseAdmin
          .from("clientes_administradoras")
          .select("asaas_customer_id")
          .eq("id", caIdFatura)
          .maybeSingle()
        asaasCustomerIdDiag = String(
          (caDiag as { asaas_customer_id?: string } | null)?.asaas_customer_id || ""
        ).trim() || null
      }

      let charge: Record<string, unknown> | null = null
      let ultimoStatusHttp: number | null = null

      if (idBase) {
        const busca = await buscarChargeNoAsaas(configsBusca, obterChargeIds(idBase))
        charge = busca.charge
        ultimoStatusHttp = busca.ultimoStatusHttp
      }

      // Sem charge id, charge não achado, ou sync pontual: tenta pelo número Asaas + customer do cliente
      if (!charge) {
        const numero = String(fatura.numero_fatura || "").trim()
        if (numero && caIdFatura) {
          charge = await buscarChargePorNumeroNoCliente(configsBusca, caIdFatura, numero)
        }
      }

      if (alvoPontual) {
        resultado.diagnostico_pontual = {
          fatura_id: String(fatura.id),
          numero_fatura: fatura.numero_fatura ?? null,
          status_local: fatura.status ?? null,
          asaas_charge_id_local: idBase || null,
          cliente_administradora_id: caIdFatura || null,
          asaas_customer_id: asaasCustomerIdDiag,
          charge_encontrada: Boolean(charge),
          status_asaas: charge?.status != null ? String(charge.status) : null,
          motivo_sem_atualizacao: null,
        }
      }

      if (!charge) {
        resultado.cobrancas_nao_encontradas++
        const motivo = idBase
          ? `Cobrança ${idBase} (fatura ${fatura.numero_fatura || fatura.id}) não encontrada no Asaas (HTTP ${ultimoStatusHttp ?? "?"})`
          : !asaasCustomerIdDiag && alvoPontual
            ? `Fatura ${fatura.numero_fatura || fatura.id} sem asaas_charge_id e cliente sem asaas_customer_id — não foi possível listar cobranças no Asaas.`
            : `Fatura ${fatura.numero_fatura || fatura.id} sem asaas_charge_id e cobrança não localizada pelo número no customer.`
        if (resultado.erros.length < 8) resultado.erros.push(motivo)
        if (resultado.diagnostico_pontual) {
          resultado.diagnostico_pontual.motivo_sem_atualizacao = motivo
        }
        continue
      }

      const novoStatus = mapearStatusAsaas(String(charge.status || ""))
      const statusAtualNormalizado = normalizarStatusFatura(fatura.status)
      const chargeIdAsaas = String(charge.id || "").trim()

      if (deveBloquearRegressaoStatus(statusAtualNormalizado, novoStatus)) {
        if (resultado.diagnostico_pontual) {
          resultado.diagnostico_pontual.motivo_sem_atualizacao =
            "Bloqueado: fatura já está paga localmente; Asaas sugeriu status não-pago."
        }
        continue
      }

      const valorAtualLocal = Number(fatura.valor ?? fatura.valor_total ?? 0)
      const vencimentoAtualLocal = String(fatura.vencimento ?? fatura.data_vencimento ?? "")
      const valorMudou = Math.abs(Number(charge.value || 0) - valorAtualLocal) > 0.01
      const statusMudou = novoStatus !== statusAtualNormalizado
      const vencimentoMudou = String(charge.dueDate || "") !== vencimentoAtualLocal
      const chargeIdMudou =
        Boolean(chargeIdAsaas) &&
        chargeIdAsaas !== String(fatura.asaas_charge_id || "").trim() &&
        chargeIdAsaas !== String(fatura.gateway_id || "").trim()

      if (!statusMudou && !valorMudou && !vencimentoMudou && !chargeIdMudou) {
        if (resultado.diagnostico_pontual) {
          resultado.diagnostico_pontual.motivo_sem_atualizacao =
            novoStatus === "pendente" || novoStatus === "atrasada"
              ? `Cobrança encontrada no Asaas com status ${String(charge.status)} (ainda não paga no gateway).`
              : `Nada a atualizar: local já está ${statusAtualNormalizado || fatura.status} e bate com o Asaas (${String(charge.status)}).`
        }
        continue
      }

      // Schema Easyben usa `vencimento` (não `data_vencimento`). valor_total/pagamento_*
      // podem não existir em todos os ambientes — o fallback remove colunas inexistentes.
      const updateData: Record<string, unknown> = {
        status: novoStatus,
        valor: charge.value,
        vencimento: charge.dueDate,
        asaas_boleto_url: charge.bankSlipUrl || null,
        asaas_invoice_url: charge.invoiceUrl || null,
        asaas_payment_link: charge.invoiceUrl || charge.paymentLink || null,
        boleto_codigo: charge.nossoNumero || null,
        boleto_linha_digitavel: charge.identificationField || null,
        updated_at: new Date().toISOString(),
      }

      if (chargeIdAsaas) {
        updateData.asaas_charge_id = chargeIdAsaas
        updateData.gateway_id = chargeIdAsaas
      }

      // Faturas órfãs / import sem vínculo: externalReference no Asaas costuma ser o UUID do CA
      if (!caIdFatura) {
        const ref = String(charge.externalReference || "").trim()
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ref)) {
          updateData.cliente_administradora_id = ref
        }
      }

      if (novoStatus === "paga") {
        updateData.pagamento_data =
          charge.paymentDate ||
          charge.clientPaymentDate ||
          fatura.pagamento_data ||
          new Date().toISOString().slice(0, 10)
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

      await new Promise((resolve) => setTimeout(resolve, 15))
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
