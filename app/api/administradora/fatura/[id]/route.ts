import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import AsaasServiceInstance from "@/services/asaas-service"

/**
 * DELETE /api/administradora/fatura/:id?administradora_id=xxx
 * Exclui fatura/boleto e tenta cancelar a cobrança no Asaas quando possível.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const faturaId = params.id
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")

    if (!faturaId || !administradoraId) {
      return NextResponse.json(
        { error: "id e administradora_id são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await getCurrentTenantId()

    const { data: fatura, error: erroFatura } = await supabaseAdmin
      .from("faturas")
      .select("id, asaas_charge_id, gateway_id, administradora_id, tenant_id")
      .eq("id", faturaId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)
      .maybeSingle()

    if (erroFatura) {
      return NextResponse.json(
        { error: "Erro ao localizar fatura para exclusão" },
        { status: 500 }
      )
    }

    if (!fatura) {
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
    }

    const chargeId = String(fatura.asaas_charge_id || fatura.gateway_id || "").trim()
    let warningGateway: string | null = null

    if (chargeId) {
      const { data: financeiras } = await supabaseAdmin
        .from("administradora_financeiras")
        .select("api_key, ambiente, instituicao_financeira, status_integracao, ativo")
        .eq("administradora_id", administradoraId)
        .eq("tenant_id", tenantId)

      const financeirasAsaas = (financeiras || []).filter(
        (f: any) =>
          String(f.instituicao_financeira || "").toLowerCase() === "asaas" &&
          !!f.api_key
      )

      let canceladoGateway = false
      const chargeCandidates = Array.from(
        new Set(
          [
            chargeId,
            chargeId.replace(/^pay_/, ""),
            chargeId.startsWith("pay_") ? chargeId : `pay_${chargeId}`,
          ].filter(Boolean)
        )
      )
      for (const financeira of financeirasAsaas) {
        for (const candidate of chargeCandidates) {
          try {
            AsaasServiceInstance.setApiKey(
              String(financeira.api_key),
              String(financeira.ambiente || "producao")
            )
            await AsaasServiceInstance.deleteCharge(candidate)
            canceladoGateway = true
            break
          } catch {
            // Continua tentando com outras combinações.
          }
        }
        if (canceladoGateway) break
      }

      if (financeirasAsaas.length === 0) {
        warningGateway =
          "Fatura removida no sistema, mas não foi possível cancelar no gateway porque não há financeira Asaas ativa com API key. Exclua manualmente no gateway."
      } else if (!canceladoGateway) {
        warningGateway =
          "Fatura removida no sistema, mas não foi possível cancelar no gateway. Exclua manualmente no gateway."
      }
    }

    const { error: erroDelete } = await supabaseAdmin
      .from("faturas")
      .delete()
      .eq("id", faturaId)
      .eq("administradora_id", administradoraId)
      .eq("tenant_id", tenantId)

    if (erroDelete) {
      return NextResponse.json(
        { error: "Erro ao excluir fatura" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Fatura excluída com sucesso.",
      warning: warningGateway,
      requires_manual_gateway_cleanup: !!warningGateway,
      gateway_charge_id: chargeId || null,
    })
  } catch (error: unknown) {
    console.error("Erro ao excluir fatura:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao excluir fatura" },
      { status: 500 }
    )
  }
}
