import { createClient } from "@supabase/supabase-js"
export { saveProposta, saveDocumento, saveDependente, saveQuestionario } from "@/lib/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Função de upload que JÁ FUNCIONA - não alterar
 */
export async function uploadFile(file: File, bucket: string, path: string): Promise<string | null> {
  try {
    console.log(`📤 UPLOAD SIMPLES - Arquivo: ${file.name}`)
    console.log(`📁 Bucket: ${bucket}`)
    console.log(`📍 Path: ${path}`)

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("❌ Erro no upload:", error)
      throw error
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

    console.log(`✅ Upload concluído: ${urlData.publicUrl}`)
    return urlData.publicUrl
  } catch (error) {
    console.error("❌ Erro no upload:", error)
    return null
  }
}
