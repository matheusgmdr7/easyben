import supabaseClient from "@/lib/supabase"

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
