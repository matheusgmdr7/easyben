import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Cria um cliente Supabase com a chave de serviço (service_role)
// Esta chave tem permissões de administrador e pode ignorar o RLS
// ⚠️ IMPORTANTE: Este cliente só deve ser usado no servidor (API routes, Server Components)
// NUNCA use no cliente (Client Components) por segurança!

type SupabaseAdminClient = ReturnType<typeof createClient<Database>>

let supabaseAdminInstance: SupabaseAdminClient | null = null

function getSupabaseAdmin(): SupabaseAdminClient {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não está definida nas variáveis de ambiente")
  }

  if (!serviceRoleKey) {
    if (typeof window !== "undefined") {
      console.error("❌ ERRO: supabaseAdmin não pode ser usado no cliente!")
      console.error("As operações que requerem service role devem ser feitas através de API routes.")
    }
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não está definida nas variáveis de ambiente. " +
        "Esta chave é necessária apenas no servidor para operações administrativas."
    )
  }

  supabaseAdminInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseAdminInstance
}

const supabaseAdmin = new Proxy({} as SupabaseAdminClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin() as Record<PropertyKey, unknown>
    const value = client[prop]

    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }

    return value
  },
})

export { supabaseAdmin, getSupabaseAdmin }
