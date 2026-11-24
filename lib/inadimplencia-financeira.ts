import { supabaseAdmin } from "@/lib/supabase-admin"
import { faturaPertenceAFinanceira } from "@/lib/fatura-filtro-financeira"
import { normalizarStatusFatura } from "@/lib/fatura-status"

export type PeriodoYm = { ano: number; mes: number }

export type FaturaInadimplenciaRow = {
  id: string
  status?: string | null
  valor?: number | null
  vencimento?: string | null
  cliente_administradora_id?: string | null
  cliente_nome?: string | null
  gateway_nome?: string | null
  financeira_id?: string | null
}

export type ResumoInadimplenciaMes = {
  mes: string
  faturas_geradas: number
  faturas_em_aberto: number
  faturas_pagas: number
  faturas_canceladas: number
  valor_gerado: number
  valor_em_aberto: number
  valor_pago: number
  percentual_qtd: number
  percentual_valor: number
}

export type BreakdownGrupoInadimplencia = {
  grupo_id: string | null
  grupo_nome: string
  faturas_em_aberto: number
  valor_em_aberto: number
  /** % das faturas em aberto da financeira no mês. */
  percentual_qtd_da_inadimplencia: number
  /** % do valor em aberto da financeira no mês. */
  percentual_valor_da_inadimplencia: number
}

const PAGE = 1000

export function limiteMesYm(ym: string): { inicio: string; fimExclusivo: string } | null {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  const inicio = `${ym}-01`
  const fimExclusivo = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`
  return { inicio, fimExclusivo }
}

export function ymFromParts(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`
}

/** Retrocede N meses a partir de ym (inclusive o próprio). */
export function mesesHistoricoInclusive(ym: string, quantidade: number): string[] {
  const [y0, m0] = ym.split("-").map(Number)
  if (!y0 || !m0) return []
  const out: string[] = []
  let y = y0
  let m = m0
  for (let i = 0; i < quantidade; i++) {
    out.push(ymFromParts(y, m))
    m -= 1
    if (m < 1) {
      m = 12
      y -= 1
    }
  }
  return out.reverse()
}

