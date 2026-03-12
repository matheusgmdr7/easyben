import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"

function normalizarDiaVencimento(valor: unknown): string | null {
  const dia = String(valor || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
  return dia === "01" || dia === "10" ? dia : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body?.administradora_id || "")
    const clienteAdministradoraId = String(body?.cliente_administradora_id || "")
    const diaVencimento = normalizarDiaVencimento(body?.dia_vencimento)

    if (!administradoraId || !clienteAdministradoraId || !diaVencimento) {
      return NextResponse.json(
        { error: "administradora_id, cliente_administradora_id e dia_vencimento(01/10) são obrigatórios" },
        { status: 400 }
      )
    }

    const { data: adm } = await supabaseAdmin
      .from("administradoras")
      .select("tenant_id")
      .eq("id", administradoraId)
      .maybeSingle()
    const tenantId = adm?.tenant_id || (await getCurrentTenantId())

    const atualizarDadosAdicionaisVida = async (vidaId: string) => {
      const { data: vida } = await supabaseAdmin
        .from("vidas_importadas")
        .select("dados_adicionais")
        .eq("id", vidaId)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .maybeSingle()
      if (!vida) return

      const atual = vida?.dados_adicionais && typeof vida.dados_adicionais === "object"
        ? (vida.dados_adicionais as Record<string, unknown>)
        : {}
      const novo = { ...atual, dia_vencimento: diaVencimento }

      await supabaseAdmin
        .from("vidas_importadas")
        .update({ dados_adicionais: novo })
        .eq("id", vidaId)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
    }

    if (clienteAdministradoraId.startsWith("vida:")) {
      const vidaId = clienteAdministradoraId.replace(/^vida:/, "")
      const { data: vida } = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, cliente_administradora_id")
        .eq("id", vidaId)
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)
        .maybeSingle()

      if (!vida) {
        return NextResponse.json({ error: "Vida importada não encontrada" }, { status: 404 })
      }

      await atualizarDadosAdicionaisVida(vidaId)

      if ((vida as any)?.cliente_administradora_id) {
        await supabaseAdmin
          .from("clientes_administradoras")
          .update({ dia_vencimento: Number(diaVencimento) })
          .eq("id", (vida as any).cliente_administradora_id)
          .eq("administradora_id", administradoraId)
          .eq("tenant_id", tenantId)
      }

      return NextResponse.json({ success: true, dia_vencimento: diaVencimento })
    }

    const { data: cliente } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("id")
      .eq("id", clienteAdministradoraId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    await supabaseAdmin
      .from("clientes_administradoras")
      .update({ dia_vencimento: Number(diaVencimento) })
      .eq("id", clienteAdministradoraId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    const { data: vidas } = await supabaseAdmin
      .from("vidas_importadas")
      .select("id")
      .eq("cliente_administradora_id", clienteAdministradoraId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    for (const vida of vidas || []) {
      await atualizarDadosAdicionaisVida(String((vida as any).id))
    }

    return NextResponse.json({ success: true, dia_vencimento: diaVencimento })
  } catch (e: unknown) {
    console.error("Erro vincular-vencimento:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao vincular vencimento" },
      { status: 500 }
    )
  }
}

