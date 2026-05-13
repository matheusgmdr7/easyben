import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import { carregarVidasImportadasDoGrupo } from "@/lib/vidas-importadas-grupo"
import { CHUNK_IN_CLIENTE_IDS } from "@/lib/boletos-grupo-faturas"

export const maxDuration = 60

function limiteMes(mes: string): { inicio: string; fimExclusivo: string } | null {
  const [y, m] = mes.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  const inicio = `${mes}-01`
  const fimExclusivo = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`
  return { inicio, fimExclusivo }
}

/**
 * GET /api/administradora/auditoria/faturas-grupo?grupo_id=&administradora_id=&mes=YYYY-MM
 * Conta beneficiários ativos (vidas importadas) e lista titulares da emissão sem fatura no mês (vencimento).
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const grupoId = url.searchParams.get("grupo_id")
    const administradoraId = url.searchParams.get("administradora_id")
    const mes = url.searchParams.get("mes")?.trim() || ""

    if (!grupoId || !administradoraId) {
      return NextResponse.json({ error: "grupo_id e administradora_id são obrigatórios" }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json({ error: "mes inválido (use YYYY-MM)" }, { status: 400 })
    }
    const limites = limiteMes(mes)
    if (!limites) return NextResponse.json({ error: "mes inválido" }, { status: 400 })

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

    const vidasAtivas = (await carregarVidasImportadasDoGrupo(grupoId, administradoraId)).filter((v) => v?.ativo !== false)
    const tipoV = (v: Record<string, unknown>) => String((v.tipo ?? "titular") ?? "").toLowerCase()

    let titularesAtivosVidas = 0
    let dependentesAtivosVidas = 0
    for (const v of vidasAtivas) {
      if (tipoV(v) === "dependente") dependentesAtivosVidas += 1
      else titularesAtivosVidas += 1
    }

    const titularesRes = await fetch(
      new URL(
        `/api/administradora/grupos/${encodeURIComponent(grupoId)}/clientes-fatura?administradora_id=${encodeURIComponent(administradoraId)}`,
        url.origin
      ).toString(),
      { cache: "no-store" }
    )
    if (!titularesRes.ok) {
      const errBody = await titularesRes.json().catch(() => ({}))
      const msg =
        typeof (errBody as { error?: string }).error === "string"
          ? (errBody as { error: string }).error
          : "Erro ao listar titulares do grupo"
      return NextResponse.json({ error: msg }, { status: titularesRes.status >= 400 ? titularesRes.status : 500 })
    }
    const titularesEmissao = (await titularesRes.json()) as Array<{
      id: string
      cliente_administradora_id: string
      cliente_nome: string
      cliente_cpf?: string
      cliente_email?: string
      produto_nome?: string
      valor_mensal?: number
      dia_vencimento?: string
      dependentes_nomes?: string[]
    }>

    const idsUuid = Array.from(
      new Set(
        titularesEmissao
          .map((t) => String(t.cliente_administradora_id || "").trim())
          .filter((id) => id && !id.startsWith("vida:"))
      )
    )

    const comFaturaNoMes = new Set<string>()
    for (let i = 0; i < idsUuid.length; i += CHUNK_IN_CLIENTE_IDS) {
      const chunk = idsUuid.slice(i, i + CHUNK_IN_CLIENTE_IDS)
      let { data, error } = await supabaseAdmin
        .from("faturas")
        .select("id, cliente_administradora_id, vencimento, numero_fatura, status")
        .in("cliente_administradora_id", chunk)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .gte("vencimento", limites.inicio)
        .lt("vencimento", limites.fimExclusivo)

      if (error) {
        const fb = await supabaseAdmin
          .from("faturas")
          .select("id, cliente_administradora_id, vencimento, numero_fatura, status")
          .in("cliente_administradora_id", chunk)
          .eq("administradora_id", administradoraId)
          .gte("vencimento", limites.inicio)
          .lt("vencimento", limites.fimExclusivo)
        data = fb.data
        error = fb.error as typeof error
      }
      if (error) {
        console.error("[auditoria/faturas-grupo] erro faturas:", error)
        return NextResponse.json({ error: "Erro ao consultar faturas do período" }, { status: 500 })
      }
      for (const row of data || []) {
        const ca = String((row as { cliente_administradora_id?: string }).cliente_administradora_id || "").trim()
        if (ca) comFaturaNoMes.add(ca)
      }
    }

    const titularesSemFaturaNoMes: Array<{
      id: string
      cliente_administradora_id: string
      cliente_nome: string
      cliente_cpf?: string
      cliente_email?: string
      produto_nome?: string
      valor_mensal?: number
      dia_vencimento?: string
      dependentes_nomes?: string[]
      motivo?: string
    }> = []

    for (const t of titularesEmissao) {
      const caId = String(t.cliente_administradora_id || "").trim()
      if (!caId) continue
      if (caId.startsWith("vida:")) {
        titularesSemFaturaNoMes.push({
          ...t,
          motivo: "Titular sem cliente administradora vinculado (cadastre/vincule antes de faturar).",
        })
        continue
      }
      if (!comFaturaNoMes.has(caId)) {
        titularesSemFaturaNoMes.push(t)
      }
    }

    const beneficiariosAtivos = vidasAtivas.length > 0 ? vidasAtivas.length : titularesEmissao.length
    const titularesAtivos = vidasAtivas.length > 0 ? titularesAtivosVidas : titularesEmissao.length
    const dependentesAtivos = vidasAtivas.length > 0 ? dependentesAtivosVidas : 0

    return NextResponse.json({
      grupo: { id: grupo.id, nome: grupo.nome },
      mes,
      criterio:
        "Titulares: mesma lista usada em Fatura > Gerar. Fatura no mês: existe fatura com vencimento dentro do mês (intervalo [YYYY-MM-01, primeiro dia do mês seguinte)).",
      contagem: {
        beneficiariosAtivos,
        titularesAtivos,
        dependentesAtivos,
        titularesNaListaEmissao: titularesEmissao.length,
        titularesComFaturaNoMes: titularesEmissao.length - titularesSemFaturaNoMes.length,
        titularesSemFaturaNoMes: titularesSemFaturaNoMes.length,
      },
      titularesSemFaturaNoMes,
    })
  } catch (e: unknown) {
    console.error("auditoria/faturas-grupo:", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro na auditoria" }, { status: 500 })
  }
}
