import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { getBoletoLinkFromFatura } from "@/lib/fatura-boleto-link"

/**
 * GET /api/administradora/fatura/faturas-cliente?cliente_administradora_id=xxx&administradora_id=yyy
 * Retorna as faturas do cliente com asaas_boleto_url (para a aba Financeiro do modal do beneficiário).
 * Usa supabaseAdmin para garantir que as colunas de boleto sejam retornadas (evita RLS/permissões do client).
 */
export async function GET(request: NextRequest) {
  try {
    const clienteAdministradoraId = request.nextUrl.searchParams.get("cliente_administradora_id")
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")

    if (!clienteAdministradoraId || !administradoraId) {
      return NextResponse.json(
        { error: "cliente_administradora_id e administradora_id são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await getCurrentTenantId()

    const { data: faturas, error } = await supabaseAdmin
      .from("faturas")
      .select("id, numero_fatura, valor, vencimento, status, pagamento_data, asaas_boleto_url, boleto_url, gateway_id, asaas_charge_id")
      .eq("cliente_administradora_id", clienteAdministradoraId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .order("vencimento", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Erro ao buscar faturas do cliente:", error)
      return NextResponse.json({ error: "Erro ao buscar faturas" }, { status: 500 })
    }

    const lista = (faturas || []).map((f: any) => ({
      id: f.id,
      numero_fatura: f.numero_fatura,
      valor: f.valor,
      valor_total: Number(f.valor ?? 0),
      vencimento: f.vencimento,
      data_vencimento: f.vencimento,
      status: f.status,
      pagamento_data: f.pagamento_data,
      asaas_boleto_url: f.asaas_boleto_url,
      boleto_url: f.boleto_url,
      boleto_link: getBoletoLinkFromFatura(f),
    }))

    return NextResponse.json(lista)
  } catch (e: unknown) {
    console.error("Erro faturas-cliente:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar faturas" },
      { status: 500 }
    )
  }
}
