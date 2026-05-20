import { supabaseAdmin } from "@/lib/supabase-admin"
import { CHUNK_IN_CLIENTE_IDS } from "@/lib/boletos-grupo-faturas"

const STATUS_CANCELAMENTO_ABERTO = ["solicitado", "processado_operadora"] as const

export type ResumoSegmentoAtrasadas = {
  faturas: number
  clientes: number
}

export type ResumoAtrasadasDashboard = {
  criterio: string
  no_periodo: {
    total_faturas_atrasadas: number
    uma_fatura: ResumoSegmentoAtrasadas
    duas_ou_mais: ResumoSegmentoAtrasadas & {
      faturas_clientes_cancelados_inadimplencia: number
      clientes_cancelados_inadimplencia: number
    }
  }
}

/** Conta faturas com status atrasada por cliente (todos os vencimentos). */
export async function contarFaturasAtrasadasTotaisPorCliente(
  administradoraId: string,
  tenantId: string
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  const PAGE = 1000
  let from = 0
  let hasMore = true

  while (hasMore) {
    let q = supabaseAdmin
      .from("faturas")
      .select("cliente_administradora_id")
      .eq("administradora_id", administradoraId)
      .eq("status", "atrasada")
      .not("cliente_administradora_id", "is", null)
      .range(from, from + PAGE - 1)

    const tid = String(tenantId || "").trim()
    if (tid) q = q.or(`tenant_id.eq.${tid},tenant_id.is.null`)
    else q = q.is("tenant_id", null)

    const { data, error } = await q
    if (error) throw error

    const list = data || []
    for (const row of list) {
      const ca = String((row as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
      if (!ca) continue
      counts.set(ca, (counts.get(ca) || 0) + 1)
    }
    hasMore = list.length === PAGE
    from += PAGE
  }

  return counts
}

function motivoIndicaInadimplencia(motivo: string | null | undefined): boolean {
  const m = String(motivo || "").toLowerCase()
  return m.includes("inadimpl")
}

/**
 * Cliente cancelado/inativo por inadimplência: status inadimplente/cancelado no CA,
 * ou cancelamento aberto com motivo de inadimplência, ou vida inativa com cancelamento aberto.
 */
export async function identificarClientesCanceladosPorInadimplencia(
  clienteIds: string[],
  administradoraId: string,
  tenantId: string
): Promise<Set<string>> {
  const resultado = new Set<string>()
  if (clienteIds.length === 0) return resultado

  const statusPorCa = new Map<string, string>()
  for (let i = 0; i < clienteIds.length; i += CHUNK_IN_CLIENTE_IDS) {
    const chunk = clienteIds.slice(i, i + CHUNK_IN_CLIENTE_IDS)
    let { data, error } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("id, status")
      .in("id", chunk)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    if (error) {
      const fb = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, status")
        .in("id", chunk)
        .eq("administradora_id", administradoraId)
      data = fb.data
      error = fb.error as typeof error
    }
    if (error) throw error

    for (const row of data || []) {
      const id = String((row as { id?: string }).id || "").trim()
      const st = String((row as { status?: string }).status || "").toLowerCase()
      if (id) statusPorCa.set(id, st)
    }
  }

  for (const caId of clienteIds) {
    const st = statusPorCa.get(caId) || ""
    if (st === "inadimplente") resultado.add(caId)
  }

  const pendentesMotivo = clienteIds.filter((id) => !resultado.has(id))
  if (pendentesMotivo.length === 0) return resultado

  const vidaIdsPorCa = new Map<string, string[]>()
  const vidasAtivasPorCa = new Map<string, boolean>()

  for (let i = 0; i < pendentesMotivo.length; i += CHUNK_IN_CLIENTE_IDS) {
    const chunk = pendentesMotivo.slice(i, i + CHUNK_IN_CLIENTE_IDS)
    let { data: vidas, error: errV } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id, cliente_administradora_id, ativo")
      .in("cliente_administradora_id", chunk)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    if (errV) {
      const fb = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, cliente_administradora_id, ativo")
        .in("cliente_administradora_id", chunk)
        .eq("administradora_id", administradoraId)
      vidas = fb.data
      errV = fb.error as typeof errV
    }
    if (errV) throw errV

    for (const v of vidas || []) {
      const caId = String((v as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
      const vidaId = String((v as { id?: string }).id || "").trim()
      if (!caId || !vidaId) continue
      const lista = vidaIdsPorCa.get(caId) || []
      lista.push(vidaId)
      vidaIdsPorCa.set(caId, lista)
      if ((v as { ativo?: boolean }).ativo !== false) {
        vidasAtivasPorCa.set(caId, true)
      }
    }
  }

  const todosVidaIds = Array.from(new Set([...vidaIdsPorCa.values()].flat()))
  const cancelamentoPorVida = new Map<string, { motivo?: string | null; status?: string }>()

  for (let i = 0; i < todosVidaIds.length; i += CHUNK_IN_CLIENTE_IDS) {
    const chunk = todosVidaIds.slice(i, i + CHUNK_IN_CLIENTE_IDS)
    let q = supabaseAdmin
      .from("cancelamentos_beneficiarios")
      .select("vida_id, motivo_solicitacao, status_fluxo")
      .in("vida_id", chunk)
      .eq("administradora_id", administradoraId)
      .in("status_fluxo", [...STATUS_CANCELAMENTO_ABERTO])

    if (tenantId) q = q.eq("tenant_id", tenantId)

    const { data: cans, error: errC } = await q
    if (errC) throw errC

    for (const c of cans || []) {
      const vid = String((c as { vida_id?: string }).vida_id || "").trim()
      if (!vid) continue
      cancelamentoPorVida.set(vid, {
        motivo: (c as { motivo_solicitacao?: string }).motivo_solicitacao,
        status: (c as { status_fluxo?: string }).status_fluxo,
      })
    }
  }

  for (const caId of pendentesMotivo) {
    const st = statusPorCa.get(caId) || ""
    if (st === "cancelado" || st === "inadimplente") {
      resultado.add(caId)
      continue
    }

    const vidaIds = vidaIdsPorCa.get(caId) || []
    let temCancelamentoInadimplencia = false
    for (const vidaId of vidaIds) {
      const can = cancelamentoPorVida.get(vidaId)
      if (can && motivoIndicaInadimplencia(can.motivo)) {
        temCancelamentoInadimplencia = true
        break
      }
    }

    const semVidaAtiva = vidaIds.length > 0 && !vidasAtivasPorCa.get(caId)
    if (temCancelamentoInadimplencia && (semVidaAtiva || st !== "ativo")) {
      resultado.add(caId)
    }
  }

  return resultado
}

export function montarResumoAtrasadasNoPeriodo(
  faturasAtrasadasPeriodo: Array<{ cliente_administradora_id?: string | null }>,
  atrasadasTotaisPorCliente: Map<string, number>,
  canceladosInadimplencia: Set<string>
): ResumoAtrasadasDashboard {
  const umaFaturaClientes = new Set<string>()
  const duasOuMaisClientes = new Set<string>()
  const duasOuMaisCanceladosClientes = new Set<string>()
  let faturasUma = 0
  let faturasDuasOuMais = 0
  let faturasDuasOuMaisCancelados = 0

  for (const f of faturasAtrasadasPeriodo) {
    const caId = String(f.cliente_administradora_id || "").trim()
    if (!caId) continue
    const total = atrasadasTotaisPorCliente.get(caId) || 1
    if (total >= 2) {
      faturasDuasOuMais += 1
      duasOuMaisClientes.add(caId)
      if (canceladosInadimplencia.has(caId)) {
        faturasDuasOuMaisCancelados += 1
        duasOuMaisCanceladosClientes.add(caId)
      }
    } else {
      faturasUma += 1
      umaFaturaClientes.add(caId)
    }
  }

  return {
    criterio:
      "Faturas atrasadas no período (vencimento no mês). Segmentação 1 vs 2+ boletos usa o total de faturas atrasadas do cliente em todos os vencimentos. " +
      "Cancelados por inadimplência: status inadimplente/cancelado ou cancelamento aberto com motivo de inadimplência, com quitação pendente.",
    no_periodo: {
      total_faturas_atrasadas: faturasAtrasadasPeriodo.length,
      uma_fatura: { faturas: faturasUma, clientes: umaFaturaClientes.size },
      duas_ou_mais: {
        faturas: faturasDuasOuMais,
        clientes: duasOuMaisClientes.size,
        faturas_clientes_cancelados_inadimplencia: faturasDuasOuMaisCancelados,
        clientes_cancelados_inadimplencia: duasOuMaisCanceladosClientes.size,
      },
    },
  }
}
