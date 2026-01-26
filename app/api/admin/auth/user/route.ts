import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { PERFIS_PERMISSOES } from "@/services/usuarios-admin-service"

/**
 * API Route para buscar dados do usuário admin por email
 * Usado quando o localStorage está vazio mas há uma sessão válida
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🚀 API Route /api/admin/auth/user - POST recebido")
    console.log("📍 URL completa:", request.url)
    console.log("📍 Method:", request.method)
    console.log("📍 Headers:", Object.fromEntries(request.headers.entries()))
    
    let body: any = {}
    try {
      const bodyText = await request.text()
      console.log("📦 Body recebido (text):", bodyText)
      
      if (bodyText) {
        body = JSON.parse(bodyText)
        console.log("📦 Body parseado:", body)
      } else {
        console.warn("⚠️ Body vazio ou não fornecido")
      }
    } catch (parseError: any) {
      console.error("❌ Erro ao fazer parse do body:", parseError)
      console.error("❌ Stack trace:", parseError.stack)
      return NextResponse.json(
        { error: "Body inválido ou vazio", details: parseError.message },
        { status: 400 }
      )
    }
    
    const { email, password } = body

    if (!email) {
      console.error("❌ API Route - Email não fornecido no body")
      console.error("❌ Body completo recebido:", body)
      return NextResponse.json(
        { error: "Email é obrigatório", receivedBody: body },
        { status: 400 }
      )
    }

    console.log("🔍 API Route - Buscando usuário admin por email:", email)
    console.log("🔍 Email normalizado (lowercase):", email.toLowerCase())

    // Verificar se supabaseAdmin está disponível
    if (!supabaseAdmin) {
      console.error("❌ supabaseAdmin não está disponível!")
      return NextResponse.json(
        { error: "Erro de configuração do servidor" },
        { status: 500 }
      )
    }

    console.log("🔍 Executando query no Supabase...")
    console.log("📋 TABELA CONSULTADA: usuarios_admin (CORRETO)")
    console.log("📋 Email buscado:", email.toLowerCase())
    
    // Buscar usuário na tabela usuarios_admin usando supabaseAdmin (bypassa RLS)
    const { data: usuario, error } = await supabaseAdmin
      .from("usuarios_admin")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("ativo", true)
      .single()

    console.log("📊 Resultado da query:", {
      usuarioEncontrado: !!usuario,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      } : null,
      usuarioId: usuario?.id,
      usuarioEmail: usuario?.email,
      usuarioAtivo: usuario?.ativo,
    })

    if (error) {
      console.error("❌ Erro ao buscar usuário no Supabase:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { 
          error: "Erro ao buscar usuário", 
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    if (!usuario) {
      console.error("❌ Usuário não encontrado para email:", email)
      console.error("❌ Verificando se há usuários com email similar...")
      
      // Debug: verificar se há usuários com email similar
      const { data: usuariosSimilares } = await supabaseAdmin
        .from("usuarios_admin")
        .select("id, email, ativo")
        .ilike("email", `%${email.split("@")[0]}%`)
        .limit(5)
      
      console.log("🔍 Usuários com email similar encontrados:", usuariosSimilares)
      
      return NextResponse.json(
        { 
          error: "Usuário não encontrado",
          emailBuscado: email,
          usuariosSimilares: usuariosSimilares || [],
        },
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
    
    // Se não há permissões, usar permissões padrão do perfil
    if (permissoesArray.length === 0 && usuario.perfil) {
      permissoesArray = PERFIS_PERMISSOES[usuario.perfil as keyof typeof PERFIS_PERMISSOES] || []
      console.log("⚠️ API Route - Permissões vazias, usando permissões padrão do perfil:", {
        perfil: usuario.perfil,
        permissoesPadrao: permissoesArray,
      })
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
    console.error("❌ Stack trace:", error.stack)
    return NextResponse.json(
      { error: error.message || "Erro ao buscar usuário", details: error.stack },
      { status: 500 }
    )
  }
}

// Método GET para debug/teste
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    
    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório como query parameter" },
        { status: 400 }
      )
    }

    console.log("🔍 API Route GET - Buscando usuário admin por email:", email)

    const { data: usuario, error } = await supabaseAdmin
      .from("usuarios_admin")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("ativo", true)
      .single()

    if (error || !usuario) {
      return NextResponse.json(
        { error: "Usuário não encontrado", details: error?.message },
        { status: 404 }
      )
    }

    const usuarioRetorno = {
      ...usuario,
      senha_hash: undefined,
      perfil: usuario.perfil || "assistente",
      permissoes: Array.isArray(usuario.permissoes) 
        ? usuario.permissoes 
        : (usuario.permissoes && typeof usuario.permissoes === "object" 
          ? Object.keys(usuario.permissoes) 
          : []),
    }

    return NextResponse.json({
      success: true,
      usuario: usuarioRetorno,
    })
  } catch (error: any) {
    console.error("❌ Erro na API route GET:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao buscar usuário" },
      { status: 500 }
    )
  }
}


