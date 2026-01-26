import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import bcrypt from "bcryptjs"

/**
 * API Route para sincronizar senha entre Supabase Auth e tabela administradoras
 * Usado após redefinição de senha via Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, senha } = body

    if (!email || !senha) {
      return NextResponse.json(
        { success: false, error: "Email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)

    // Atualizar senha_hash na tabela administradoras
    const { error: updateError } = await supabaseAdmin
      .from("administradoras")
      .update({
        senha_hash: senhaHash,
        updated_at: new Date().toISOString(),
      })
      .ilike("email_login", email.toLowerCase().trim())

    if (updateError) {
      console.error("❌ Erro ao sincronizar senha:", updateError)
      return NextResponse.json(
        { success: false, error: "Erro ao sincronizar senha" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Senha sincronizada com sucesso",
    })
  } catch (error: any) {
    console.error("❌ Erro na API route de sincronização de senha:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao sincronizar senha" },
      { status: 500 }
    )
  }
}

