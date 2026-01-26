import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import bcrypt from "bcryptjs"

/**
 * API Route para cadastro de administradoras
 * Usa supabaseAdmin para bypassar RLS
 */
export async function POST(request: NextRequest) {
  console.log("🚀 API Route /api/administradora/cadastro - POST recebido")
  
  try {
    const body = await request.json()
    console.log("📦 Body recebido:", body)

    // Verificar se supabaseAdmin está disponível
    if (!supabaseAdmin) {
      console.error("❌ supabaseAdmin não está disponível!")
      return NextResponse.json(
        { success: false, error: "Erro de configuração do servidor" },
        { status: 500 }
      )
    }

    // Verificar se email_login já existe
    if (body.email_login) {
      const { data: existente } = await supabaseAdmin
        .from("administradoras")
        .select("id")
        .eq("email_login", body.email_login.toLowerCase())
        .single()

      if (existente) {
        return NextResponse.json(
          {
            success: false,
            message: "Este email já está cadastrado. Use outro email ou faça login.",
          },
          { status: 400 }
        )
      }
    }

    // Verificar se CNPJ já existe
    if (body.cnpj) {
      const { data: existente } = await supabaseAdmin
        .from("administradoras")
        .select("id")
        .eq("cnpj", body.cnpj)
        .single()

      if (existente) {
        return NextResponse.json(
          {
            success: false,
            message: "Este CNPJ já está cadastrado.",
          },
          { status: 400 }
        )
      }
    }

    // Hash da senha se fornecida
    let senhaHash = null
    if (body.senha) {
      senhaHash = await bcrypt.hash(body.senha, 10)
    }

    // Remover senha do body e adicionar senha_hash
    const { senha, ...dadosSemSenha } = body
    const dadosParaInserir = {
      ...dadosSemSenha,
      senha_hash: senhaHash,
    }

    // Inserir administradora
    const { data: novaAdministradora, error } = await supabaseAdmin
      .from("administradoras")
      .insert([dadosParaInserir])
      .select()
      .single()

    if (error) {
      console.error("❌ Erro ao criar administradora:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao criar administradora",
          details: error.message,
        },
        { status: 500 }
      )
    }

    console.log("✅ Administradora criada com sucesso:", novaAdministradora.id)

    // Remover senha_hash antes de retornar
    const { senha_hash, ...administradoraRetorno } = novaAdministradora

    return NextResponse.json({
      success: true,
      administradora: administradoraRetorno,
      message: "Cadastro realizado com sucesso! Aguarde a aprovação do administrador.",
    })
  } catch (error: any) {
    console.error("❌ Erro na API route de cadastro:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao cadastrar administradora",
      },
      { status: 500 }
    )
  }
}

