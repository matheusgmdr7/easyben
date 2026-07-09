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
 * Lotes pequenos: ZIP direto. Lotes grandes: JSON com link do Storage.
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

    if (resultado.entrega === "direct" && resultado.zip_buffer) {
      return new NextResponse(new Uint8Array(resultado.zip_buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${resultado.nome_arquivo}"`,
          "X-Vinculos-Gerados": String(resultado.gerados),
          "X-Vinculos-Total": String(resultado.total_solicitado),
          "X-Vinculos-Nome-Arquivo": resultado.nome_arquivo,
          "X-Vinculos-Gerados-Ids": JSON.stringify(resultado.gerados_ids),
          "X-Vinculos-Falhas": JSON.stringify(resultado.falhas),
        },
      })
    }

    return NextResponse.json({
      success: true,
      entrega: "storage",
      gerados: resultado.gerados,
      total_solicitado: resultado.total_solicitado,
      gerados_ids: resultado.gerados_ids,
      falhas: resultado.falhas,
      download_url: resultado.download_url,
      nome_arquivo: resultado.nome_arquivo,
      expires_in_seconds: resultado.expires_in_seconds,
    })
  } catch (e: unknown) {
    console.error("Erro ao gerar lote de PDFs vínculos:", e)
    const msg = e instanceof Error ? e.message : "Erro ao gerar lote"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
