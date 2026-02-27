import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const BUCKET = "arquivos"
const PREFIX = "logos-operadoras"

/**
 * POST /api/administradora/upload-logo
 * Recebe multipart/form-data com campo "logo" (arquivo de imagem).
 * Faz upload para Supabase Storage (arquivos/logos-operadoras/{uuid}.{ext})
 * e retorna a URL pública. A URL deve ser salva no banco ao cadastrar o contrato.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("logo") as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado. Use o campo 'logo'." }, { status: 400 })
    }

    const type = (file.type || "").toLowerCase()
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "Envie apenas imagens (PNG, JPG, etc.)." }, { status: 400 })
    }

    const ext = file.name.split(".").pop() || "png"
    const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : "png"
    const path = `${PREFIX}/${crypto.randomUUID()}.${safeExt}`

    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/png",
    })

    if (error) {
      console.error("Erro ao fazer upload do logo:", error)
      return NextResponse.json(
        { error: "Erro ao salvar a imagem. Verifique se o bucket 'arquivos' existe e as políticas de storage." },
        { status: 500 }
      )
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (e: unknown) {
    console.error("Erro upload-logo:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao fazer upload do logo" },
      { status: 500 }
    )
  }
}