function valorNum(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function statusEmAbertoInadimplencia(status: string | null | undefined): boolean {
  const s = normalizarStatusFatura(status)
  return s === "pendente" || s === "atrasada" || s === "vencida"
}

export function statusPagoInadimplencia(status: string | null | undefined): boolean {
  return normalizarStatusFatura(status) === "paga"
}

export function statusCanceladoInadimplencia(status: string | null | undefined): boolean {
  return normalizarStatusFatura(status) === "cancelada"
}

/**
 * Índice: faturas em aberto (pendente/atrasada) ÷ faturas geradas no mês (exceto canceladas).
 * Canceladas entram no relatório à parte e não diluem o denominador.
 */
export function calcularResumoMes(faturas: FaturaInadimplenciaRow[], mesYm: string): ResumoInadimplenciaMes {
  let geradas = 0
  let emAberto = 0
  let pagas = 0
  let canceladas = 0
  let valorGerado = 0
  let valorEmAberto = 0
  let valorPago = 0

  for (const f of faturas) {
    const ven = String(f.vencimento || "").slice(0, 10)
    if (!ven.startsWith(mesYm)) continue
    const valor = valorNum(f.valor)

    if (statusCanceladoInadimplencia(f.status)) {
      canceladas++
      continue
    }

    geradas++
    valorGerado += valor

    if (statusEmAbertoInadimplencia(f.status)) {
      emAberto++
      valorEmAberto += valor
    } else if (statusPagoInadimplencia(f.status)) {
      pagas++
      valorPago += valor
    }
  }

  const percentual_qtd = geradas > 0 ? Math.round((emAberto / geradas) * 10000) / 100 : 0
  const percentual_valor =
    valorGerado > 0 ? Math.round((valorEmAberto / valorGerado) * 10000) / 100 : 0

  return {
    mes: mesYm,
    faturas_geradas: geradas,
    faturas_em_aberto: emAberto,
    faturas_pagas: pagas,
    faturas_canceladas: canceladas,
    valor_gerado: Math.round(valorGerado * 100) / 100,
    valor_em_aberto: Math.round(valorEmAberto * 100) / 100,
    valor_pago: Math.round(valorPago * 100) / 100,
    percentual_qtd,
    percentual_valor,
  }
}

const SELECT_FATURAS = [
  "id, status, valor, vencimento, cliente_administradora_id, cliente_nome, gateway_nome, financeira_id",
  "id, status, valor, vencimento, cliente_administradora_id, cliente_nome, gateway_nome",
  "id, status, valor, vencimento, cliente_administradora_id, cliente_nome",
]

export async function carregarFaturasPorVencimento(
  administradoraId: string,
  inicio: string,
  fimExclusivo: string
): Promise<FaturaInadimplenciaRow[]> {
  let selectUsado = SELECT_FATURAS[0]
  for (const cols of SELECT_FATURAS) {
    const probe = await supabaseAdmin
      .from("faturas")
      .select(cols)
      .eq("administradora_id", administradoraId)
      .limit(1)
    if (!probe.error) {
      selectUsado = cols
      break
    }
  }

  const all: FaturaInadimplenciaRow[] = []
  for (let page = 0; page < 40; page++) {
    const from = page * PAGE
    const to = from + PAGE - 1
    const { data, error } = await supabaseAdmin
      .from("faturas")
      .select(selectUsado)
      .eq("administradora_id", administradoraId)
      .gte("vencimento", inicio)
      .lt("vencimento", fimExclusivo)
      .order("vencimento", { ascending: true })
      .range(from, to)

    if (error) {
      if (all.length === 0) throw new Error(`Erro ao carregar faturas: ${error.message}`)
      break
    }
    const chunk = (data || []) as FaturaInadimplenciaRow[]
    all.push(...chunk)
    if (chunk.length < PAGE) break
  }
  return all
}

export function filtrarFaturasPorFinanceira(
  faturas: FaturaInadimplenciaRow[],
  financeiraId: string | null,
  nomeFinanceira: string
): FaturaInadimplenciaRow[] {
  const id = String(financeiraId || "").trim()
  if (!id) return faturas
  return faturas.filter((f) =>
    faturaPertenceAFinanceira(f.financeira_id, f.gateway_nome, id, nomeFinanceira, {
      tratarGatewayVazioComoMatch: false,
    })
  )
}

/** Mapa cliente_administradora_id → { grupo_id, grupo_nome } (prioriza vida ativa). */
export async function mapearClientesParaGrupos(
  administradoraId: string,
  clienteIds: string[]
): Promise<Map<string, { grupo_id: string; grupo_nome: string }>> {
  const out = new Map<string, { grupo_id: string; grupo_nome: string }>()
  const unicos = [...new Set(clienteIds.map((id) => String(id || "").trim()).filter(Boolean))]
  if (unicos.length === 0) return out

  const { data: gruposRows } = await supabaseAdmin
    .from("grupos_beneficiarios")
    .select("id, nome")
    .eq("administradora_id", administradoraId)

  const nomePorGrupo = new Map<string, string>()
  for (const g of gruposRows || []) {
    const id = String((g as { id?: string }).id || "")
    const nome = String((g as { nome?: string }).nome || "Grupo").trim() || "Grupo"
    if (id) nomePorGrupo.set(id, nome)
  }

  for (let i = 0; i < unicos.length; i += 200) {
    const chunk = unicos.slice(i, i + 200)
    const { data: vidas } = await supabaseAdmin
      .from("vidas_importadas")
      .select("cliente_administradora_id, grupo_id, ativo")
      .eq("administradora_id", administradoraId)
      .in("cliente_administradora_id", chunk)
      .not("grupo_id", "is", null)

    for (const row of vidas || []) {
      const ca = String((row as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
      const gid = String((row as { grupo_id?: string }).grupo_id || "").trim()
      if (!ca || !gid) continue
      const ativo = (row as { ativo?: boolean }).ativo !== false
      const atual = out.get(ca)
      if (!atual || (ativo && !atual.grupo_id)) {
        out.set(ca, {
          grupo_id: gid,
          grupo_nome: nomePorGrupo.get(gid) || "Grupo",
        })
      } else if (ativo) {
        out.set(ca, {
          grupo_id: gid,
          grupo_nome: nomePorGrupo.get(gid) || atual.grupo_nome,
        })
      }
    }
  }

  // Complemento via clientes_grupos (quando não há vida importada)
  const semGrupo = unicos.filter((id) => !out.has(id))
  if (semGrupo.length > 0 && nomePorGrupo.size > 0) {
    for (let i = 0; i < semGrupo.length; i += 200) {
      const chunk = semGrupo.slice(i, i + 200)
      const { data: vinculos } = await supabaseAdmin
        .from("clientes_grupos")
        .select("cliente_id, grupo_id, cliente_tipo")
        .in("cliente_id", chunk)

      for (const v of vinculos || []) {
        const tipo = String((v as { cliente_tipo?: string }).cliente_tipo || "")
        const cid = String((v as { cliente_id?: string }).cliente_id || "").trim()
        const gid = String((v as { grupo_id?: string }).grupo_id || "").trim()
        if (!cid || !gid) continue
        if (tipo && tipo !== "cliente_administradora" && tipo !== "administradora") continue
        if (out.has(cid)) continue
        out.set(cid, {
          grupo_id: gid,
          grupo_nome: nomePorGrupo.get(gid) || "Grupo",
        })
      }
    }
  }

  return out
}

export function breakdownPorGrupo(
  faturasEmAberto: FaturaInadimplenciaRow[],
  mapaClienteGrupo: Map<string, { grupo_id: string; grupo_nome: string }>,
  filtroGrupoId?: string | null
): BreakdownGrupoInadimplencia[] {
  const totalQtd = faturasEmAberto.length
  const totalValor = faturasEmAberto.reduce((acc, f) => acc + valorNum(f.valor), 0)

  const agg = new Map<
    string,
    { grupo_id: string | null; grupo_nome: string; qtd: number; valor: number }
  >()

  for (const f of faturasEmAberto) {
    const ca = String(f.cliente_administradora_id || "").trim()
    const info = ca ? mapaClienteGrupo.get(ca) : undefined
    const gid = info?.grupo_id || null
    const gnome = info?.grupo_nome || "Sem grupo"
    if (filtroGrupoId && gid !== filtroGrupoId) continue
    const key = gid || "__sem_grupo__"
    const atual = agg.get(key) || { grupo_id: gid, grupo_nome: gnome, qtd: 0, valor: 0 }
    atual.qtd += 1
    atual.valor += valorNum(f.valor)
    agg.set(key, atual)
  }

  const rows = [...agg.values()]
    .map((r) => ({
      grupo_id: r.grupo_id,
      grupo_nome: r.grupo_nome,
      faturas_em_aberto: r.qtd,
      valor_em_aberto: Math.round(r.valor * 100) / 100,
      percentual_qtd_da_inadimplencia:
        totalQtd > 0 ? Math.round((r.qtd / totalQtd) * 10000) / 100 : 0,
      percentual_valor_da_inadimplencia:
        totalValor > 0 ? Math.round((r.valor / totalValor) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.valor_em_aberto - a.valor_em_aberto)

  return rows
}
