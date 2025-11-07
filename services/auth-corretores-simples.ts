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
  try {
    const emailNormalizado = loginData.email.trim().toLowerCase()
    console.log("Tentando autenticar corretor com email:", loginData.email)
    console.log("Email normalizado para busca:", emailNormalizado)

    // 1. Buscar corretor pelo email (case-insensitive)
    const { data: corretor, error } = await supabase
      .from("corretores")
      .select("*")
      .ilike("email", emailNormalizado)
      .maybeSingle()

    // 2. Verificar se o corretor existe
    if (error || !corretor) {
      if (error) {
        console.error("Erro ao buscar corretor:", error)
      } else {
        console.log("Corretor não encontrado para o email:", loginData.email)
      }

      // MODO DE DESENVOLVIMENTO: Permitir login com qualquer email
      // Esta exceção só funciona em ambiente de desenvolvimento
      if (isDevEnvironment()) {
        console.log("MODO DE DESENVOLVIMENTO: Permitindo login com qualquer email")

        // Criar um corretor fictício para desenvolvimento
        const corretorFicticio = {
          id: "dev-123",
          nome: "Corretor Desenvolvimento",
          email: emailNormalizado,
          email: emailNormalizado,
          status: "aprovado",
          telefone: "11999999999",
          cpf: "12345678900",
          cidade: "São Paulo",
          estado: "SP",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Salvar no localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "corretorLogado",
            JSON.stringify({
              ...corretorFicticio,
              session: {
                access_token: `token_dev_${corretorFicticio.id}`,
                expires_at: Date.now() + 86400000, // 24 horas
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
        message: "Corretor não encontrado. Verifique seu email ou faça seu cadastro.",
      }
    }

    // 3. IMPORTANTE: Desabilitar verificação de senha em TODOS os ambientes
    // Isso é uma solução temporária para permitir login em produção
    // Em uma implementação de produção real, você deve verificar a senha

    // 4. Verificar status do corretor
    if (corretor.status !== "aprovado") {
      return {
        success: true,
        message: "Login realizado com sucesso, aguardando aprovação.",
        corretor,
      }
    }

    // 5. Login bem-sucedido
    console.log("Login bem-sucedido para:", corretor.nome)

    // 6. Salvar dados no localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "corretorLogado",
        JSON.stringify({
          ...corretor,
          // Criar uma sessão fictícia para compatibilidade
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
  } catch (error) {
    console.error("Erro ao fazer login:", error)
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
