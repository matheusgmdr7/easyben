import { carregarBytesModeloVinculo } from "@/lib/ficha-admissao-apti-pdf"
import { ID_MODELO_FICHA_CARTAO_APTI, obterModeloVinculo } from "@/lib/vinculos-modelos"
import type { DadosPreenchimentoFichaCartao } from "@/lib/vinculos-ficha-cartao-dados"

type PosicaoTexto = {
  x: number
  y: number
  maxWidth: number
  size: number
}

const CAMPOS_PAGINA_1: Record<string, PosicaoTexto> = {
  nome: { x: 62, y: 606.4, maxWidth: 498, size: 8 },
  nomeMae: { x: 90, y: 586.2, maxWidth: 470, size: 8 },
  cpf: { x: 54, y: 565.4, maxWidth: 168, size: 8 },
  rg: { x: 250, y: 565.4, maxWidth: 140, size: 8 },
  dataNascimento: { x: 400, y: 556.2, maxWidth: 96, size: 7.5 },
  estadoCivil: { x: 505, y: 556.2, maxWidth: 56, size: 7 },
  profissao: { x: 108, y: 544.2, maxWidth: 114, size: 7.5 },
  endereco: { x: 270, y: 544.2, maxWidth: 226, size: 7.5 },
  numero: { x: 538, y: 544.2, maxWidth: 26, size: 8 },
  complemento: { x: 84, y: 523.6, maxWidth: 88, size: 7.5 },
  bairro: { x: 210, y: 523.6, maxWidth: 124, size: 7.5 },
  cidadeUf: { x: 390, y: 523.6, maxWidth: 58, size: 7 },
  cep: { x: 478, y: 523.6, maxWidth: 84, size: 8 },
  telefoneResidencial: { x: 48, y: 493.6, maxWidth: 124, size: 7.5 },
  telefoneCelular: { x: 198, y: 493.6, maxWidth: 108, size: 7.5 },
  telefoneComercial: { x: 332, y: 493.6, maxWidth: 116, size: 7.5 },
  whatsapp: { x: 458, y: 493.6, maxWidth: 102, size: 7.5 },
  email: { x: 64, y: 481.6, maxWidth: 214, size: 7.5 },
  localData: { x: 40, y: 128.6, maxWidth: 210, size: 9 },
}

const CAIXA_INCLUSAO = { x: 304.4, y: 763.1, w: 12.9, h: 12.9 }
const X_DEPENDENTE_SIM = { x: 318.2, y: 472.6, size: 8 }
const X_DEPENDENTE_NAO = { x: 349.3, y: 472.6, size: 8 }

/** Mesma fonte, tamanho e cor de "NACIONAL" impresso na carteirinha (Helvetica-Bold 7pt). */
const CARTAO_FONTE = 7
const CARTAO_COR = { r: 0.105882, g: 0.168627, b: 0.290196 }
const CARTAO_CAMPOS: PosicaoTexto[] = [
  { x: 187.65, y: 559.02, maxWidth: 221, size: CARTAO_FONTE },
  { x: 187.65, y: 532.09, maxWidth: 105, size: CARTAO_FONTE },
  { x: 303.31, y: 532.09, maxWidth: 105, size: CARTAO_FONTE },
  { x: 187.65, y: 505.17, maxWidth: 105, size: CARTAO_FONTE },
]
const CAMPOS_CARTAO_FORMULARIO = [
  "cartao_nome",
  "cartao_cpf",
  "cartao_matricula",
  "cartao_associado_desde",
]

function tamanhoQueCabe(
  texto: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  tamanhoBase: number,
  larguraMaxima: number,
  piso = 5.5
): number {
  let tamanho = tamanhoBase
  while (tamanho > piso && font.widthOfTextAtSize(texto, tamanho) > larguraMaxima) {
    tamanho -= 0.25
  }
  return tamanho
}

