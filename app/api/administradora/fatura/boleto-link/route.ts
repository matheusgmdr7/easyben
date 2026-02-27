import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"

/**
 * GET /api/administradora/fatura/boleto-link?fatura_id=xxx&administradora_id=yyy
 * Retorna o link do boleto de uma fatura já gerada (lê asaas_boleto_url e boleto_url do banco).
 * Útil quando você só tem o fatura_id e precisa do link sem carregar a lista inteira.
 */
export async function GET(request: NextRequest) {
  try {
    const faturaId = request.nextUrl.searchParams.get("fatura_id")
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")

    if (!faturaId || !administradoraId) {
      return NextResponse.json(
        { error: "fatura_id e administradora_id são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await getCurrentTenantId()

    const { data: fatura, error } = await supabaseAdmin
      .from("faturas")
      .select("id, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id")
      .eq("id", faturaId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (error) {
      console.error("Erro ao buscar fatura para boleto-link:", error)
      return NextResponse.json({ error: "Erro ao buscar fatura" }, { status: 500 })
    }

    if (!fatura) {
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
    }

    const boleto_url = getBoletoLinkFromFatura(fatura as { asaas_boleto_url?: string | null; boleto_url?: string | null; gateway_id?: string | null; asaas_charge_id?: string | null })

    return NextResponse.json({
      fatura_id: fatura.id,
      boleto_url: boleto_url ?? undefined,
    })
  } catch (e: unknown) {
    console.error("Erro boleto-link:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao obter link do boleto" },
      { status: 500 }
    )
  }
}
