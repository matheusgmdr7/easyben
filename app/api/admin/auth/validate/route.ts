import { NextRequest, NextResponse } from "next/server"
import { validarSenhaUsuarioAdmin } from "@/services/usuarios-admin-service"

/**
 * API Route para validar senha do usuário admin
 * Roda no servidor para poder usar bcrypt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    console.log("🔐 API Route - Validando senha do usuário admin:", email)

    // Validar senha (isso roda no servidor onde bcrypt funciona)
    const usuario = await validarSenhaUsuarioAdmin(email, password)

    if (!usuario) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      )
    }

    console.log("✅ API Route - Usuário validado com sucesso:", usuario.email)

    return NextResponse.json({
      success: true,
      usuario,
    })
  } catch (error: any) {
    console.error("❌ Erro na API route de validação:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao validar credenciais" },
      { status: 500 }
    )
  }
}


