import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { createClient } from "@supabase/supabase-js"

/**
 * API Route para recuperação de senha de corretor
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

    // Verificar se corretor existe
    const { data: corretores, error: searchError } = await supabaseAdmin
      .from("corretores")
      .select("id, nome, email")
      .ilike("email", emailNormalizado)

    if (searchError) {
      console.error("❌ Erro ao buscar corretor:", searchError)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar corretor" },
        { status: 500 }
      )
    }

    // Sempre retornar sucesso (por segurança, não revelar se email existe ou não)
    if (corretores && corretores.length > 0) {
      const corretor = corretores[0]

      // Usar cliente Supabase (não admin) para enviar email de redefinição
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

      // Multi-tenant: use domínio EasyBen para recuperação (mais seguro). Não use domínios de clientes.
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL_RECOVERY ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000"
      const redirectTo = `${baseUrl}/corretor/redefinir-senha`

      console.log("📧 Tentando enviar email de redefinição:", {
        email: emailNormalizado,
        redirectTo: redirectTo,
        baseUrl: baseUrl,
        corretorId: corretor.id,
      })

      // URL de redirecionamento deve estar em Supabase: Settings → Auth → URL Configuration → Redirect URLs
      // Use apenas o domínio EasyBen (não domínios de clientes). Ex.: localhost e https://app.easyben.com.br/...

      // Usar resetPasswordForEmail que ENVIA o email automaticamente
      // O Supabase verifica internamente se o usuário existe, então não precisamos verificar antes
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
          code: resetError.code,
        })
        
        // Se o erro for relacionado a URL não permitida, informar
        if (resetError.message?.includes("redirect") || resetError.message?.includes("URL") || resetError.message?.includes("not allowed")) {
          console.error("⚠️ ATENÇÃO: URL de redirecionamento não configurada no Supabase!")
          console.error("⚠️ Configure em: Supabase Dashboard → Settings → Authentication → URL Configuration")
          console.error("⚠️ Adicione esta URL:", redirectTo)
        }
        
        // Se o erro for que o usuário não existe, apenas logar (não revelar ao usuário)
        if (resetError.message?.includes("not found") || resetError.message?.includes("does not exist")) {
          console.warn("⚠️ Usuário não encontrado no Supabase Auth para:", emailNormalizado)
          console.warn("⚠️ O usuário precisa fazer login uma vez para ser criado no Auth")
        }
      } else {
        console.log("✅ Email de redefinição enviado para:", corretor.email)
        console.log("📧 Dados da resposta:", resetData)
        console.log("✅ Verifique a caixa de entrada e spam do email:", emailNormalizado)
      }
    } else {
      console.warn("⚠️ Corretor não encontrado na tabela corretores para:", email)
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
