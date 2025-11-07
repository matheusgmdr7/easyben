import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nome, perfil } = body

    if (!email || !password || !nome) {
      return NextResponse.json(
        { error: "Email, senha e nome são obrigatórios" },
        { status: 400 }
      )
    }

    // Criar usuário no Supabase Auth usando service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "admin",
        nome,
        perfil: perfil || "atendimento",
      },
    })

    if (authError) {
      console.error("❌ Erro ao criar usuário no Auth:", authError)
      return NextResponse.json(
        { error: `Erro ao criar usuário no Supabase Auth: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Falha ao criar usuário no Supabase Auth" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error: any) {
    console.error("❌ Erro inesperado ao criar usuário:", error)
    return NextResponse.json(
      { error: error.message || "Erro inesperado ao criar usuário" },
      { status: 500 }
    )
  }
}

