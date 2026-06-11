import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sincronizarStatusFaturasComAsaas } from "@/services/sincronizar-status-asaas-service"

export const maxDuration = 300

function autorizadoCron(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET || "").trim()
  if (!secret) return false
  const header = request.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

/**
 * Job em lote (cron): sincroniza status com o Asaas para todas as administradoras ativas.
 * Configure CRON_SECRET e agende GET/POST com Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  return executarJob(request)
}

export async function POST(request: NextRequest) {
  return executarJob(request)
}

async function executarJob(request: NextRequest) {
  if (!autorizadoCron(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { data: financeiras, error } = await supabaseAdmin
    .from("administradora_financeiras")
    .select("administradora_id, nome")
    .eq("ativo", true)
    .eq("instituicao_financeira", "asaas")
    .not("api_key", "is", null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const idsUnicos = Array.from(
    new Set((financeiras || []).map((f) => String(f.administradora_id || "").trim()).filter(Boolean))
  )

  const resumos: Array<{
    administradora_id: string
    nome: string | null
    faturas_atualizadas: number
    faturas_inconsistentes_encontradas: number
    alteracoes_status: number
    erro?: string
  }> = []

  for (const admId of idsUnicos) {
    const nomeFin =
      (financeiras || []).find((f) => String(f.administradora_id) === admId)?.nome ?? null
    try {
      let offset = 0
      let totalAtualizadas = 0
      let inconsistentes = 0
      let alteracoes = 0
      let rodadas = 0

      while (rodadas < 20) {
        const r = await sincronizarStatusFaturasComAsaas({
          administradoraId: admId,
          modo: "padrao",
          offset,
        })
        totalAtualizadas += r.faturas_atualizadas
        inconsistentes = Math.max(inconsistentes, r.faturas_inconsistentes_encontradas)
        alteracoes += r.alteracoes_status.length
        if (r.proximo_offset == null) break
        offset = r.proximo_offset
        rodadas++
      }

      resumos.push({
        administradora_id: admId,
        nome: nomeFin,
        faturas_atualizadas: totalAtualizadas,
        faturas_inconsistentes_encontradas: inconsistentes,
        alteracoes_status: alteracoes,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      resumos.push({
        administradora_id: admId,
        nome: nomeFin,
        faturas_atualizadas: 0,
        faturas_inconsistentes_encontradas: 0,
        alteracoes_status: 0,
        erro: msg,
      })
    }
  }

  return NextResponse.json({
    administradoras_processadas: resumos.length,
    resumos,
  })
}
