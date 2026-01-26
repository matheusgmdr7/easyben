import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { createClient } from "@supabase/supabase-js"

/**
 * API Route para recuperação de senha de administradora
 * Usa Supabase Auth para enviar email de redefinição de senha
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email é obrigatório" },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Email inválido" },
        { status: 400 }
      )
    }

    const emailNormalizado = email.toLowerCase().trim()

    // Verificar se administradora existe
    const { data: administradoras, error: searchError } = await supabaseAdmin
      .from("administradoras")
      .select("id, nome, email_login")
      .ilike("email_login", emailNormalizado)

    if (searchError) {
      console.error("❌ Erro ao buscar administradora:", searchError)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar administradora" },
        { status: 500 }
      )
    }

    // Sempre retornar sucesso (por segurança, não revelar se email existe ou não)
    if (administradoras && administradoras.length > 0) {
      const administradora = administradoras[0]

      // Verificar se existe usuário no Supabase Auth
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const authUser = users?.users?.find(
        (u) => u.email?.toLowerCase() === emailNormalizado
      )

      if (authUser) {
        // Usar cliente Supabase (não admin) para enviar email de redefinição
        // O método resetPasswordForEmail do cliente envia o email automaticamente
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error("❌ Variáveis do Supabase não configuradas")
          return NextResponse.json(
            { success: false, error: "Configuração do servidor incompleta" },
            { status: 500 }
          )
        }

        // Criar cliente Supabase (não admin) para usar resetPasswordForEmail
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

        // Para white-label: usar página intermediária que funciona em qualquer domínio
        // Esta página detecta o domínio atual e redireciona para a página de redefinição
        // Isso permite que funcione em qualquer domínio do cliente sem precisar configurar
        // cada URL individualmente no Supabase
        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/administradora/redefinir-senha-redirect`

        console.log("📧 Tentando enviar email de redefinição:", {
          email: emailNormalizado,
          redirectTo: redirectTo,
          authUserId: authUser.id,
        })

        // Usar resetPasswordForEmail que ENVIA o email automaticamente
        const { data: resetData, error: resetError } = await supabaseClient.auth.resetPasswordForEmail(
          emailNormalizado,
          {
            redirectTo: redirectTo,
          }
        )

        if (resetError) {
          console.error("❌ Erro ao enviar email de redefinição:", {
            message: resetError.message,
            status: resetError.status,
            name: resetError.name,
          })
          // Continuar mesmo se falhar (pode ser problema de configuração SMTP)
        } else {
          console.log("✅ Email de redefinição enviado para:", administradora.email_login)
          console.log("📧 Dados da resposta:", resetData)
        }
      } else {
        console.warn("⚠️ Usuário não encontrado no Supabase Auth para:", email)
        console.warn("⚠️ O usuário precisa ser criado no Supabase Auth primeiro.")
        console.warn("⚠️ Configure o login da administradora em /admin/administradoras")
        console.warn("⚠️ OU crie o usuário manualmente no Supabase Auth e vincule à administradora")
      }
    } else {
      console.warn("⚠️ Administradora não encontrada na tabela administradoras para:", email)
      console.warn("⚠️ Verifique se o email_login está configurado corretamente")
    }

    // Sempre retornar sucesso (por segurança - não revelar se email existe)
    return NextResponse.json({
      success: true,
      message: "Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.",
    })
  } catch (error: any) {
    console.error("❌ Erro na API route de recuperação de senha:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar solicitação" },
      { status: 500 }
    )
  }
}

