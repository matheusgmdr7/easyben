import { readFileSync } from "fs"
import { resolve } from "path"
import layout from "@/config/ficha-admissao-apti-layout.json"
import {
  formatarDataFichaAdmissao,
  formatarSalarioFicha,
  type DadosAutomaticosFichaAdmissao,
  type DadosOpcionaisFichaAdmissao,
} from "@/lib/vinculos-beneficiario-dados"

type CampoLayout = {
  page: number
  x: number
  y: number
  size?: number
  maxWidth?: number
  lineHeight?: number
  ajustarTamanho?: boolean
}

type LayoutConfig = {
  modeloArquivo: string
  fontSizePadrao: number
  campos: Record<string, CampoLayout>
  checkboxes: Record<string, CampoLayout>
}

const cfg = layout as LayoutConfig

function textoOpcional(valor?: string): string {
  return String(valor || "").trim()
}

function tamanhoFonteAjustado(
  texto: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  tamanhoBase: number,
  larguraMaxima: number
): number {
  let tamanho = tamanhoBase
  while (tamanho > 6 && font.widthOfTextAtSize(texto, tamanho) > larguraMaxima) {
    tamanho -= 0.25
  }
  return tamanho
}

export async function gerarFichaAdmissaoAptiPdf(
  automaticos: DadosAutomaticosFichaAdmissao,
  opcionais: DadosOpcionaisFichaAdmissao = {}
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")

  const modeloPath = resolve(process.cwd(), cfg.modeloArquivo)
  const modeloBytes = readFileSync(modeloPath)
  const pdfDoc = await PDFDocument.load(modeloBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  const valores: Record<string, string> = {
    nome: automaticos.nome,
    data_nascimento: automaticos.data_nascimento,
    local_nascimento: automaticos.local_nascimento,
    uf_nascimento: automaticos.uf_nascimento,
    carteira_trabalho_digital: automaticos.carteira_trabalho_digital,
    cpf: automaticos.cpf,
    rg: automaticos.rg,
    orgao_emissor: automaticos.orgao_emissor,
    endereco_completo: automaticos.endereco_completo,
    data_admissao: formatarDataFichaAdmissao(opcionais.data_admissao),
    funcao: textoOpcional(opcionais.funcao).toUpperCase(),
    salario: formatarSalarioFicha(opcionais.salario),
    horario_trabalho: textoOpcional(opcionais.horario_trabalho),
    horas_almoco: textoOpcional(opcionais.horas_almoco),
    estado_civil: textoOpcional(opcionais.estado_civil).toUpperCase(),
    grau_instrucao: textoOpcional(opcionais.grau_instrucao).toUpperCase(),
  }

  for (const [chave, pos] of Object.entries(cfg.campos)) {
    const valor = valores[chave]
    if (!valor) continue
    const page = pages[pos.page]
    if (!page) continue

    const tamanhoBase = pos.size ?? cfg.fontSizePadrao
    const tamanho =
      pos.ajustarTamanho && pos.maxWidth
        ? tamanhoFonteAjustado(valor, font, tamanhoBase, pos.maxWidth)
        : tamanhoBase

    page.drawText(valor, {
      x: pos.x,
      y: pos.y,
      size: tamanho,
      font,
      color: rgb(0, 0, 0),
      maxWidth: pos.maxWidth,
      lineHeight: pos.lineHeight,
    })
  }

  const marca = opcionais.contrato_experiencia
  if (marca === "sim" || marca === "nao") {
    const chaveCheck =
      marca === "sim" ? "contrato_experiencia_sim" : "contrato_experiencia_nao"
    const pos = cfg.checkboxes[chaveCheck]
    if (pos) {
      const page = pages[pos.page]
      page?.drawText("X", {
        x: pos.x,
        y: pos.y,
        size: pos.size ?? 10,
        font,
        color: rgb(0, 0, 0),
      })
    }
  }

  return pdfDoc.save()
}
