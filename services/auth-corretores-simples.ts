import { supabase } from "@/lib/supabase"
import type { Corretor } from "@/types/corretores"

// Interface para dados de login
export interface LoginData {
  email: string
  senha: string
}

// Interface para resultado de autenticação
export interface AuthResult {
  success: boolean
  message: string
  corretor?: Corretor
}

/**
 * Função para verificar se estamos em ambiente de desenvolvimento
 * Esta função é usada para aplicar comportamentos específicos apenas em desenvolvimento
 */
function isDevEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
  )
}

/**
 * Função simplificada para autenticação de corretores
 */
export async function autenticarCorretor(loginData: LoginData): Promise<AuthResult> {
  // LOG FORÇADO PARA DEBUG - SE NÃO APARECER, O CÓDIGO ANTIGO ESTÁ SENDO USADO
  console.log("=".repeat(50))
  console.log("🚀🚀🚀 NOVA VERSÃO DO CÓDIGO DE LOGIN 🚀🚀🚀")
  console.log("=".repeat(50))
  
  try {
    const emailNormalizado = loginData.email.trim().toLowerCase()
    console.log("🚀 [LOGIN] Iniciando autenticação de corretor")
    console.log("📧 [LOGIN] Email:", loginData.email)
    console.log("📧 [LOGIN] Email normalizado:", emailNormalizado)

    // IMPORTANTE: Usar APENAS a API route (bypassa RLS)
    // Não usar fallback do Supabase direto pois está bloqueado pelo RLS
    console.log("🔍 [LOGIN] Buscando corretor via API route (bypassa RLS)...")
    console.log("🌐 [LOGIN] URL da API: /api/corretor/auth/login")
    
    try {
      const response = await fetch("/api/corretor/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: loginData.email, senha: loginData.senha }),
      })

      console.log("📡 [LOGIN] Resposta da API route:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      const responseText = await response.text()
      console.log("📦 [LOGIN] Resposta (text):", responseText)

      let data: any = {}
      try {
        data = JSON.parse(responseText)
        console.log("📦 [LOGIN] Resposta parseada (JSON):", data)
      } catch (parseError: any) {
        console.error("❌ [LOGIN] Erro ao fazer parse da resposta:", parseError)
        console.error("❌ [LOGIN] Resposta original:", responseText)
        return {
          success: false,
          message: "Erro ao processar resposta do servidor. Tente novamente.",
        }
      }

      if (response.ok && data.success && data.corretor) {
        const corretor = data.corretor
        console.log("✅ [LOGIN] Corretor encontrado via API route:", {
          id: corretor.id,
          nome: corretor.nome,
          email: corretor.email,
          status: corretor.status,
        })

        // Verificar status do corretor
        if (corretor.status !== "aprovado") {
          // Salvar no localStorage mesmo se não estiver aprovado
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "corretorLogado",
              JSON.stringify({
                ...corretor,
                session: {
                  access_token: `token_${corretor.id}`,
                  expires_at: Date.now() + 86400000,
                  refresh_token: `refresh_${corretor.id}`,
                },
              }),
            )
          }

          return {
            success: true,
            message: "Login realizado com sucesso, aguardando aprovação.",
            corretor,
          }
        }

        // Login bem-sucedido - corretor aprovado
        console.log("✅ [LOGIN] Login bem-sucedido para:", corretor.nome)

        // Salvar dados no localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "corretorLogado",
            JSON.stringify({
              ...corretor,
              session: {
                access_token: `token_${corretor.id}`,
                expires_at: Date.now() + 86400000, // 24 horas
                refresh_token: `refresh_${corretor.id}`,
              },
            }),
          )
        }

        return {
          success: true,
          message: "Login realizado com sucesso!",
          corretor,
        }
      } else {
        // API retornou erro
        console.error("❌ [LOGIN] API route retornou erro:", {
          status: response.status,
          error: data.error,
          message: data.message,
        })

        // MODO DE DESENVOLVIMENTO: Permitir login com qualquer email
        if (isDevEnvironment()) {
          console.log("🔧 [LOGIN] MODO DE DESENVOLVIMENTO: Permitindo login com qualquer email")

          const corretorFicticio = {
            id: "dev-123",
            nome: "Corretor Desenvolvimento",
            email: emailNormalizado,
            status: "aprovado",
            telefone: "11999999999",
            cpf: "12345678900",
            cidade: "São Paulo",
            estado: "SP",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          if (typeof window !== "undefined") {
            localStorage.setItem(
              "corretorLogado",
              JSON.stringify({
                ...corretorFicticio,
                session: {
                  access_token: `token_dev_${corretorFicticio.id}`,
                  expires_at: Date.now() + 86400000,
                  refresh_token: `refresh_dev_${corretorFicticio.id}`,
                },
              }),
            )
          }

          return {
            success: true,
            message: "Login de desenvolvimento realizado com sucesso!",
            corretor: corretorFicticio as Corretor,
          }
        }

        // Retornar mensagem de erro da API ou mensagem padrão
        return {
          success: false,
          message: data.message || data.error || "Corretor não encontrado. Verifique seu email ou faça seu cadastro.",
        }
      }
    } catch (apiError: any) {
      console.error("❌ [LOGIN] Erro ao chamar API route:", {
        message: apiError.message,
        stack: apiError.stack,
        name: apiError.name,
      })

      // MODO DE DESENVOLVIMENTO: Permitir login com qualquer email
      if (isDevEnvironment()) {
        console.log("🔧 [LOGIN] MODO DE DESENVOLVIMENTO: Permitindo login com qualquer email (erro na API)")

        const corretorFicticio = {
          id: "dev-123",
          nome: "Corretor Desenvolvimento",
          email: emailNormalizado,
          status: "aprovado",
          telefone: "11999999999",
          cpf: "12345678900",
          cidade: "São Paulo",
          estado: "SP",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "corretorLogado",
            JSON.stringify({
              ...corretorFicticio,
              session: {
                access_token: `token_dev_${corretorFicticio.id}`,
                expires_at: Date.now() + 86400000,
                refresh_token: `refresh_dev_${corretorFicticio.id}`,
              },
            }),
          )
        }

        return {
          success: true,
          message: "Login de desenvolvimento realizado com sucesso!",
          corretor: corretorFicticio as Corretor,
        }
      }

      return {
        success: false,
        message: "Erro ao conectar com o servidor. Verifique sua conexão e tente novamente.",
      }
    }
  } catch (error: any) {
    console.error("❌ [LOGIN] Erro geral ao fazer login:", error)
    return {
      success: false,
      message: "Ocorreu um erro ao fazer login. Tente novamente.",
    }
  }
}

