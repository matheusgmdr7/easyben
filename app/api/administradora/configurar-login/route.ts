import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import bcrypt from "bcryptjs"

/**
 * API Route para configurar login de administradora
 * Permite definir email_login e senha para administradoras existentes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { administradora_id, email_login, senha } = body

    if (!administradora_id) {
      return NextResponse.json(
        { success: false, error: "ID da administradora é obrigatório" },
        { status: 400 }
      )
    }

    if (!email_login || !email_login.trim()) {
      return NextResponse.json(
        { success: false, error: "Email de login é obrigatório" },
        { status: 400 }
      )
    }

    if (!senha || senha.length < 6) {
      return NextResponse.json(
        { success: false, error: "Senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email_login)) {
      return NextResponse.json(
        { success: false, error: "Email inválido" },
        { status: 400 }
      )
    }

    // Verificar se já existe outra administradora com este email_login
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("administradoras")
      .select("id, email_login")
      .ilike("email_login", email_login.toLowerCase())
      .neq("id", administradora_id)

    if (checkError) {
      console.error("❌ Erro ao verificar email existente:", checkError)
      return NextResponse.json(
        { success: false, error: "Erro ao verificar email" },
        { status: 500 }
      )
    }

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Este email já está em uso por outra administradora" },
        { status: 400 }
      )
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)

    // Criar ou atualizar usuário no Supabase Auth para redefinição de senha
    // Buscar se já existe usuário com este email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email_login.toLowerCase()
    )

    let authUserId: string | null = null

    if (existingUser) {
      // Atualizar senha do usuário existente
      const { data: updatedUser, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: senha }
      )
      if (updateAuthError) {
        console.warn("⚠️ Erro ao atualizar usuário no Supabase Auth:", updateAuthError)
        // Continuar mesmo se falhar (não é crítico)
      } else {
        authUserId = updatedUser.user.id
      }
    } else {
      // Criar novo usuário no Supabase Auth
      const { data: newUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: email_login.toLowerCase().trim(),
        password: senha,
        email_confirm: true,
        user_metadata: {
          role: "administradora",
          tipo: "administradora",
        },
      })
      if (createAuthError) {
        console.warn("⚠️ Erro ao criar usuário no Supabase Auth:", createAuthError)
        // Continuar mesmo se falhar (não é crítico)
      } else {
        authUserId = newUser.user.id
      }
    }

    // Atualizar administradora
    const { data: administradora, error: updateError } = await supabaseAdmin
      .from("administradoras")
      .update({
        email_login: email_login.toLowerCase().trim(),
        senha_hash: senhaHash,
        status_login: "ativo", // Ativar login automaticamente
        updated_at: new Date().toISOString(),
        // Opcional: salvar auth_user_id se quiser vincular
        // auth_user_id: authUserId,
      })
      .eq("id", administradora_id)
      .select()
      .single()

    if (updateError) {
      console.error("❌ Erro ao atualizar administradora:", updateError)
      return NextResponse.json(
        { success: false, error: "Erro ao configurar login", details: updateError.message },
        { status: 500 }
      )
    }

    if (!administradora) {
      return NextResponse.json(
        { success: false, error: "Administradora não encontrada" },
        { status: 404 }
      )
    }

    // Remover senha_hash da resposta
    const { senha_hash, ...administradoraRetorno } = administradora

    return NextResponse.json({
      success: true,
      message: "Login configurado com sucesso!",
      administradora: administradoraRetorno,
    })
  } catch (error: any) {
    console.error("❌ Erro na API route de configurar login:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao configurar login" },
      { status: 500 }
    )
  }
}

