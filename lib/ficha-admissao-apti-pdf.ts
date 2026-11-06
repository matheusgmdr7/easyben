import { existsSync, readFileSync, statSync } from "fs"
import { resolve } from "path"
import {
  formatarDataFichaAdmissao,
  formatarSalarioFicha,
  type DadosAutomaticosFichaAdmissao,
  type DadosOpcionaisFichaAdmissao,
} from "@/lib/vinculos-beneficiario-dados"
import { obterModeloVinculo, type ModeloVinculo } from "@/lib/vinculos-modelos"

const modeloPdfCache = new Map<string, { assinatura: string; bytes: Uint8Array }>()

function baseUrlPublica(): string | null {
  const candidatos = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ]
  for (const base of candidatos) {
    const limpo = String(base || "").trim().replace(/\/$/, "")
    if (limpo) return limpo
  }
  return null
}

export async function carregarBytesModeloVinculo(modelo: ModeloVinculo): Promise<Uint8Array> {
  const relativo = modelo.layout.modeloArquivo.replace(/^\.?\//, "")
  const nomeArquivo = relativo.split("/").pop() || ""
  const candidatos = [
    resolve(process.cwd(), relativo),
    resolve(process.cwd(), modelo.arquivoPdf),
    nomeArquivo ? resolve(process.cwd(), "public/modelos", nomeArquivo) : "",
  ].filter(Boolean)

  for (const caminho of candidatos) {
    if (!existsSync(caminho)) continue
    const info = statSync(caminho)
    const assinatura = `${caminho}:${info.mtimeMs}:${info.size}`
    const emCache = modeloPdfCache.get(modelo.id)
    if (emCache?.assinatura === assinatura) return emCache.bytes
    const bytes = new Uint8Array(readFileSync(caminho))
    modeloPdfCache.set(modelo.id, { assinatura, bytes })
    return bytes
  }

  const base = baseUrlPublica()
  if (base && nomeArquivo) {
    const res = await fetch(`${base}/modelos/${nomeArquivo}`, { cache: "force-cache" })
    if (res.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer())
      modeloPdfCache.set(modelo.id, { assinatura: `url:${nomeArquivo}:${bytes.byteLength}`, bytes })
      return bytes
    }
  }

  throw new Error(
    `Modelo PDF "${modelo.nome}" não encontrado. Verifique ${modelo.layout.modeloArquivo}.`
  )
}

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
  opcionais: DadosOpcionaisFichaAdmissao = {},
  modeloId?: string | null
): Promise<Uint8Array> {
  const modelo = obterModeloVinculo(modeloId)
  if (!modelo) throw new Error("Modelo de documento inválido")
  if (modelo.tipo === "ficha-cartao") {
    throw new Error("O modelo de ficha, cartão e extrato usa outro preenchimento")
  }

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
  const cfg = modelo.layout

  const modeloBytes = await carregarBytesModeloVinculo(modelo)
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