/**
 * Função para obter os dados do corretor autenticado
 * Esta função busca os dados atualizados do corretor no banco de dados
 */
export async function obterCorretorAutenticado(): Promise<Corretor | null> {
  try {
    // Verificar se o corretor está autenticado
    const { autenticado, corretor: corretorLocal } = verificarAutenticacao()

    if (!autenticado || !corretorLocal || !corretorLocal.id) {
      return null
    }

    // Se estamos em ambiente de desenvolvimento e usando o corretor fictício
    if (isDevEnvironment() && corretorLocal.id === "dev-123") {
      console.log("Usando corretor fictício de desenvolvimento")
      return corretorLocal
    }

    // Buscar dados atualizados do corretor no banco de dados
    const { data: corretorAtualizado, error } = await supabase
      .from("corretores")
      .select("*")
      .eq("id", corretorLocal.id)
      .single()

    if (error || !corretorAtualizado) {
      console.error("Erro ao buscar dados do corretor:", error)
      return corretorLocal // Retorna os dados do localStorage como fallback
    }

    return corretorAtualizado
  } catch (error) {
    console.error("Erro ao obter corretor autenticado:", error)
    return null
  }
}

/**
 * Função para verificar se o corretor está autenticado
 */
export function verificarAutenticacao(): { autenticado: boolean; corretor?: Corretor } {
  try {
    if (typeof window === "undefined") {
      return { autenticado: false }
    }

    // Verificar dados no localStorage
    const corretorLogadoStr = localStorage.getItem("corretorLogado")
    if (!corretorLogadoStr) {
      return { autenticado: false }
    }

    // Converter dados do localStorage
    const corretorLogado = JSON.parse(corretorLogadoStr)

    // Verificar se os dados são válidos
    if (!corretorLogado || !corretorLogado.id || !corretorLogado.email) {
      localStorage.removeItem("corretorLogado")
      return { autenticado: false }
    }

    return {
      autenticado: true,
      corretor: corretorLogado,
    }
  } catch (error) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("corretorLogado")
    }
    return { autenticado: false }
  }
}

/**
 * Função para obter o corretor logado do localStorage
 * Esta função é usada para obter os dados do corretor sem verificar no banco de dados
 */
export function getCorretorLogado(): Corretor | null {
  try {
    if (typeof window === "undefined") {
      return null
    }

    const corretorLogadoStr = localStorage.getItem("corretorLogado")
    if (!corretorLogadoStr) {
      return null
    }

    const corretorLogado = JSON.parse(corretorLogadoStr)
    if (!corretorLogado || !corretorLogado.id) {
      return null
    }

    return corretorLogado
  } catch (error) {
    console.error("Erro ao obter corretor logado:", error)
    return null
  }
}

// Função para fazer login (alias para compatibilidade)
export async function login(email: string, senha: string) {
  const result = await autenticarCorretor({ email, senha })
  return {
    sucesso: result.success,
    mensagem: result.message,
    corretor: result.corretor,
  }
}

// Função para fazer logout
export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("corretorLogado")
  }
}
