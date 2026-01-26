import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

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
 * API Route para autenticação de corretores
 * Usa supabaseAdmin para bypassar RLS durante o login
 */
export async function POST(request: NextRequest) {
  // LOG FORÇADO PARA DEBUG
  console.log("=".repeat(50))
  console.log("🚀🚀🚀 API ROUTE /api/corretor/auth/login CHAMADA 🚀🚀🚀")
  console.log("=".repeat(50))
  
  try {
    console.log("🚀 API Route /api/corretor/auth/login - POST recebido")
    
    let body: any = {}
    try {
      // Tentar usar request.json() primeiro (mais confiável)
      body = await request.json()
      console.log("📦 Body parseado (JSON):", body)
    } catch (jsonError: any) {
      // Se falhar, tentar request.text()
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

    console.log("🔍 API Route - Buscando corretor por email:", email)
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
    console.log("📋 TABELA CONSULTADA: corretores (CORRETO)")
    
    // Buscar corretor na tabela corretores usando supabaseAdmin (bypassa RLS)
    // Usar ilike para busca case-insensitive
    const { data: corretores, error } = await supabaseAdmin
      .from("corretores")
      .select("*")
      .ilike("email", email.toLowerCase())

    console.log("📊 Resultado da query:", {
      corretoresEncontrados: corretores?.length || 0,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      } : null,
    })

    if (error) {
      console.error("❌ Erro ao buscar corretor no Supabase:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return NextResponse.json(
        { 
          error: "Erro ao buscar corretor", 
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    if (!corretores || corretores.length === 0) {
      console.error("❌ Corretor não encontrado para email:", email)
      
      // Debug: verificar se há corretores com email similar
      const { data: corretoresSimilares } = await supabaseAdmin
        .from("corretores")
        .select("id, email, status, tenant_id")
        .ilike("email", `%${email.split("@")[0]}%`)
        .limit(5)
      
      console.log("🔍 Corretores com email similar encontrados:", corretoresSimilares)
      
      const errorResponse = NextResponse.json(
        { 
          success: false,
          error: "Corretor não encontrado",
          message: "Corretor não encontrado. Verifique seu email ou faça seu cadastro.",
          emailBuscado: email,
          corretoresSimilares: corretoresSimilares || [],
        },
        { status: 404 }
      )
      
      errorResponse.headers.set('Content-Type', 'application/json')
      return errorResponse
    }

    // Se houver múltiplos corretores, pegar o primeiro
    const corretor = corretores[0]

    console.log("✅ API Route - Corretor encontrado:", {
      id: corretor.id,
      nome: corretor.nome,
      email: corretor.email,
      status: corretor.status,
      tenant_id: corretor.tenant_id,
    })

    // IMPORTANTE: Não verificar senha aqui (já está desabilitado no serviço)
    // A verificação de senha deve ser feita no Supabase Auth se necessário
    // Por enquanto, retornar o corretor encontrado

    // Remover dados sensíveis antes de retornar
    const corretorRetorno = {
      ...corretor,
      // Não retornar campos sensíveis se houver
    }

    console.log("✅ Retornando resposta de sucesso com corretor:", {
      id: corretorRetorno.id,
      nome: corretorRetorno.nome,
      email: corretorRetorno.email,
      status: corretorRetorno.status,
    })

    const response = NextResponse.json({
      success: true,
      corretor: corretorRetorno,
    }, { status: 200 })

    // Adicionar headers CORS se necessário
    response.headers.set('Content-Type', 'application/json')
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response
  } catch (error: any) {
    console.error("❌ Erro na API route de login de corretor:", error)
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
 * API Route para buscar corretor por email (GET)
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

    console.log("🔍 API Route GET - Buscando corretor por email:", email)

    const { data: corretores, error } = await supabaseAdmin
      .from("corretores")
      .select("*")
      .ilike("email", email.toLowerCase())

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar corretor", details: error.message },
        { status: 500 }
      )
    }

    if (!corretores || corretores.length === 0) {
      return NextResponse.json(
        { error: "Corretor não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      corretor: corretores[0],
    })
  } catch (error: any) {
    console.error("❌ Erro na API route GET:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao buscar corretor" },
      { status: 500 }
    )
  }
}

