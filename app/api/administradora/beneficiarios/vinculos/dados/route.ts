import { NextRequest, NextResponse } from "next/server"
import {
  carregarVidaParaVinculos,
  mapearVidaParaFichaAdmissao,
  sugestoesOpcionaisDaVida,
} from "@/lib/vinculos-beneficiario-dados"
import { listarCamposFaltandoFicha } from "@/lib/vinculos-dados-sinteticos"

export async function GET(request: NextRequest) {
  try {
    const administradoraId = request.nextUrl.searchParams.get("administradora_id")
    const vidaImportadaId = request.nextUrl.searchParams.get("vida_importada_id")

    if (!administradoraId || !vidaImportadaId) {
      return NextResponse.json(
        { error: "administradora_id e vida_importada_id são obrigatórios" },
        { status: 400 }
      )
    }

    const vida = await carregarVidaParaVinculos(vidaImportadaId, administradoraId)
    const automaticos = mapearVidaParaFichaAdmissao(vida)
    const sugestoes = sugestoesOpcionaisDaVida(vida)
    const campos_faltando = listarCamposFaltandoFicha(automaticos, sugestoes)

    return NextResponse.json({ automaticos, sugestoes, campos_faltando })
  } catch (e: unknown) {
    console.error("Erro ao carregar dados para vínculos:", e)
    const msg = e instanceof Error ? e.message : "Erro ao carregar dados"
    const status = msg.includes("não encontrado") ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
