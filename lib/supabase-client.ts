import supabase, { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase"

export function getSupabaseClient() {
  return supabase
}

// Exportar o cliente Supabase
export const supabaseClient = supabase

// Função para testar a conexão
export async function testarConexaoSupabase() {
  try {
    console.log("🔍 Testando conexão com Supabase...")
    console.log("URL:", SUPABASE_URL)
    console.log("Key (primeiros 10 caracteres):", SUPABASE_ANON_KEY.substring(0, 10) + "...")

    // Teste simples de conexão
    const { data, error } = await supabaseClient.from("produtos_corretores").select("id").limit(1)

    if (error) {
      console.error("❌ Erro ao testar conexão Supabase:", error)
      return {
        success: false,
        message: error.message,
        details: error,
      }
    }

    console.log("✅ Conexão Supabase funcionando! Dados recebidos:", data)
    return {
      success: true,
      message: "Conexão estabelecida com sucesso",
      details: { data },
    }
  } catch (error) {
    console.error("❌ Erro inesperado ao testar Supabase:", error)
    return {
      success: false,
      message: error.message,
      details: { error },
    }
  }
}

// Função para verificar explicitamente as chaves de API
export async function verificarChavesAPI() {
  try {
    console.log("🔍 Verificando chaves de API...")

    // Verificar se as chaves estão definidas
    if (!SUPABASE_URL || SUPABASE_URL.trim() === "") {
      console.error("❌ URL do Supabase não definida")
      return {
        success: false,
        message: "URL do Supabase não definida",
        details: { url: false, key: false },
      }
    }

    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.trim() === "") {
      console.error("❌ Chave anônima do Supabase não definida")
      return {
        success: false,
        message: "Chave anônima do Supabase não definida",
        details: { url: true, key: false },
      }
    }

    // Testar a conexão
    return await testarConexaoSupabase()
  } catch (error) {
    console.error("❌ Erro inesperado ao verificar chaves de API:", error)
    return {
      success: false,
      message: error.message,
      details: { error },
    }
  }
}

// Função para obter as variáveis de ambiente do Supabase
export function getSupabaseEnv() {
  return {
    url: supabaseUrl,
    key: supabaseAnonKey,
    isUsingDefaults: !process.env.NEXT_PUBLIC_SUPABASE_URL,
  }
}
