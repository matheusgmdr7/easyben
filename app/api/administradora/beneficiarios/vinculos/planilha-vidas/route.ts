import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { resolveTenantIdForAdministradora } from "@/lib/resolve-tenant-administradora"
import { mapearVidaParaFichaAdmissao } from "@/lib/vinculos-beneficiario-dados"
import { normalizarCpfPlanilha } from "@/lib/vinculos-planilha"

type LinhaEntrada = {
  cpf?: string
  nome?: string
  linha?: number
}

function cpfFormatadoBr(cpf11: string): string {
  if (cpf11.length !== 11) return cpf11
  return `${cpf11.slice(0, 3)}.${cpf11.slice(3, 6)}.${cpf11.slice(6, 9)}-${cpf11.slice(9)}`
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * POST /api/administradora/beneficiarios/vinculos/planilha-vidas
 * Body: { administradora_id, linhas: [{ cpf, nome?, linha? }] }
 * Cruza CPFs da planilha com vidas_importadas para geração de fichas em lote.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body.administradora_id || "").trim()
    const linhas = Array.isArray(body.linhas) ? (body.linhas as LinhaEntrada[]) : []

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }
    if (linhas.length === 0) {
      return NextResponse.json({ error: "Nenhuma linha válida na planilha" }, { status: 400 })
    }

    const tenantId = await resolveTenantIdForAdministradora(administradoraId)

    const linhasNorm = linhas
      .map((l, idx) => ({
        linha: typeof l.linha === "number" ? l.linha : idx + 2,
        cpf: normalizarCpfPlanilha(l.cpf),
        nome: String(l.nome || "").trim(),
      }))
      .filter((l) => l.cpf.length === 11)

    if (linhasNorm.length === 0) {
      return NextResponse.json({ error: "Nenhum CPF válido na planilha" }, { status: 400 })
    }

    const cpfsUnicos = Array.from(new Set(linhasNorm.map((l) => l.cpf)))
    const termosBusca = Array.from(
      new Set(cpfsUnicos.flatMap((c) => [c, cpfFormatadoBr(c)]).filter(Boolean))
    )

    type VidaRow = {
      id: string
      nome: string | null
      cpf: string | null
      tipo: string | null
      ativo: boolean | null
      data_nascimento?: string | null
      dados_adicionais?: Record<string, unknown> | null
    }

    const vidasPorCpf = new Map<string, VidaRow>()

    for (const termos of chunkArray(termosBusca, 300)) {
      let query = supabaseAdmin
        .from("vidas_importadas")
        .select("id, nome, cpf, tipo, ativo, data_nascimento, dados_adicionais")
        .eq("administradora_id", administradoraId)
        .in("cpf", termos)
        .neq("ativo", false)
        .order("created_at", { ascending: false })

      if (tenantId) query = query.eq("tenant_id", tenantId)

      const { data, error } = await query
      if (error) {
        console.error("planilha-vidas:", error)
        return NextResponse.json({ error: "Erro ao buscar beneficiários" }, { status: 500 })
      }

      for (const row of (data || []) as VidaRow[]) {
        const k = normalizarCpfPlanilha(row.cpf)
        if (!k || vidasPorCpf.has(k)) continue
        vidasPorCpf.set(k, row)
      }
    }

    const vidas: Array<{
      id: string
      nome: string
      cpf: string | null
      tipo: string | null
      ativo: boolean
      faltando: string[]
      linha_planilha: number
      nome_planilha: string
    }> = []

    const naoEncontrados: Array<{ linha: number; cpf: string; nome: string }> = []
    const vistos = new Set<string>()

    for (const ln of linhasNorm) {
      if (vistos.has(ln.cpf)) continue
      vistos.add(ln.cpf)

      const vida = vidasPorCpf.get(ln.cpf)
      if (!vida) {
        naoEncontrados.push({ linha: ln.linha, cpf: ln.cpf, nome: ln.nome })
        continue
      }

      const auto = mapearVidaParaFichaAdmissao(vida as Record<string, unknown>)
      const faltando: string[] = []
      if (!auto.endereco_completo) faltando.push("endereco")
      if (!auto.rg) faltando.push("rg")
      if (!auto.orgao_emissor) faltando.push("orgao_emissor")
      if (!auto.local_nascimento) faltando.push("local_nascimento")

      vidas.push({
        id: vida.id,
        nome: vida.nome || ln.nome || "—",
        cpf: vida.cpf,
        tipo: vida.tipo,
        ativo: vida.ativo !== false,
        faltando,
        linha_planilha: ln.linha,
        nome_planilha: ln.nome,
      })
    }

    vidas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

    return NextResponse.json({
      vidas,
      nao_encontrados: naoEncontrados,
      total_planilha: linhasNorm.length,
      total_encontrados: vidas.length,
    })
  } catch (e: unknown) {
    console.error("Erro POST planilha-vidas:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao processar planilha" },
      { status: 500 }
    )
  }
}