export async function gerarFichaCartaoAssociadoAptiPdf(
  dados: DadosPreenchimentoFichaCartao
): Promise<Uint8Array> {
  const modelo = obterModeloVinculo(ID_MODELO_FICHA_CARTAO_APTI)
  if (!modelo) throw new Error("Modelo de ficha, cartão e extrato não encontrado")

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
  const pdfDoc = await PDFDocument.load(await carregarBytesModeloVinculo(modelo))
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontCartao = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pagina = pdfDoc.getPages()[0]
  const preto = rgb(0, 0, 0)
  const azulCartao = rgb(CARTAO_COR.r, CARTAO_COR.g, CARTAO_COR.b)

  const textos: Record<string, string> = {
    nome: dados.nome,
    nomeMae: dados.nomeMae,
    cpf: dados.cpf,
    rg: dados.rg,
    dataNascimento: dados.dataNascimento,
    estadoCivil: dados.estadoCivil,
    profissao: dados.profissao,
    endereco: dados.endereco,
    numero: dados.numero,
    complemento: dados.complemento,
    bairro: dados.bairro,
    cidadeUf: dados.cidadeUf,
    cep: dados.cep,
    telefoneResidencial: dados.telefoneResidencial,
    telefoneCelular: dados.telefoneCelular,
    telefoneComercial: dados.telefoneComercial,
    whatsapp: dados.whatsapp,
    email: dados.email,
    localData: dados.localData,
  }

  for (const [chave, posicao] of Object.entries(CAMPOS_PAGINA_1)) {
    const valor = String(textos[chave] || "").trim()
    if (!valor || !pagina) continue
    pagina.drawText(valor, {
      x: posicao.x,
      y: posicao.y,
      size: tamanhoQueCabe(valor, font, posicao.size, posicao.maxWidth),
      font,
      color: preto,
      maxWidth: posicao.maxWidth,
    })
  }

  if (pagina) {
    const tamanhoX = 8
    const larguraX = font.widthOfTextAtSize("X", tamanhoX)
    pagina.drawText("X", {
      x: CAIXA_INCLUSAO.x + (CAIXA_INCLUSAO.w - larguraX) / 2,
      y: CAIXA_INCLUSAO.y + 3.1,
      size: tamanhoX,
      font,
      color: preto,
    })
    const marca = dados.possuiDependentes ? X_DEPENDENTE_SIM : X_DEPENDENTE_NAO
    pagina.drawText("X", { x: marca.x, y: marca.y, size: marca.size, font, color: preto })
  }

  const form = pdfDoc.getForm()
  const definir = (nome: string, valor: string, largura: number, tamanhoBase: number) => {
    const texto = String(valor || "").trim()
    if (!texto) return
    const campo = form.getTextField(nome)
    campo.acroField.setDefaultAppearance("/Helv 8 Tf 0 g")
    campo.setText(texto)
    campo.setFontSize(tamanhoQueCabe(texto, font, tamanhoBase, largura))
  }

  definir("ext_nome", dados.nome, 520, 9)
  definir("ext_cpf", dados.cpf, 128, 8)
  definir("ext_matricula", dados.matricula, 118, 7)
  definir("ext_associado_desde", dados.associadoDesde, 118, 8)
  definir("ext_periodo", dados.periodo, 118, 7.5)
  definir("ext_emissao", dados.dataEmissao, 118, 8)
  definir("ext_total", dados.total, 74, 8)
  definir("ext_local_data", dados.localData, 200, 8)

  dados.linhas.slice(0, 12).forEach((linha, indice) => {
    const n = String(indice + 1).padStart(2, "0")
    definir(`ext_mes_${n}`, linha.mes, 120, 8)
    definir(`ext_valor_${n}`, linha.valor, 78, 8)
    definir(`ext_data_pagamento_${n}`, linha.dataPagamento, 110, 8)
    definir(`ext_status_pagamento_${n}`, linha.status, 170, 8)
  })

  for (const nome of CAMPOS_CARTAO_FORMULARIO) {
    try {
      form.removeField(form.getTextField(nome))
    } catch {
      // O modelo novo não desenha mais as linhas; o texto entra direto na página.
    }
  }

  form.updateFieldAppearances(font)
  form.flatten()

  const paginaCartao = pdfDoc.getPages()[1]
  if (paginaCartao) {
    const valoresCartao = [dados.nome, dados.cpf, dados.matricula, dados.associadoDesde]
    CARTAO_CAMPOS.forEach((posicao, indice) => {
      const valor = String(valoresCartao[indice] || "").trim()
      if (!valor) return
      paginaCartao.drawText(valor, {
        x: posicao.x,
        y: posicao.y,
        size: tamanhoQueCabe(valor, fontCartao, posicao.size, posicao.maxWidth, 4.5),
        font: fontCartao,
        color: azulCartao,
      })
    })
  }

  return pdfDoc.save()
}
