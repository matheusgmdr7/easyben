import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, password, nome, perfil, status } = body

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      )
    }

    const authUpdateData: any = {}

    if (email) authUpdateData.email = email
    if (password) authUpdateData.password = password
    if (nome || perfil) {
      authUpdateData.user_metadata = {}
      if (nome) authUpdateData.user_metadata.nome = nome
      if (perfil) authUpdateData.user_metadata.perfil = perfil
    }

    // Se for banir/desbanir
    if (status === "bloqueado") {
      authUpdateData.ban_duration = "876000h" // 100 anos
    } else if (status === "ativo") {
      authUpdateData.ban_duration = "none"
    }

    // Atualizar usuário no Supabase Auth usando service role
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      authUpdateData
    )

    if (authError) {
      console.error("❌ Erro ao atualizar usuário no Auth:", authError)
      return NextResponse.json(
        { error: `Erro ao atualizar usuário no Supabase Auth: ${authError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error("❌ Erro inesperado ao atualizar usuário:", error)
    return NextResponse.json(
      { error: error.message || "Erro inesperado ao atualizar usuário" },
      { status: 500 }
    )
  }
}

