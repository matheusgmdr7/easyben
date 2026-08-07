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
import {
  VINCULOS_LOTE_MAX_PDFS,
  VINCULOS_LOTE_ZIP_DIRECT_MAX_BYTES,
} from "@/lib/vinculos-constants"
import type { EntradaPlanilhaLote } from "@/lib/vinculos-planilha"

export { VINCULOS_LOTE_MAX_PDFS }

const STORAGE_BUCKET = "arquivos"
const STORAGE_PREFIX = "vinculos-lote"

export type FalhaLoteVinculos = {
  vida_importada_id?: string
  linha?: number
  nome: string
  motivo: string
}

export type ResultadoLoteVinculos = {
  total_solicitado: number
  gerados: number
  gerados_ids: string[]
  falhas: FalhaLoteVinculos[]
  nome_arquivo: string
  entrega: "direct" | "storage"
  zip_buffer?: Buffer
  download_url?: string
  expires_in_seconds?: number
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

async function publicarZipNoStorage(params: {
  administradoraId: string
  zipBuffer: Buffer
  nomeArquivo: string
  gerados: number
}): Promise<{ download_url: string; expires_in_seconds: number }> {
  const storagePath = `${STORAGE_PREFIX}/${params.administradoraId}/${params.nomeArquivo}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, params.zipBuffer, {
      contentType: "application/zip",
      cacheControl: "3600",
      upsert: true,
    })

  if (uploadError) {
    throw new Error(
      `ZIP gerado (${params.gerados} PDFs, ${Math.round(params.zipBuffer.length / 1024)} KB), mas falha ao salvar no Storage: ${uploadError.message}`
    )
  }

  const expiresIn = 3600
  const signed = await supabaseAdmin.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, expiresIn)
  const downloadUrl = signed.data?.signedUrl

  if (!downloadUrl) {
    throw new Error("ZIP salvo, mas não foi possível gerar o link de download")
  }

  return { download_url: downloadUrl, expires_in_seconds: expiresIn }
}

function mesclarOpcionaisLote(
  lote: DadosOpcionaisFichaAdmissao,
  linha?: DadosOpcionaisFichaAdmissao
): DadosOpcionaisFichaAdmissao {
  const out: DadosOpcionaisFichaAdmissao = { ...lote }
  if (!linha) return out
  for (const [k, v] of Object.entries(linha)) {
    if (v != null && String(v).trim()) {
      ;(out as Record<string, string>)[k] = String(v).trim()
    }
  }
  return out
}

async function finalizarZipLote(params: {
  administradoraId: string
  zip: JSZip
  falhas: FalhaLoteVinculos[]
  geradosIds: string[]
  gerados: number
  totalSolicitado: number
}): Promise<ResultadoLoteVinculos> {
  if (params.gerados === 0) {
    throw new Error(
      params.falhas.length > 0
        ? `Nenhum PDF gerado. Primeiro erro: ${params.falhas[0].motivo}`
        : "Nenhum PDF gerado"
    )
  }

  const zipBuffer = await params.zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const nomeArquivo = `fichas-admissao-lote-${stamp}.zip`

  const base: ResultadoLoteVinculos = {
    total_solicitado: params.totalSolicitado,
    gerados: params.gerados,
    gerados_ids: params.geradosIds,
    falhas: params.falhas,
    nome_arquivo: nomeArquivo,
    entrega: "direct",
  }

  if (zipBuffer.length <= VINCULOS_LOTE_ZIP_DIRECT_MAX_BYTES) {
    return { ...base, entrega: "direct", zip_buffer: zipBuffer }
  }

  const publicado = await publicarZipNoStorage({
    administradoraId: params.administradoraId,
    zipBuffer,
    nomeArquivo,
    gerados: params.gerados,
  })

  return {
    ...base,
    entrega: "storage",
    download_url: publicado.download_url,
    expires_in_seconds: publicado.expires_in_seconds,
  }
}

export async function gerarLoteFichasVinculosZipFromPlanilha(params: {
  administradoraId: string
  entradas: EntradaPlanilhaLote[]
  opcionaisLote: DadosOpcionaisFichaAdmissao
  preenchimentoSintetico?: ConfigPreenchimentoSintetico
}): Promise<ResultadoLoteVinculos> {
  const entradas = params.entradas
  if (entradas.length === 0) throw new Error("Selecione ao menos um beneficiário da planilha")
  if (entradas.length > VINCULOS_LOTE_MAX_PDFS) {
    throw new Error(`Máximo de ${VINCULOS_LOTE_MAX_PDFS} PDFs por lote`)
  }

  const zip = new JSZip()
  const falhas: FalhaLoteVinculos[] = []
  const geradosIds: string[] = []
  let gerados = 0

  for (const entrada of entradas) {
    const nome = String(entrada.automaticos.nome || `Linha ${entrada.linha}`)
    const refId = `planilha:${entrada.linha}`
    try {
      let automaticos = { ...entrada.automaticos }
      let opcionais = mesclarOpcionaisLote(params.opcionaisLote, entrada.opcionais)

      if (params.preenchimentoSintetico?.ativo) {
        const seed = String(automaticos.cpf || refId).replace(/\D/g, "") || refId
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
        falhas.push({ linha: entrada.linha, nome, motivo: erroValidacao })
        continue
      }

      const pdfBytes = await gerarFichaAdmissaoAptiPdf(automaticos, opcionais)
      zip.file(nomeArquivoPdf(nome, refId), pdfBytes)
      geradosIds.push(refId)
      gerados += 1
    } catch (e: unknown) {
      falhas.push({
        linha: entrada.linha,
        nome,
        motivo: e instanceof Error ? e.message : "Erro ao gerar PDF",
      })
    }
  }

  return finalizarZipLote({
    administradoraId: params.administradoraId,
    zip,
    falhas,
    geradosIds,
    gerados,
    totalSolicitado: entradas.length,
  })
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
  const geradosIds: string[] = []
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
      geradosIds.push(vidaId)
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

  return finalizarZipLote({
    administradoraId: params.administradoraId,
    zip,
    falhas,
    geradosIds,
    gerados,
    totalSolicitado: ids.length,
  })
}
