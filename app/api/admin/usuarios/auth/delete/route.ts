import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      )
    }

    // Deletar usuário no Supabase Auth usando service role
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("❌ Erro ao deletar usuário no Auth:", authError)
      return NextResponse.json(
        { error: `Erro ao deletar usuário no Supabase Auth: ${authError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error("❌ Erro inesperado ao deletar usuário:", error)
    return NextResponse.json(
      { error: error.message || "Erro inesperado ao deletar usuário" },
      { status: 500 }
    )
  }
}

