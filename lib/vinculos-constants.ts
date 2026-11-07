export const VINCULOS_LOTE_MAX_PDFS = 100

/** Nome do PDF gerado: o nome da pessoa, sem prefixo de modelo. */
export function nomeArquivoVinculoUsuario(nome: string, fallback = "beneficiario"): string {
  const base = String(nome || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
  return `${base || fallback}.pdf`
}

/** Evita dois PDFs com o mesmo nome dentro do mesmo ZIP. */
export function nomeArquivoVinculoUnico(
  usados: Set<string>,
  nome: string,
  fallback = "beneficiario"
): string {
  const original = nomeArquivoVinculoUsuario(nome, fallback)
  const chave = (valor: string) => valor.toLocaleLowerCase("pt-BR")
  if (!usados.has(chave(original))) {
    usados.add(chave(original))
    return original
  }
  const semExtensao = original.replace(/\.pdf$/i, "")
  let indice = 2
  let candidato = `${semExtensao} (${indice}).pdf`
  while (usados.has(chave(candidato))) {
    indice += 1
    candidato = `${semExtensao} (${indice}).pdf`
  }
  usados.add(chave(candidato))
  return candidato
}

export function contentDispositionAnexo(nomeArquivo: string): string {
  const ascii = nomeArquivo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]+/g, "")
    .replace(/["\\]/g, "")
  return `attachment; filename="${ascii || "documento.pdf"}"; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`
}

/** Abaixo deste tamanho o ZIP pode ir direto na resposta HTTP (limite Vercel ~4,5 MB). */
export const VINCULOS_LOTE_ZIP_DIRECT_MAX_BYTES = 3.5 * 1024 * 1024

/**
 * Cada ZIP leva no máximo esta quantidade de fichas.
 * O arquivo fica em torno de 25 MB, cabe no Storage e termina o download com mais folga.
 */
export const VINCULOS_LOTE_PDFS_POR_ZIP = 20

/**
 * Teto de segurança, abaixo do limite de 50 MB por arquivo no Storage.
 * O PDF já é compactado, então o ZIP só junta os arquivos.
 */
export const VINCULOS_LOTE_STORAGE_PARTE_MAX_BYTES = 32 * 1024 * 1024
