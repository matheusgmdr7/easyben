import supabaseClient from "@/lib/supabase"
import { PERFIS_PERMISSOES } from "@/services/usuarios-admin-service"

export const supabase = supabaseClient

export async function signInAdmin(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  // Verificar se o usuário tem a função de administrador
  const user = data.user
  const isAdmin = user?.user_metadata?.role === "admin"

  if (!isAdmin) {
    // Se o usuário não for administrador, faça logout e lance um erro
    await supabaseClient.auth.signOut()
    throw new Error("Usuário não tem permissão de administrador")
  }

  // Buscar dados completos do usuário na tabela usuarios_admin via API
  let usuarioSalvo = false
  
  try {
    if (typeof window !== "undefined") {
      console.log("🔍 signInAdmin: Tentando buscar usuário via API...")
      console.log("📍 URL da API:", "/api/admin/auth/user")
      console.log("📍 Email:", email)
      
      const response = await fetch("/api/admin/auth/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
      
      console.log("📡 Resposta da API:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
      })
      
      if (response.ok) {
        try {
          const data = await response.json()
          console.log("📦 Dados recebidos da API:", data)
          
          const { usuario: usuarioCompleto } = data
          
          if (usuarioCompleto) {
            // Garantir que permissões seja sempre um array
            let permissoesArray: string[] = []
            if (Array.isArray(usuarioCompleto.permissoes)) {
              permissoesArray = usuarioCompleto.permissoes
            } else if (usuarioCompleto.permissoes && typeof usuarioCompleto.permissoes === "object") {
              permissoesArray = Object.keys(usuarioCompleto.permissoes)
            }
            
            // Se não há permissões, usar permissões padrão do perfil
            if (permissoesArray.length === 0 && usuarioCompleto.perfil) {
              permissoesArray = PERFIS_PERMISSOES[usuarioCompleto.perfil as keyof typeof PERFIS_PERMISSOES] || []
            }

            const usuarioParaSalvar = {
              ...usuarioCompleto,
              permissoes: permissoesArray,
            }

            // Salvar no localStorage para uso no hook de permissões
            localStorage.setItem("admin_usuario", JSON.stringify(usuarioParaSalvar))
            console.log("✅ Usuário admin salvo no localStorage (via API):", {
              id: usuarioParaSalvar.id,
              email: usuarioParaSalvar.email,
              perfil: usuarioParaSalvar.perfil,
              permissoes: usuarioParaSalvar.permissoes,
              totalPermissoes: permissoesArray.length,
            })
            usuarioSalvo = true
          } else {
            console.warn("⚠️ API retornou OK mas sem usuário:", data)
          }
        } catch (jsonError) {
          console.error("❌ Erro ao fazer parse da resposta JSON:", jsonError)
          const textResponse = await response.text()
          console.error("📄 Resposta em texto:", textResponse)
        }
      } else {
        // API retornou erro (404, 500, etc)
        let errorText = ""
        try {
          errorText = await response.text()
        } catch (e) {
          errorText = "Não foi possível ler o corpo da resposta"
        }
        console.warn("⚠️ API retornou erro:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
        })
        if (response.status === 404) {
          console.warn("⚠️ API route não encontrada (404) - Isso é esperado se a rota não foi deployada")
        }
        console.log("🔄 Vamos tentar fallback direto do Supabase...")
      }
    }
  } catch (err: any) {
    console.error("⚠️ Erro ao buscar dados completos do usuário via API:", err)
    console.error("❌ Stack trace:", err.stack)
    console.log("🔄 Vamos tentar fallback direto devido ao erro...")
  }

  // FALLBACK: Se a API falhar, tentar buscar diretamente do Supabase
  if (!usuarioSalvo) {
    try {
      if (typeof window !== "undefined") {
        console.log("🔄 FALLBACK: Tentando buscar usuário diretamente do Supabase...")
        console.log("📧 Email buscado:", email.toLowerCase())
        console.log("🔍 Executando query no Supabase...")
        
        // Tentar buscar diretamente do Supabase (agora deve funcionar com RLS corrigido)
        const { data: usuarioSupabase, error: supabaseError } = await supabaseClient
          .from("usuarios_admin")
          .select("*")
          .eq("email", email.toLowerCase())
          .eq("ativo", true)
          .single()
        
        console.log("📊 Resultado do fallback Supabase:", {
          usuarioEncontrado: !!usuarioSupabase,
          error: supabaseError ? {
            message: supabaseError.message,
            code: supabaseError.code,
            details: supabaseError.details,
            hint: supabaseError.hint,
          } : null,
          usuarioId: usuarioSupabase?.id,
          usuarioEmail: usuarioSupabase?.email,
        })
        
        // Se encontrou o usuário, mesmo com erro, tentar salvar
        // (alguns erros podem ser não-críticos)
        if (usuarioSupabase) {
          console.log("✅ Usuário encontrado via fallback!")
          
          // Garantir que permissões seja sempre um array
          let permissoesArray: string[] = []
          if (Array.isArray(usuarioSupabase.permissoes)) {
            permissoesArray = usuarioSupabase.permissoes
            console.log("✅ Permissões encontradas como array:", permissoesArray)
          } else if (usuarioSupabase.permissoes && typeof usuarioSupabase.permissoes === "object") {
            permissoesArray = Object.keys(usuarioSupabase.permissoes)
            console.log("⚠️ Permissões encontradas como objeto, convertendo:", permissoesArray)
          } else {
            console.log("⚠️ Permissões não encontradas ou em formato inválido")
          }
          
          // Se não há permissões, usar permissões padrão do perfil
          if (permissoesArray.length === 0 && usuarioSupabase.perfil) {
            permissoesArray = PERFIS_PERMISSOES[usuarioSupabase.perfil as keyof typeof PERFIS_PERMISSOES] || []
            console.log("⚠️ Permissões vazias, usando permissões padrão do perfil:", {
              perfil: usuarioSupabase.perfil,
              permissoesPadrao: permissoesArray,
            })
          }

          const usuarioParaSalvar = {
            ...usuarioSupabase,
            senha_hash: undefined,
            permissoes: permissoesArray,
          }

          localStorage.setItem("admin_usuario", JSON.stringify(usuarioParaSalvar))
          console.log("✅ Usuário admin salvo no localStorage (via fallback Supabase):", {
            id: usuarioParaSalvar.id,
            email: usuarioParaSalvar.email,
            perfil: usuarioParaSalvar.perfil,
            permissoes: usuarioParaSalvar.permissoes,
            totalPermissoes: permissoesArray.length,
          })
          usuarioSalvo = true
          
          // Se houve erro mas ainda assim encontrou o usuário, logar como aviso
          if (supabaseError) {
            console.warn("⚠️ Fallback encontrou usuário mas houve erro (não-crítico):", {
              error: supabaseError.message,
              code: supabaseError.code,
            })
          }
        } else {
          console.error("❌ Fallback do Supabase falhou - usuário não encontrado:", {
            error: supabaseError?.message,
            code: supabaseError?.code,
            details: supabaseError?.details,
            hint: supabaseError?.hint,
          })
          console.warn("⚠️ O hook usePermissions tentará buscar do banco quando necessário.")
        }
      }
    } catch (err: any) {
      console.error("❌ Erro no fallback ao buscar dados completos do usuário:", err)
      console.error("❌ Stack trace:", err.stack)
      // Não bloquear o login se falhar ao buscar dados completos
    }
  }
  
  if (!usuarioSalvo) {
    console.warn("⚠️ Não foi possível salvar o usuário no localStorage. O sidebar pode não funcionar corretamente.")
    console.warn("⚠️ O hook usePermissions tentará buscar do banco quando necessário.")
  }

  return data
}

export async function signOutAdmin() {
  const { error } = await supabaseClient.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
  
  // Limpar dados do usuário do localStorage
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_usuario")
    console.log("🧹 localStorage limpo após logout")
  }
}

export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession()

  if (error) {
    throw new Error(error.message)
  }

  return session
}

// Nova função para verificar se o usuário atual é administrador
export async function isCurrentUserAdmin() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()
  return user?.user_metadata?.role === "admin"
}

// Nova função para atribuir função de administrador a um usuário
export async function setUserAsAdmin(userId: string) {
  // Esta função só pode ser chamada por um usuário que já é administrador
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    throw new Error("Apenas administradores podem atribuir funções de administrador")
  }

  // Atualizar os metadados do usuário
  const { data, error } = await supabaseClient.auth.admin.updateUserById(userId, { user_metadata: { role: "admin" } })

  if (error) {
    throw new Error(`Erro ao atribuir função de administrador: ${error.message}`)
  }

  return data
}

export async function createAdminUser(email: string, password: string) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          role: "admin",
        },
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  } catch (error: any) {
    console.error("Erro ao criar usuário admin:", error)
    throw error
  }
}
