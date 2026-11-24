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
  // Postgres: column faturas.valor_total does not exist
  const mPg = txt.match(/column\s+[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+)\s+does not exist/i)
  if (mPg?.[1]) return mPg[1]
  const mPg2 = txt.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i)
  if (mPg2?.[1]) return mPg2[1]
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

type ConfigAsaas = { id?: string; api_key: string; ambiente: string; nome?: string }

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
    .select("id, nome, api_key, ambiente, instituicao_financeira, status_integracao, ativo")
    .eq("administradora_id", administradoraId)
    .eq("ativo", true)

  const deFinanceiras = (financeiras || [])
    .filter(financeiraAsaasAtiva)
    .map((f: { id?: string; api_key: string; ambiente?: string; nome?: string }) => ({
      id: f.id ? String(f.id) : undefined,
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
    id: financeiraId,
    api_key: String(uma.api_key),
    ambiente: String(uma.ambiente || "producao"),
    nome: String(uma.nome || ""),
  }
}

/** Descarta keys 401 (revogadas) para a varredura não perder tempo e marcar cobranças como "não encontradas". */
async function filtrarConfigsComChaveValida(
  configs: ConfigAsaas[],
  erros: string[]
): Promise<ConfigAsaas[]> {
  const validas: ConfigAsaas[] = []
  for (const conf of configs) {
    const baseUrl =
      conf.ambiente === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3"
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)
      const response = await fetch(`${baseUrl}/finance/balance`, {
        headers: {
          access_token: conf.api_key,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))

      if (response.ok) {
        validas.push(conf)
        continue
      }
      if (response.status === 401 || response.status === 403) {
        erros.push(
          `Aviso: API Key inválida na financeira "${conf.nome || "Asaas"}" (HTTP ${response.status}). Atualize em Financeiras — cobranças dessa conta não serão sincronizadas.`
        )
        continue
      }
      // Outros erros (rede/5xx): mantém a key para tentar nas cobranças
      validas.push(conf)
    } catch {
      validas.push(conf)
    }
  }
  return validas
}

function ordenarConfigsPorFinanceiraFatura(
  configs: ConfigAsaas[],
  financeiraIdFatura: string | null | undefined
): ConfigAsaas[] {
  const finId = String(financeiraIdFatura || "").trim()
  if (!finId) return configs
  const preferidas = configs.filter((c) => String(c.id || "") === finId)
  const demais = configs.filter((c) => String(c.id || "") !== finId)
  return [...preferidas, ...demais]
}

const SELECT_FATURA_SYNC =
  "id, numero_fatura, cliente_nome, cliente_administradora_id, asaas_charge_id, gateway_id, status, pagamento_data, gateway_nome, financeira_id, valor, vencimento"

/** PostgREST limita ~1000 por request; sem paginação a varredura do dashboard ignorava pendentes. */
const PAGE_FATURAS_SYNC = 1000

function montarQueryFaturasSync(
  selectCols: string,
  administradoraId: string,
  filtros: {
    faturaId: string
    numeroFatura: string
    /** padrao/reconciliare: só em aberto (evita lotar o lote com milhares de pagas). */
    escopo: "pontual" | "abertas" | "todas"
  }
) {
  let q = supabaseAdmin.from("faturas").select(selectCols).eq("administradora_id", administradoraId)
  if (filtros.faturaId) {
    q = q.eq("id", filtros.faturaId)
  } else if (filtros.numeroFatura) {
    q = q.eq("numero_fatura", filtros.numeroFatura)
  } else if (filtros.escopo === "abertas") {
    // .or() do PostgREST compete com outros filtros: usar filtro embutido
    q = q
      .in("status", ["pendente", "atrasada", "vencida"])
      .not("asaas_charge_id", "is", null)
      .order("vencimento", { ascending: true })
  } else {
    q = q.not("asaas_charge_id", "is", null).order("vencimento", { ascending: false })
  }
  return q
}

