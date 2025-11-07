import { supabase } from "@/lib/supabase"

// Configurações de bucket
const BUCKET_DOCUMENTOS = "documentos_propostas"
const BUCKET_AVATARES = "avatares"

// Interface para resultado de upload
interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
  bucket?: string
}

/**
 * Converte arquivo para JPEG se necessário
 */
export async function convertToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      console.log("🔄 Convertendo arquivo para JPEG:", file.name)

      // Se já é JPEG, retorna o arquivo original
      if (file.type === "image/jpeg" || file.type === "image/jpg") {
        console.log("✅ Arquivo já é JPEG, não precisa converter")
        resolve(file)
        return
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        try {
          // Configurar canvas com as dimensões da imagem
          canvas.width = img.width
          canvas.height = img.height

          // Preencher fundo branco (importante para transparência)
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Desenhar a imagem
          ctx.drawImage(img, 0, 0)

          // Converter para JPEG
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const jpegFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
                console.log("✅ Conversão para JPEG concluída")
                resolve(jpegFile)
              } else {
                console.error("❌ Erro ao converter para JPEG: blob é null")
                resolve(file) // Retorna arquivo original em caso de erro
              }
            },
            "image/jpeg",
            0.9,
          )
        } catch (error) {
          console.error("❌ Erro durante conversão:", error)
          resolve(file) // Retorna arquivo original em caso de erro
        }
      }

      img.onerror = () => {
        console.error("❌ Erro ao carregar imagem para conversão")
        resolve(file) // Retorna arquivo original em caso de erro
      }

      // Criar URL da imagem
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = () => {
        console.error("❌ Erro ao ler arquivo para conversão")
        resolve(file) // Retorna arquivo original em caso de erro
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("❌ Erro inesperado na conversão:", error)
      resolve(file) // Retorna arquivo original em caso de erro
    }
  })
}

/**
 * Faz upload de um arquivo para o Supabase Storage
 */
export async function uploadFile(
  file: File,
  folder = "documentos",
  bucket: string = BUCKET_DOCUMENTOS,
): Promise<UploadResult> {
  try {
    console.log("📤 Iniciando upload de arquivo:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder,
      bucket,
    })

    // Verificar se o bucket existe
    const bucketExists = await verificarBucket(bucket)
    if (!bucketExists) {
      console.error(`❌ Bucket ${bucket} não encontrado`)
      return {
        success: false,
        error: `Bucket ${bucket} não encontrado`,
      }
    }

    // Converter para JPEG se necessário
    let fileToUpload = file
    if (file.type.startsWith("image/") && file.type !== "image/jpeg") {
      console.log("🔄 Convertendo para JPEG antes do upload...")
      fileToUpload = await convertToJpeg(file)
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = fileToUpload.name.split(".").pop()
    const fileName = `${timestamp}_${randomId}.${fileExtension}`
    const filePath = `${folder}/${fileName}`

    console.log("📁 Caminho do arquivo:", filePath)

    // Fazer upload do arquivo
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, fileToUpload, {
      cacheControl: "3600",
      upsert: false,
      contentType: fileToUpload.type,
    })

    if (error) {
      console.error("❌ Erro no upload:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    console.log("✅ Upload realizado com sucesso:", data)

    // Obter URL pública do arquivo
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      bucket,
    }
  } catch (error) {
    console.error("❌ Erro inesperado no upload:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Verifica se um bucket existe
 */
export async function verificarBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`🔍 Verificando bucket: ${bucketName}`)

    const { data, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error("❌ Erro ao listar buckets:", error)
      return false
    }

    const bucketExists = data.some((bucket) => bucket.name === bucketName)
    console.log(`${bucketExists ? "✅" : "❌"} Bucket ${bucketName}: ${bucketExists ? "encontrado" : "não encontrado"}`)

    return bucketExists
  } catch (error) {
    console.error("❌ Erro inesperado ao verificar bucket:", error)
    return false
  }
}

