import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variáveis de ambiente do Supabase não configuradas")
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * API Route para buscar dados do usuário admin por email
 * Usado quando o localStorage está vazio mas há uma sessão válida
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      )
    }

    console.log("🔍 API Route - Buscando usuário admin por email:", email)

    // Buscar usuário na tabela usuarios_admin
    const { data: usuario, error } = await supabase
      .from("usuarios_admin")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("ativo", true)
      .single()

    if (error || !usuario) {
      console.error("❌ Usuário não encontrado:", error)
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    // Garantir que permissões seja sempre um array
    let permissoesArray: string[] = []
    if (Array.isArray(usuario.permissoes)) {
      permissoesArray = usuario.permissoes
    } else if (usuario.permissoes && typeof usuario.permissoes === "object") {
      permissoesArray = Object.keys(usuario.permissoes)
    }

    const usuarioRetorno = {
      ...usuario,
      senha_hash: undefined, // Não retornar o hash da senha
      perfil: usuario.perfil || "assistente",
      permissoes: permissoesArray,
    }

    console.log("✅ API Route - Usuário encontrado:", {
      id: usuarioRetorno.id,
      email: usuarioRetorno.email,
      perfil: usuarioRetorno.perfil,
      permissoes: usuarioRetorno.permissoes,
    })

    return NextResponse.json({
      success: true,
      usuario: usuarioRetorno,
    })
  } catch (error: any) {
    console.error("❌ Erro na API route de buscar usuário:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao buscar usuário" },
      { status: 500 }
    )
  }
}


