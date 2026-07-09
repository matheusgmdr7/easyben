import JSZip from "jszip"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { validarCPF } from "@/utils/validacoes"
import { gerarFichaAdmissaoAptiPdf } from "@/lib/ficha-admissao-apti-pdf"
import {
  carregarVidaParaVinculos,
  mapearVidaParaFichaAdmissao,
  type DadosOpcionaisFichaAdmissao,
} from "@/lib/vinculos-beneficiario-dados"
import {
  aplicarPreenchimentoSintetico,
  type ConfigPreenchimentoSintetico,
} from "@/lib/vinculos-dados-sinteticos"
import { VINCULOS_LOTE_MAX_PDFS } from "@/lib/vinculos-constants"

export { VINCULOS_LOTE_MAX_PDFS }
const STORAGE_BUCKET = "arquivos"
const STORAGE_PREFIX = "vinculos-lote"

export type FalhaLoteVinculos = {
  vida_importada_id: string
  nome: string
  motivo: string
}

export type ResultadoLoteVinculos = {
  total_solicitado: number
  gerados: number
  falhas: FalhaLoteVinculos[]
  download_url: string
  nome_arquivo: string
  expires_in_seconds: number
}

function nomeArquivoPdf(nome: string, vidaId: string): string {
  const base = String(nome || "beneficiario")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
  return `ficha-admissao-${base || vidaId.slice(0, 8)}.pdf`
}

function validarAutomaticosParaPdf(automaticos: ReturnType<typeof mapearVidaParaFichaAdmissao>): string | null {
  if (!String(automaticos.nome || "").trim()) return "Nome não informado"
  const cpfDigitos = String(automaticos.cpf || "").replace(/\D/g, "")
  if (cpfDigitos.length !== 11) return "CPF ausente ou incompleto"
  if (!validarCPF(cpfDigitos)) return "CPF inválido"
  return null
}

export async function gerarLoteFichasVinculosZip(params: {
  administradoraId: string
  vidaImportadaIds: string[]
  opcionais: DadosOpcionaisFichaAdmissao
  preenchimentoSintetico?: ConfigPreenchimentoSintetico
}): Promise<ResultadoLoteVinculos> {
  const ids = Array.from(new Set(params.vidaImportadaIds.map((id) => String(id).trim()).filter(Boolean)))
  if (ids.length === 0) throw new Error("Selecione ao menos um beneficiário")
  if (ids.length > VINCULOS_LOTE_MAX_PDFS) {
    throw new Error(`Máximo de ${VINCULOS_LOTE_MAX_PDFS} PDFs por lote`)
  }

  const zip = new JSZip()
  const falhas: FalhaLoteVinculos[] = []
  let gerados = 0

  for (const vidaId of ids) {
    let nome = vidaId
    try {
      const vida = await carregarVidaParaVinculos(vidaId, params.administradoraId)
      nome = String(vida.nome || nome)
      let automaticos = mapearVidaParaFichaAdmissao(vida)
      let opcionais = { ...params.opcionais }

      if (params.preenchimentoSintetico?.ativo) {
        const seed = String(vida.cpf || vidaId).replace(/\D/g, "") || vidaId
        const aplicado = aplicarPreenchimentoSintetico({
          automaticos,
          opcionais,
          config: params.preenchimentoSintetico,
          seed,
        })
        automaticos = aplicado.automaticos
        opcionais = aplicado.opcionais
      }

      const erroValidacao = validarAutomaticosParaPdf(automaticos)
      if (erroValidacao) {
        falhas.push({ vida_importada_id: vidaId, nome, motivo: erroValidacao })
        continue
      }

      const pdfBytes = await gerarFichaAdmissaoAptiPdf(automaticos, opcionais)
      zip.file(nomeArquivoPdf(nome, vidaId), pdfBytes)
      gerados += 1
    } catch (e: unknown) {
      falhas.push({
        vida_importada_id: vidaId,
        nome,
        motivo: e instanceof Error ? e.message : "Erro ao gerar PDF",
      })
    }
  }

  if (gerados === 0) {
    throw new Error(
      falhas.length > 0
        ? `Nenhum PDF gerado. Primeiro erro: ${falhas[0].motivo}`
        : "Nenhum PDF gerado"
    )
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const storagePath = `${STORAGE_PREFIX}/${params.administradoraId}/${stamp}-${gerados}pdfs.zip`

  const { error: uploadError } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(storagePath, zipBuffer, {
    contentType: "application/zip",
    cacheControl: "3600",
    upsert: false,
  })

  if (uploadError) {
    throw new Error(
      `PDFs gerados (${gerados}), mas falha ao salvar ZIP: ${uploadError.message}. Verifique o bucket '${STORAGE_BUCKET}'.`
    )
  }

  const expiresIn = 3600
  const signed = await supabaseAdmin.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, expiresIn)
  const downloadUrl =
    signed.data?.signedUrl ||
    supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl

  return {
    total_solicitado: ids.length,
    gerados,
    falhas,
    download_url: downloadUrl,
    nome_arquivo: `fichas-admissao-lote-${stamp}.zip`,
    expires_in_seconds: expiresIn,
  }
}
