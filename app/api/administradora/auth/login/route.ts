import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import bcrypt from "bcryptjs"

/**
 * Handler para OPTIONS (CORS preflight)
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

/**
 * API Route para autenticação de administradoras
 * Usa supabaseAdmin para bypassar RLS durante o login
 */
export async function POST(request: NextRequest) {
  console.log("🚀 API Route /api/administradora/auth/login - POST recebido")
  
  try {
    let body: any = {}
    try {
      body = await request.json()
      console.log("📦 Body parseado (JSON):", body)
    } catch (jsonError: any) {
      try {
        const bodyText = await request.text()
        console.log("📦 Body recebido (text):", bodyText)
        
        if (bodyText) {
          body = JSON.parse(bodyText)
          console.log("📦 Body parseado (text->JSON):", body)
        } else {
          console.warn("⚠️ Body vazio ou não fornecido")
        }
      } catch (parseError: any) {
        console.error("❌ Erro ao fazer parse do body:", parseError)
        return NextResponse.json(
          { 
            success: false,
            error: "Body inválido ou vazio", 
            details: parseError.message 
          },
          { status: 400 }
        )
      }
    }
    
    const { email, senha } = body

    if (!email || typeof email !== 'string' || email.trim() === '') {
      console.error("❌ API Route - Email não fornecido ou inválido no body")
      return NextResponse.json(
        { 
          success: false,
          error: "Email é obrigatório", 
          receivedBody: body 
        },
        { status: 400 }
      )
    }

    if (!senha || typeof senha !== 'string' || senha.trim() === '') {
      console.error("❌ API Route - Senha não fornecida ou inválida no body")
      return NextResponse.json(
        { 
          success: false,
          error: "Senha é obrigatória", 
          receivedBody: body 
        },
        { status: 400 }
      )
    }

    console.log("🔍 API Route - Buscando administradora por email:", email)
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
    console.log("📋 TABELA CONSULTADA: administradoras")
    
    // Buscar administradora na tabela administradoras usando supabaseAdmin (bypassa RLS)
    // Usar ilike para busca case-insensitive no email_login
    const { data: administradoras, error } = await supabaseAdmin
      .from("administradoras")
      .select("*")
      .ilike("email_login", email.toLowerCase())

    console.log("📊 Resultado da query:", {
      administradorasEncontradas: administradoras?.length || 0,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      } : null,
    })

    if (error) {
      console.error("❌ Erro ao buscar administradora no Supabase:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { 
          error: "Erro ao buscar administradora", 
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    if (!administradoras || administradoras.length === 0) {
      console.error("❌ Administradora não encontrada para email:", email)
      
      const errorResponse = NextResponse.json(
        { 
          success: false,
          error: "Administradora não encontrada",
          message: "Administradora não encontrada. Verifique seu email ou faça seu cadastro.",
          emailBuscado: email,
        },
        { status: 404 }
      )
      
      errorResponse.headers.set('Content-Type', 'application/json')
      return errorResponse
    }

    // Se houver múltiplas administradoras, pegar a primeira
    const administradora = administradoras[0]

    console.log("✅ API Route - Administradora encontrada:", {
      id: administradora.id,
      nome: administradora.nome,
      email_login: administradora.email_login,
      status: administradora.status,
      status_login: administradora.status_login,
    })

    // Verificar senha usando bcrypt
    if (!administradora.senha_hash) {
      console.error("❌ Administradora não possui senha_hash configurada")
      return NextResponse.json(
        { 
          success: false,
          error: "Senha não configurada",
          message: "Sua conta ainda não possui senha configurada. Entre em contato com o suporte.",
        },
        { status: 401 }
      )
    }

    // Comparar senha fornecida com hash armazenado
    const senhaValida = await bcrypt.compare(senha, administradora.senha_hash)
    
    if (!senhaValida) {
      console.error("❌ Senha inválida para administradora:", administradora.id)
      return NextResponse.json(
        { 
          success: false,
          error: "Senha incorreta",
          message: "Senha incorreta. Tente novamente.",
        },
        { status: 401 }
      )
    }

    console.log("✅ Senha válida para administradora:", administradora.id)

    // Verificar status da administradora
    if (administradora.status !== "ativa") {
      console.warn("⚠️ Administradora não está ativa:", administradora.status)
      return NextResponse.json(
        { 
          success: false,
          error: "Conta inativa",
          message: `Sua conta está ${administradora.status}. Entre em contato com o suporte.`,
        },
        { status: 403 }
      )
    }

    // Remover dados sensíveis antes de retornar
    const administradoraRetorno = {
      ...administradora,
      senha_hash: undefined, // Não retornar hash da senha
    }

    console.log("✅ Retornando resposta de sucesso com administradora:", {
      id: administradoraRetorno.id,
      nome: administradoraRetorno.nome,
      email_login: administradoraRetorno.email_login,
      status: administradoraRetorno.status,
      status_login: administradoraRetorno.status_login,
    })

    const response = NextResponse.json({
      success: true,
      administradora: administradoraRetorno,
    }, { status: 200 })

    // Adicionar headers CORS se necessário
    response.headers.set('Content-Type', 'application/json')
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response
  } catch (error: any) {
    console.error("❌ Erro na API route de login de administradora:", error)
    console.error("❌ Stack trace:", error.stack)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Erro ao fazer login", 
        details: error.stack 
      },
      { status: 500 }
    )
  }
}

/**
 * API Route para buscar administradora por email (GET)
 * Para debug e testes diretos.
 */
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

    console.log("🔍 API Route GET - Buscando administradora por email:", email)

    const { data: administradoras, error } = await supabaseAdmin
      .from("administradoras")
      .select("*")
      .ilike("email_login", email.toLowerCase())

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar administradora", details: error.message },
        { status: 500 }
      )
    }

    if (!administradoras || administradoras.length === 0) {
      return NextResponse.json(
        { error: "Administradora não encontrada" },
        { status: 404 }
      )
    }

    // Remover senha_hash antes de retornar
    const administradora = { ...administradoras[0], senha_hash: undefined }

    return NextResponse.json({
      success: true,
      administradora,
    })
  } catch (error: any) {
    console.error("❌ Erro na API route GET:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao buscar administradora" },
      { status: 500 }
    )
  }
}

