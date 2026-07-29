import { NextRequest, NextResponse } from "next/server"
import {
  dispararPrimeiroBoletoGerado,
  dispararSaudacaoBoasVindas,
} from "@/lib/whatsapp-billing/dispatch"
import { isWhatsAppBillingEventType } from "@/lib/whatsapp-billing"

export const maxDuration = 30

/**
 * POST /api/administradora/whatsapp/disparar
 * Dispara eventos automáticos (ex.: saudacao_boas_vindas) após ações na UI.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const eventType = String(body.event_type || "").trim()
    const administradoraId = String(body.administradora_id || "").trim()
    const clienteAdministradoraId = String(body.cliente_administradora_id || "").trim()

    if (!isWhatsAppBillingEventType(eventType)) {
      return NextResponse.json({ error: "event_type inválido" }, { status: 400 })
    }
    if (!administradoraId || !clienteAdministradoraId) {
      return NextResponse.json(
        { error: "administradora_id e cliente_administradora_id são obrigatórios" },
        { status: 400 }
      )
    }

    if (eventType === "saudacao_boas_vindas") {
      const result = await dispararSaudacaoBoasVindas({
        administradoraId,
        clienteAdministradoraId,
      })
      return NextResponse.json(result)
    }

    if (eventType === "primeiro_boleto_gerado") {
      const result = await dispararPrimeiroBoletoGerado({
        faturaId: String(body.fatura_id || ""),
        clienteAdministradoraId,
        administradoraId,
        clienteNome: String(body.cliente_nome || "Cliente"),
        telefone: String(body.telefone || ""),
        valor: Number(body.valor) || 0,
        vencimento: String(body.vencimento || ""),
        linkBoleto: body.link_boleto ? String(body.link_boleto) : null,
        numeroFatura: body.numero_fatura ? String(body.numero_fatura) : null,
      })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "event_type não suportado nesta rota" }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao disparar WhatsApp" },
      { status: 500 }
    )
  }
}
