import { NextRequest, NextResponse } from "next/server"
import {
  gerarLoteFichasVinculosZip,
  VINCULOS_LOTE_MAX_PDFS,
} from "@/lib/vinculos-gerar-lote"
import type { DadosOpcionaisFichaAdmissao } from "@/lib/vinculos-beneficiario-dados"
import { parseConfigPreenchimentoSintetico } from "@/lib/vinculos-dados-sinteticos"

export const maxDuration = 300

/**
 * POST /api/administradora/beneficiarios/vinculos/gerar-pdf-lote
 * Body: { administradora_id, vida_importada_ids[], ...opcionais globais }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body.administradora_id || "").trim()
    const ids = Array.isArray(body.vida_importada_ids) ? body.vida_importada_ids : []

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }
    if (!ids.length) {
      return NextResponse.json({ error: "vida_importada_ids não pode ser vazio" }, { status: 400 })
    }
    if (ids.length > VINCULOS_LOTE_MAX_PDFS) {
      return NextResponse.json(
        { error: `Máximo de ${VINCULOS_LOTE_MAX_PDFS} beneficiários por lote` },
        { status: 400 }
      )
    }

    const opcionais: DadosOpcionaisFichaAdmissao = {
      data_admissao: body.data_admissao,
      funcao: body.funcao,
      salario: body.salario,
      horario_trabalho: body.horario_trabalho,
      horas_almoco: body.horas_almoco,
      estado_civil: body.estado_civil,
      grau_instrucao: body.grau_instrucao,
      contrato_experiencia: body.contrato_experiencia,
    }

    const resultado = await gerarLoteFichasVinculosZip({
      administradoraId,
      vidaImportadaIds: ids,
      opcionais,
      preenchimentoSintetico: parseConfigPreenchimentoSintetico(body),
    })

    return NextResponse.json({ success: true, ...resultado })
  } catch (e: unknown) {
    console.error("Erro ao gerar lote de PDFs vínculos:", e)
    const msg = e instanceof Error ? e.message : "Erro ao gerar lote"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
