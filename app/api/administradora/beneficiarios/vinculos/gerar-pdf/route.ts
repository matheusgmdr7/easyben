import { NextRequest, NextResponse } from "next/server"
import { gerarFichaAdmissaoAptiPdf } from "@/lib/ficha-admissao-apti-pdf"
import {
  carregarVidaParaVinculos,
  mapearVidaParaFichaAdmissao,
  type DadosOpcionaisFichaAdmissao,
} from "@/lib/vinculos-beneficiario-dados"
import {
  aplicarPreenchimentoSintetico,
  parseConfigPreenchimentoSintetico,
} from "@/lib/vinculos-dados-sinteticos"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const administradoraId = String(body.administradora_id || "").trim()
    const vidaImportadaId = String(body.vida_importada_id || "").trim()

    if (!administradoraId || !vidaImportadaId) {
      return NextResponse.json(
        { error: "administradora_id e vida_importada_id são obrigatórios" },
        { status: 400 }
      )
    }

    const vida = await carregarVidaParaVinculos(vidaImportadaId, administradoraId)
    let automaticos = mapearVidaParaFichaAdmissao(vida)

    let opcionais: DadosOpcionaisFichaAdmissao = {
      data_admissao: body.data_admissao,
      funcao: body.funcao,
      salario: body.salario,
      horario_trabalho: body.horario_trabalho,
      horas_almoco: body.horas_almoco,
      estado_civil: body.estado_civil,
      grau_instrucao: body.grau_instrucao,
      contrato_experiencia: body.contrato_experiencia,
    }

    const preenchimento = parseConfigPreenchimentoSintetico(body)
    if (preenchimento.ativo) {
      const seed = String(vida.cpf || vidaImportadaId).replace(/\D/g, "") || vidaImportadaId
      const aplicado = aplicarPreenchimentoSintetico({
        automaticos,
        opcionais,
        config: preenchimento,
        seed,
      })
      automaticos = aplicado.automaticos
      opcionais = aplicado.opcionais
    }

    const pdfBytes = await gerarFichaAdmissaoAptiPdf(automaticos, opcionais)
    const nomeArquivo = `ficha-admissao-${automaticos.nome.replace(/\s+/g, "-").slice(0, 40)}.pdf`

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      },
    })
  } catch (e: unknown) {
    console.error("Erro ao gerar PDF de vínculos:", e)
    const msg = e instanceof Error ? e.message : "Erro ao gerar PDF"
    const status = msg.includes("não encontrado") ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