/**
 * Lista arquivos de um bucket
 */
export async function listarArquivos(bucket: string, folder?: string): Promise<any[]> {
  try {
    console.log(`📂 Listando arquivos do bucket: ${bucket}${folder ? ` / ${folder}` : ""}`)

    const { data, error } = await supabase.storage.from(bucket).list(folder || "", {
      limit: 100,
      offset: 0,
    })

    if (error) {
      console.error("❌ Erro ao listar arquivos:", error)
      return []
    }

    console.log(`✅ Encontrados ${data.length} arquivos`)
    return data
  } catch (error) {
    console.error("❌ Erro inesperado ao listar arquivos:", error)
    return []
  }
}

/**
 * Remove um arquivo do storage
 */
export async function removerArquivo(bucket: string, path: string): Promise<boolean> {
  try {
    console.log(`🗑️ Removendo arquivo: ${bucket}/${path}`)

    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      console.error("❌ Erro ao remover arquivo:", error)
      return false
    }

    console.log("✅ Arquivo removido com sucesso")
    return true
  } catch (error) {
    console.error("❌ Erro inesperado ao remover arquivo:", error)
    return false
  }
}

/**
 * Obtém URL pública de um arquivo
 */
export function obterUrlPublica(bucket: string, path: string): string {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  } catch (error) {
    console.error("❌ Erro ao obter URL pública:", error)
    return ""
  }
}

export function obterUrlDocumento(
  propostaId: string,
  nomeArquivo: string,
  bucket: string = BUCKET_DOCUMENTOS,
): string {
  if (!propostaId || !nomeArquivo) {
    console.warn("⚠️ obterUrlDocumento chamado sem propostaId ou nomeArquivo")
    return ""
  }

  const path = `${propostaId}/${nomeArquivo}`
  return obterUrlPublica(bucket, path)
}

/**
 * Obtém URL do avatar do corretor
 */
export async function obterUrlAvatar(corretorId: string): Promise<string | null> {
  try {
    const path = `avatares/${corretorId}.jpg`

    // Verificar se o arquivo existe
    const { data, error } = await supabase.storage.from(BUCKET_AVATARES).list("avatares", {
      limit: 1,
      search: corretorId,
    })

    if (error || !data || data.length === 0) {
      return null
    }

    return obterUrlPublica(BUCKET_AVATARES, path)
  } catch (error) {
    console.error("❌ Erro ao obter URL do avatar:", error)
    return null
  }
}

/**
 * Diagnóstico completo do sistema de storage
 */
export async function diagnosticoStorage() {
  try {
    console.log("🔍 Iniciando diagnóstico do sistema de storage...")

    const resultado = {
      conexao: false,
      buckets: [],
      erros: [],
    }

    // Testar conexão
    try {
      const { data, error } = await supabase.storage.listBuckets()
      if (error) {
        resultado.erros.push(`Erro de conexão: ${error.message}`)
      } else {
        resultado.conexao = true
        resultado.buckets = data.map((bucket) => ({
          nome: bucket.name,
          id: bucket.id,
          criado: bucket.created_at,
          atualizado: bucket.updated_at,
        }))
      }
    } catch (error) {
      resultado.erros.push(`Erro inesperado: ${error.message}`)
    }

    console.log("📊 Resultado do diagnóstico:", resultado)
    return resultado
  } catch (error) {
    console.error("❌ Erro no diagnóstico:", error)
    return {
      conexao: false,
      buckets: [],
      erros: [error.message],
    }
  }
}

/**
 * Upload de documento com organização por cliente
 */
