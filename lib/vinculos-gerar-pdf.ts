import { gerarFichaAdmissaoAptiPdf } from "@/lib/ficha-admissao-apti-pdf"
import { gerarFichaCartaoAssociadoAptiPdf } from "@/lib/ficha-cartao-associado-apti-pdf"
import type { DadosAutomaticosFichaAdmissao, DadosOpcionaisFichaAdmissao } from "@/lib/vinculos-beneficiario-dados"
import { obterModeloVinculo } from "@/lib/vinculos-modelos"
import { montarDadosFichaCartao, vidaPossuiDependentes } from "@/lib/vinculos-ficha-cartao-dados"
import type { PartesEnderecoVinculo } from "@/lib/vinculos-planilha"

type Registro = Record<string, unknown>

export async function gerarPdfVinculo(params: {
  modeloId?: string | null
  automaticos: DadosAutomaticosFichaAdmissao
  opcionais?: DadosOpcionaisFichaAdmissao
  vida?: Registro | null
  partesEndereco?: PartesEnderecoVinculo | null
}): Promise<Uint8Array> {
  const modelo = obterModeloVinculo(params.modeloId)
  if (!modelo) throw new Error("Modelo de documento inválido")

  if (modelo.tipo === "ficha-cartao") {
    const marcaDependentes = params.opcionais?.possui_dependentes
    const possuiDependentes =
      marcaDependentes === "sim"
        ? true
        : marcaDependentes === "nao"
          ? false
          : await vidaPossuiDependentes(params.vida)
    const dados = montarDadosFichaCartao({
      automaticos: params.automaticos,
      opcionais: params.opcionais,
      vida: params.vida,
      partesEndereco: params.partesEndereco,
      possuiDependentes,
    })
    return gerarFichaCartaoAssociadoAptiPdf(dados)
  }

  return gerarFichaAdmissaoAptiPdf(params.automaticos, params.opcionais, modelo.id)
}