async function buscarFaturasPaginadas(
  administradoraId: string,
  filtros: {
    faturaId: string
    numeroFatura: string
    escopo: "pontual" | "abertas" | "todas"
  },
  erros: string[]
): Promise<{ lista: FaturaSyncRow[]; error: { message: string } | null }> {
  const alvoPontual = Boolean(filtros.faturaId || filtros.numeroFatura)
  const selects = [
    SELECT_FATURA_SYNC,
    SELECT_FATURA_SYNC.replace(", financeira_id", ""),
    SELECT_FATURA_SYNC.replace(", financeira_id", "").replace(", gateway_nome", ""),
    "id, numero_fatura, cliente_nome, asaas_charge_id, gateway_id, status, pagamento_data, valor, vencimento",
    "id, numero_fatura, cliente_nome, asaas_charge_id, gateway_id, status",
  ]

  let selectUsado = selects[0]
  let lastError: { message: string } | null = null

  for (const cols of selects) {
    const probe = await montarQueryFaturasSync(cols, administradoraId, filtros).limit(1)
    if (!probe.error) {
      selectUsado = cols
      lastError = null
      break
    }
    lastError = probe.error
    if (!extrairColunaInexistente(probe.error.message)) break
  }

  if (lastError) return { lista: [], error: lastError }

  if (alvoPontual) {
    const { data, error } = await montarQueryFaturasSync(selectUsado, administradoraId, filtros)
    if (error) return { lista: [], error }
    return { lista: (data || []) as FaturaSyncRow[], error: null }
  }

  const all: FaturaSyncRow[] = []
  // Também inclui gateway_id preenchido sem asaas_charge_id (legado)
  const maxPages = filtros.escopo === "todas" ? 40 : 30
  for (let page = 0; page < maxPages; page++) {
    const from = page * PAGE_FATURAS_SYNC
    const to = from + PAGE_FATURAS_SYNC - 1
    const { data, error } = await montarQueryFaturasSync(selectUsado, administradoraId, filtros).range(from, to)
    if (error) {
      if (all.length === 0) return { lista: [], error }
      erros.push(`Aviso: paginação de faturas interrompida: ${error.message}`)
      break
    }
    const chunk = (data || []) as FaturaSyncRow[]
    all.push(...chunk)
    if (chunk.length < PAGE_FATURAS_SYNC) break
  }

  // Complemento: charge só em gateway_id (sem asaas_charge_id)
  if (filtros.escopo === "abertas" || filtros.escopo === "todas") {
    let qGate = supabaseAdmin
      .from("faturas")
      .select(selectUsado)
      .eq("administradora_id", administradoraId)
      .is("asaas_charge_id", null)
      .not("gateway_id", "is", null)
    if (filtros.escopo === "abertas") {
      qGate = qGate.in("status", ["pendente", "atrasada", "vencida"])
    }
    const { data: soGateway } = await qGate.limit(PAGE_FATURAS_SYNC)
    if (Array.isArray(soGateway) && soGateway.length > 0) {
      const ids = new Set(all.map((f) => String(f.id)))
      for (const row of soGateway as FaturaSyncRow[]) {
        if (!ids.has(String(row.id))) all.push(row)
      }
    }
  }

  return { lista: all, error: null }
}

async function buscarFaturasComCobranca(
  administradoraId: string,
  financeiraId: string | null,
  nomeFinanceiraSync: string,
  erros: string[],
  filtros?: {
    numeroFatura?: string | null
    faturaId?: string | null
    modo?: ModoSincronizacaoAsaas
  }
): Promise<FaturaSyncRow[]> {
  const numeroFatura = String(filtros?.numeroFatura || "").trim()
  const faturaId = String(filtros?.faturaId || "").trim()
  const alvoPontual = Boolean(numeroFatura || faturaId)
  const modo = filtros?.modo || "padrao"
  const escopo: "pontual" | "abertas" | "todas" = alvoPontual
    ? "pontual"
    : modo === "todos"
      ? "todas"
      : "abertas"

  const { lista: carregadas, error: faturasError } = await buscarFaturasPaginadas(
    administradoraId,
    { faturaId, numeroFatura, escopo },
    erros
  )

  let lista = carregadas

  if (faturasError) {
    throw new Error(`Erro ao buscar faturas: ${faturasError.message}`)
  }

  if (financeiraId && lista.length > 0 && !alvoPontual) {
    const amostra = lista[0] as Record<string, unknown>
    const podeFiltrarPorFinanceira =
      Object.prototype.hasOwnProperty.call(amostra, "financeira_id") ||
      Object.prototype.hasOwnProperty.call(amostra, "gateway_nome")
    if (podeFiltrarPorFinanceira) {
      lista = lista.filter((r) =>
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

  // Complemento: em aberto sem charge id, com número — reconciliáveis via customer/invoiceNumber
  if (!alvoPontual) {
    const { data: semCharge } = await supabaseAdmin
      .from("faturas")
      .select(SELECT_FATURA_SYNC)
      .eq("administradora_id", administradoraId)
      .in("status", ["pendente", "atrasada", "vencida"])
      .not("numero_fatura", "is", null)
      .is("asaas_charge_id", null)
      .is("gateway_id", null)
      .limit(200)

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
  configs: Array<{ api_key: string; ambiente: string; id?: string; nome?: string }>,
  idsCandidatos: string[],
  financeiraIdFatura?: string | null
): Promise<{ charge: Record<string, unknown> | null; ultimoStatusHttp: number | null }> {
  let charge: Record<string, unknown> | null = null
  let ultimoStatusHttp: number | null = null
  const ordenadas = ordenarConfigsPorFinanceiraFatura(configs, financeiraIdFatura)
  const keysInvalidas = new Set<string>()

  for (const conf of ordenadas) {
    const key = String(conf.api_key || "").trim()
    if (!key || keysInvalidas.has(key)) continue
    const baseUrl =
      conf.ambiente === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3"

    for (const id of idsCandidatos) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${baseUrl}/payments/${id}`, {
        headers: {
          access_token: key,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))

      ultimoStatusHttp = response.status
      if (response.status === 401 || response.status === 403) {
        keysInvalidas.add(key)
        break
      }
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

  const configsTodas = await buscarTodasConfigsAsaasAtivas(administradoraId)
  if (configsTodas.length === 0) {
    throw new Error(
      "Configuração do Asaas não encontrada ou sem API key ativa para esta administradora."
    )
  }
  const configsBusca = await filtrarConfigsComChaveValida(configsTodas, resultado.erros)
  if (configsBusca.length === 0) {
    throw new Error(
      "Nenhuma API Key Asaas válida para esta administradora. Atualize as chaves em Financeiras (401 inválida)."
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
    { numeroFatura: numeroFaturaFiltro, faturaId: faturaIdFiltro, modo }
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
        const busca = await buscarChargeNoAsaas(
          configsBusca,
          obterChargeIds(idBase),
          fatura.financeira_id
        )
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