export async function fazerUploadDocumento(
  file: File,
  path: string,
  bucket = BUCKET_DOCUMENTOS,
): Promise<{ url?: string; error?: any }> {
  try {
    console.log(`📤 UPLOAD DOCUMENTO - Iniciando upload para: ${bucket}/${path}`)

    // Validar arquivo
    if (!(file instanceof File)) {
      throw new Error("O arquivo fornecido não é válido")
    }

    // Validação de tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Arquivo muito grande (máximo 10MB)")
    }

    // Converter para JPEG se necessário
    let arquivoFinal = file
    if (file.type.startsWith("image/") && file.type !== "image/jpeg") {
      console.log(`🔄 Convertendo ${file.type} para JPEG...`)
      try {
        arquivoFinal = await convertToJpeg(file)
        console.log(`✅ Conversão para JPEG concluída`)
      } catch (conversionError) {
        console.warn(`⚠️ Erro na conversão para JPEG, usando arquivo original:`, conversionError)
        arquivoFinal = file
      }
    }

    // Upload do arquivo
    const { data, error } = await supabase.storage.from(bucket).upload(path, arquivoFinal, {
      upsert: true,
      contentType: arquivoFinal.type,
      cacheControl: "3600",
    })

    if (error) {
      console.error(`❌ Erro no upload:`, error)
      return { error }
    }

    if (!data?.path) {
      throw new Error("Upload não retornou path válido")
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)

    if (!urlData?.publicUrl) {
      throw new Error("Não foi possível obter URL pública")
    }

    console.log(`✅ Upload concluído com sucesso: ${urlData.publicUrl}`)
    return { url: urlData.publicUrl }
  } catch (error) {
    console.error("❌ Erro geral no upload do documento:", error)
    return { error }
  }
}

// Exportar constantes úteis
export { BUCKET_DOCUMENTOS, BUCKET_AVATARES }

// Funções auxiliares para compatibilidade
export async function getPublicUrl(bucket: string, path: string) {
  return obterUrlPublica(bucket, path)
}

// compatibilidade com código antigo
export { obterUrlDocumento as getDocumentoUrl }

export async function fileExists(bucket: string, path: string) {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(path.split("/").slice(0, -1).join("/"), {
      limit: 1,
      search: path.split("/").pop(),
    })
    return !error && data && data.length > 0
  } catch (error) {
    return false
  }
}

export async function deleteFile(bucket: string, path: string) {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])
    return !error
  } catch (error) {
    return false
  }
}

export async function downloadFile(bucket: string, path: string) {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path)
    return error ? null : data
  } catch (error) {
    return null
  }
}

export async function copyFile(bucket: string, sourcePath: string, destPath: string) {
  try {
    const fileBlob = await downloadFile(bucket, sourcePath)
    if (!fileBlob) return false

    const result = await uploadFile(fileBlob as File, destPath.split("/").slice(0, -1).join("/"), bucket)
    return result.success
  } catch (error) {
    return false
  }
}

export async function verificarBucketsDisponiveis() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    if (error) return []
    return buckets || []
  } catch (error) {
    return []
  }
}

export async function verificarBucketExiste(bucketName: string) {
  const buckets = await verificarBucketsDisponiveis()
  return buckets.some((bucket) => bucket.name === bucketName)
}

export async function fazerUploadDocumentoOrganizado(
  file: File,
  nomeCliente: string,
  tipoDocumento: string,
  propostaId: string,
  dependenteIndex?: number,
): Promise<{ url?: string; error?: any }> {
  try {
    // Gerar nome da pasta baseado no cliente
    const nomePasta = nomeCliente
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50)

    // Estrutura de pastas organizada
    let caminho: string
    if (dependenteIndex !== undefined) {
      caminho = `${nomePasta}/${propostaId}/dependente_${dependenteIndex}/${tipoDocumento}_${Date.now()}.jpg`
    } else {
      caminho = `${nomePasta}/${propostaId}/titular/${tipoDocumento}_${Date.now()}.jpg`
    }

    console.log(`📁 Caminho organizado: ${caminho}`)
    return await fazerUploadDocumento(file, caminho, BUCKET_DOCUMENTOS)
  } catch (error) {
    console.error("❌ Erro no upload organizado:", error)
    return { error }
  }
}
