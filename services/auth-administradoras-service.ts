import { supabase } from "@/lib/supabase"
import type { Administradora } from "@/services/administradoras-service"

// Interface para dados de login
export interface LoginAdministradoraData {
  email: string
  senha: string
}

// Interface para resultado de autenticação
export interface AuthAdministradoraResult {
  success: boolean
  message: string
  administradora?: Administradora
}

/**
 * Função para autenticação de administradoras
 */
export async function autenticarAdministradora(
  loginData: LoginAdministradoraData
): Promise<AuthAdministradoraResult> {
  try {
    const emailNormalizado = loginData.email.trim().toLowerCase()
    console.log("🚀 [LOGIN ADMINISTRADORA] Iniciando autenticação")
    console.log("📧 [LOGIN ADMINISTRADORA] Email:", emailNormalizado)

    // Usar API route para bypassar RLS
    console.log("🔍 [LOGIN ADMINISTRADORA] Buscando administradora via API route...")
    
    try {
      const response = await fetch("/api/administradora/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: loginData.email, senha: loginData.senha }),
      })

      console.log("📡 [LOGIN ADMINISTRADORA] Resposta da API:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      const responseText = await response.text()
      console.log("📦 [LOGIN ADMINISTRADORA] Resposta (text):", responseText)

      let data: any = {}
      try {
        data = JSON.parse(responseText)
        console.log("📦 [LOGIN ADMINISTRADORA] Resposta parseada (JSON):", data)
      } catch (parseError: any) {
        console.error("❌ [LOGIN ADMINISTRADORA] Erro ao fazer parse da resposta:", parseError)
        return {
          success: false,
          message: "Erro ao processar resposta do servidor. Tente novamente.",
        }
      }

      if (response.ok && data.success && data.administradora) {
        const administradora = data.administradora
        console.log("✅ [LOGIN ADMINISTRADORA] Administradora encontrada:", {
          id: administradora.id,
          nome: administradora.nome,
          email: administradora.email_login,
          status: administradora.status,
          status_login: administradora.status_login,
        })

        // Verificar status de login
        if (administradora.status_login !== "ativo") {
          // Salvar no localStorage mesmo se não estiver ativo
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "administradoraLogada",
              JSON.stringify({
                ...administradora,
                session: {
                  access_token: `token_${administradora.id}`,
                  expires_at: Date.now() + 86400000,
                  refresh_token: `refresh_${administradora.id}`,
                },
              }),
            )
          }

          return {
            success: true,
            message: "Login realizado com sucesso, aguardando ativação.",
            administradora,
          }
        }

        // Login bem-sucedido - administradora ativa
        console.log("✅ [LOGIN ADMINISTRADORA] Login bem-sucedido para:", administradora.nome)

        // Salvar dados no localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "administradoraLogada",
            JSON.stringify({
              ...administradora,
              session: {
                access_token: `token_${administradora.id}`,
                expires_at: Date.now() + 86400000, // 24 horas
                refresh_token: `refresh_${administradora.id}`,
              },
            }),
          )
        }

        return {
          success: true,
          message: "Login realizado com sucesso!",
          administradora,
        }
      } else {
        // API retornou erro
        console.error("❌ [LOGIN ADMINISTRADORA] API route retornou erro:", {
          status: response.status,
          error: data.error,
          message: data.message,
        })

        return {
          success: false,
          message: data.message || data.error || "Administradora não encontrada. Verifique seu email ou faça seu cadastro.",
        }
      }
    } catch (apiError: any) {
      console.error("❌ [LOGIN ADMINISTRADORA] Erro ao chamar API route:", {
        message: apiError.message,
        stack: apiError.stack,
        name: apiError.name,
      })

      return {
        success: false,
        message: "Erro ao conectar com o servidor. Verifique sua conexão e tente novamente.",
      }
    }
  } catch (error: any) {
    console.error("❌ [LOGIN ADMINISTRADORA] Erro geral ao fazer login:", error)
    return {
      success: false,
      message: "Ocorreu um erro ao fazer login. Tente novamente.",
    }
  }
}

/**
 * Função para verificar se a administradora está autenticada
 */
export function verificarAutenticacaoAdministradora(): {
  autenticado: boolean
  administradora?: Administradora
} {
  try {
    if (typeof window === "undefined") {
      return { autenticado: false }
    }

    // Verificar dados no localStorage
    const administradoraLogadaStr = localStorage.getItem("administradoraLogada")
    if (!administradoraLogadaStr) {
      return { autenticado: false }
    }

    // Converter dados do localStorage
    const administradoraLogada = JSON.parse(administradoraLogadaStr)

    // Verificar se os dados são válidos
    if (!administradoraLogada || !administradoraLogada.id || !administradoraLogada.email_login) {
      localStorage.removeItem("administradoraLogada")
      return { autenticado: false }
    }

    return {
      autenticado: true,
      administradora: administradoraLogada,
    }
  } catch (error) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("administradoraLogada")
    }
    return { autenticado: false }
  }
}

/**
 * Função para obter a administradora logada do localStorage
 */
export function getAdministradoraLogada(): Administradora | null {
  try {
    if (typeof window === "undefined") {
      return null
    }

    const administradoraLogadaStr = localStorage.getItem("administradoraLogada")
    if (!administradoraLogadaStr) {
      return null
    }

    const administradoraLogada = JSON.parse(administradoraLogadaStr)
    if (!administradoraLogada || !administradoraLogada.id) {
      return null
    }

    return administradoraLogada
  } catch (error) {
    console.error("Erro ao obter administradora logada:", error)
    return null
  }
}

/**
 * Função para fazer logout
 */
export function logoutAdministradora(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("administradoraLogada")
  }
}

