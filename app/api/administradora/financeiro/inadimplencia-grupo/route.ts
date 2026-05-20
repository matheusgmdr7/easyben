import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import { carregarVidasImportadasDoGrupo } from "@/lib/vidas-importadas-grupo"
import { listarClienteAdministradoraIdsENomesDoGrupo } from "@/lib/grupo-cliente-administradora-ids"
import { CHUNK_IN_CLIENTE_IDS } from "@/lib/boletos-grupo-faturas"
import { filtrarTitularesAtivosParaInadimplencia } from "@/lib/inadimplencia-grupo"

export const maxDuration = 60

function limiteMes(mes: string): { inicio: string; fimExclusivo: string } | null {
  const [y, m] = mes.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  const inicio = `${mes}-01`
  const fimExclusivo = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`
  return { inicio, fimExclusivo }
}

function mesesEntreInclusive(mesIni: string, mesFim: string): string[] {
  const li = limiteMes(mesIni)
  const lf = limiteMes(mesFim)
  if (!li || !lf) return []
  if (mesIni > mesFim) return []
  const out: string[] = []
  let [y, m] = mesIni.split("-").map(Number)
  const [yf, mf] = mesFim.split("-").map(Number)
  for (;;) {
    const ym = `${y}-${String(m).padStart(2, "0")}`
    out.push(ym)
    if (y === yf && m === mf) break
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out
}

/**
 * GET ?grupo_id=&administradora_id=&mes_inicio=YYYY-MM&mes_fim=YYYY-MM
 * Índice de titulares (cliente ADM) com fatura atrasada por mês de vencimento, sobre a base de titulares do grupo.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const grupoId = url.searchParams.get("grupo_id")
    const administradoraId = url.searchParams.get("administradora_id")
    const mesInicio = url.searchParams.get("mes_inicio")?.trim() || ""
    const mesFim = url.searchParams.get("mes_fim")?.trim() || ""

    if (!grupoId || !administradoraId) {
      return NextResponse.json({ error: "grupo_id e administradora_id são obrigatórios" }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}$/.test(mesInicio) || !/^\d{4}-\d{2}$/.test(mesFim)) {
      return NextResponse.json({ error: "mes_inicio e mes_fim devem estar no formato YYYY-MM" }, { status: 400 })
    }
    if (mesInicio > mesFim) {
      return NextResponse.json({ error: "mes_inicio não pode ser maior que mes_fim" }, { status: 400 })
    }

    const tenantId = await resolveTenantIdForAdministradora(administradoraId)

    let { data: grupo } = await supabaseAdmin
      .from("grupos_beneficiarios")
      .select("id, nome")
      .eq("id", grupoId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!grupo) {
      const fb = await supabaseAdmin
        .from("grupos_beneficiarios")
        .select("id, nome")
        .eq("id", grupoId)
        .eq("administradora_id", administradoraId)
        .maybeSingle()
      grupo = fb.data
    }
    if (!grupo) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })

    const { ids: clienteIds } = await listarClienteAdministradoraIdsENomesDoGrupo(
      grupoId,
      administradoraId,
      tenantId
    )

    const clienteIdsAtivos = await filtrarTitularesAtivosParaInadimplencia(
      clienteIds,
      grupoId,
      administradoraId,
      tenantId
    )

    const vidasAtivas = (await carregarVidasImportadasDoGrupo(grupoId, administradoraId)).filter((v) => v?.ativo !== false)
    const totalVidasAtivas = vidasAtivas.length

    const limIni = limiteMes(mesInicio)
    const limFim = limiteMes(mesFim)
    if (!limIni || !limFim) return NextResponse.json({ error: "Mês inválido" }, { status: 400 })
    const rangeInicio = limIni.inicio
    const rangeFimExclusivo = limFim.fimExclusivo

    const mesesLista = mesesEntreInclusive(mesInicio, mesFim)
    const porMesMap = new Map<string, Set<string>>()
    for (const m of mesesLista) {
      porMesMap.set(m, new Set())
    }

    const titularesComAtrasadaNoPeriodo = new Set<string>()

    if (clienteIdsAtivos.length > 0) {
      for (let i = 0; i < clienteIdsAtivos.length; i += CHUNK_IN_CLIENTE_IDS) {
        const chunk = clienteIdsAtivos.slice(i, i + CHUNK_IN_CLIENTE_IDS)
        let q = supabaseAdmin
          .from("faturas")
          .select("cliente_administradora_id, vencimento")
          .in("cliente_administradora_id", chunk)
          .eq("administradora_id", administradoraId)
          .eq("status", "atrasada")
          .gte("vencimento", rangeInicio)
          .lt("vencimento", rangeFimExclusivo)

        let { data, error } = await q.eq("tenant_id", tenantId)
        if (error) {
          const fb = await supabaseAdmin
            .from("faturas")
            .select("cliente_administradora_id, vencimento")
            .in("cliente_administradora_id", chunk)
            .eq("administradora_id", administradoraId)
            .eq("status", "atrasada")
            .gte("vencimento", rangeInicio)
            .lt("vencimento", rangeFimExclusivo)
          data = fb.data
          error = fb.error as typeof error
        }
        if (error) {
          console.error("[inadimplencia-grupo] faturas:", error)
          return NextResponse.json({ error: "Erro ao consultar faturas atrasadas" }, { status: 500 })
        }
        for (const row of data || []) {
          const ca = String((row as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
          const ven = String((row as { vencimento?: string }).vencimento || "").slice(0, 10)
          if (!ca || !/^\d{4}-\d{2}-\d{2}$/.test(ven)) continue
          const mesRef = ven.slice(0, 7)
          titularesComAtrasadaNoPeriodo.add(ca)
          const setMes = porMesMap.get(mesRef)
          if (setMes) setMes.add(ca)
        }
      }
    }

    const denominadorPercentual =
      clienteIdsAtivos.length > 0 ? clienteIdsAtivos.length : Math.max(totalVidasAtivas, 1)

    const porMes = mesesLista.map((mesYm) => {
      const set = porMesMap.get(mesYm) || new Set()
      const n = set.size
      const pct = denominadorPercentual > 0 ? Math.round((n / denominadorPercentual) * 10000) / 100 : 0
      return {
        mes: mesYm,
        titularesComFaturaAtrasada: n,
        percentual: pct,
      }
    })

    const nPeriodo = titularesComAtrasadaNoPeriodo.size
    const pctPeriodo = denominadorPercentual > 0 ? Math.round((nPeriodo / denominadorPercentual) * 10000) / 100 : 0

    return NextResponse.json({
      grupo: { id: grupo.id, nome: grupo.nome },
      mes_inicio: mesInicio,
      mes_fim: mesFim,
      criterio:
        "Somente titulares ativos: status ativo em clientes_administradoras e, quando há vida importada no grupo, " +
        "ao menos uma vida ativa vinculada. Fatura atrasada: status = atrasada e vencimento no mês (série) ou no intervalo (resumo). " +
        "Percentual = titulares ativos com ≥1 fatura atrasada / total de titulares ativos do grupo.",
      totais: {
        totalVidasAtivas: totalVidasAtivas,
        totalTitularesComVinculoFaturamento: clienteIds.length,
        totalTitularesAtivos: clienteIdsAtivos.length,
        basePercentualTitulares: denominadorPercentual,
      },
      resumoPeriodo: {
        titularesDistintosComAtrasada: nPeriodo,
        percentual: pctPeriodo,
      },
      porMes,
    })
  } catch (e: unknown) {
    console.error("inadimplencia-grupo:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro no relatório" }, { status: 500 })
  }
}
