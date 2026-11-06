import layoutApti from "@/config/ficha-admissao-apti-layout.json"

export type CampoLayoutVinculo = {
  page: number
  x: number
  y: number
  size?: number
  maxWidth?: number
  lineHeight?: number
  ajustarTamanho?: boolean
}

export type LayoutModeloVinculo = {
  modeloArquivo: string
  fontSizePadrao: number
  campos: Record<string, CampoLayoutVinculo>
  checkboxes: Record<string, CampoLayoutVinculo>
}

export type ModeloVinculo = {
  id: string
  nome: string
  /** Nome usado no arquivo baixado, sem extensão. */
  prefixoArquivo: string
  arquivoPdf: string
  /** coordenadas: desenha o texto no PDF. ficha-cartao: ficha, cartão e extrato APTI. */
  tipo: "coordenadas" | "ficha-cartao"
  layout: LayoutModeloVinculo
}

export const ID_MODELO_FICHA_CARTAO_APTI = "ficha-cartao-associado-apti"

const layoutCartao: LayoutModeloVinculo = {
  modeloArquivo: "assets/modelos/ficha-cartao-associado-apti.pdf",
  fontSizePadrao: 8,
  campos: {},
  checkboxes: {},
}

/**
 * Cada modelo é um PDF em branco mais um JSON de coordenadas (origem no canto
 * inferior esquerdo, unidade em pontos). Para incluir outro documento:
 * 1. coloque o PDF em assets/modelos e uma cópia em public/modelos
 * 2. crie o JSON de layout em config/
 * 3. registre uma entrada neste array
 */
const MODELOS_VINCULO: ModeloVinculo[] = [
  {
    id: ID_MODELO_FICHA_CARTAO_APTI,
    nome: "Ficha, cartão e extrato APTI",
    prefixoArquivo: "ficha-cartao-apti",
    arquivoPdf: "assets/modelos/ficha-cartao-associado-apti.pdf",
    tipo: "ficha-cartao",
    layout: layoutCartao,
  },
  {
    id: "ficha-admissao-apti",
    nome: "Ficha de admissão APTI",
    prefixoArquivo: "ficha-admissao",
    arquivoPdf: "assets/modelos/ficha-admissao-apti.pdf",
    tipo: "coordenadas",
    layout: layoutApti as LayoutModeloVinculo,
  },
]

export const MODELO_VINCULO_PADRAO = MODELOS_VINCULO[0]?.id ?? "ficha-admissao-apti"

export const MODELOS_VINCULO_OPCOES = MODELOS_VINCULO.map(({ id, nome, prefixoArquivo }) => ({
  id,
  nome,
  prefixoArquivo,
}))

export function obterModeloVinculo(id?: string | null): ModeloVinculo | null {
  const limpo = String(id || "").trim()
  if (!limpo) return MODELOS_VINCULO[0] ?? null
  return MODELOS_VINCULO.find((modelo) => modelo.id === limpo) ?? null
}
