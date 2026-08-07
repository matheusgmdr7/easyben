import { NextRequest, NextResponse } from "next/server"
import {
  gerarLoteFichasVinculosZip,
  gerarLoteFichasVinculosZipFromPlanilha,
  VINCULOS_LOTE_MAX_PDFS,
} from "@/lib/vinculos-gerar-lote"
import type { DadosOpcionaisFichaAdmissao } from "@/lib/vinculos-beneficiario-dados"
import { parseConfigPreenchimentoSintetico } from "@/lib/vinculos-dados-sinteticos"
import type { EntradaPlanilhaLote } from "@/lib/vinculos-planilha"

export const maxDuration = 300

function parseOpcionais(body: Record<string, unknown>): DadosOpcionaisFichaAdmissao {
  return {
    data_admissao: body.data_admissao as string | undefined,
    funcao: body.funcao as string | undefined,
    salario: body.salario as string | undefined,
    horario_trabalho: body.horario_trabalho as string | undefined,
    horas_almoco: body.horas_almoco as string | undefined,
    estado_civil: body.estado_civil as string | undefined,
    grau_instrucao: body.grau_instrucao as string | undefined,
    contrato_experiencia: body.contrato_experiencia as DadosOpcionaisFichaAdmissao["contrato_experiencia"],
  }
}

function respostaZip(resultado: Awaited<ReturnType<typeof gerarLoteFichasVinculosZip>>) {
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
}

/**
 * POST /api/administradora/beneficiarios/vinculos/gerar-pdf-lote
 * Modo grupo: { vida_importada_ids }
 * Modo planilha: { linhas_planilha: [{ linha, automaticos, opcionais? }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const administradoraId = String(body.administradora_id || "").trim()
    const ids = Array.isArray(body.vida_importada_ids) ? body.vida_importada_ids : []
    const linhasPlanilha = Array.isArray(body.linhas_planilha)
      ? (body.linhas_planilha as EntradaPlanilhaLote[])
      : []

    if (!administradoraId) {
      return NextResponse.json({ error: "administradora_id é obrigatório" }, { status: 400 })
    }

    const opcionais = parseOpcionais(body)
    const preenchimentoSintetico = parseConfigPreenchimentoSintetico(body)

    if (linhasPlanilha.length > 0) {
      if (linhasPlanilha.length > VINCULOS_LOTE_MAX_PDFS) {
        return NextResponse.json(
          { error: `Máximo de ${VINCULOS_LOTE_MAX_PDFS} beneficiários por lote` },
          { status: 400 }
        )
      }

      const resultado = await gerarLoteFichasVinculosZipFromPlanilha({
        administradoraId,
        entradas: linhasPlanilha,
        opcionaisLote: opcionais,
        preenchimentoSintetico,
      })

      return respostaZip(resultado)
    }

    if (!ids.length) {
      return NextResponse.json(
        { error: "Informe vida_importada_ids ou linhas_planilha" },
        { status: 400 }
      )
    }
    if (ids.length > VINCULOS_LOTE_MAX_PDFS) {
      return NextResponse.json(
        { error: `Máximo de ${VINCULOS_LOTE_MAX_PDFS} beneficiários por lote` },
        { status: 400 }
      )
    }

    const resultado = await gerarLoteFichasVinculosZip({
      administradoraId,
      vidaImportadaIds: ids,
      opcionais,
      preenchimentoSintetico,
    })

    return respostaZip(resultado)
  } catch (e: unknown) {
    console.error("Erro ao gerar lote de PDFs vínculos:", e)
    const msg = e instanceof Error ? e.message : "Erro ao gerar lote"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
