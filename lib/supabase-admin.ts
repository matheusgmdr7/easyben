import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Cria um cliente Supabase com a chave de serviço (service_role)
// Esta chave tem permissões de administrador e pode ignorar o RLS
// ⚠️ IMPORTANTE: Este cliente só deve ser usado no servidor (API routes, Server Components)
// NUNCA use no cliente (Client Components) por segurança!

type SupabaseAdminClient = ReturnType<typeof createClient<Database>>

let supabaseAdminInstance: SupabaseAdminClient | null = null

/** URL do projeto — workers Railway podem usar SUPABASE_URL sem prefixo NEXT_PUBLIC_. */
export function resolverSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
}

/** Apenas diagnóstico: identifica se a key parece service_role ou anon (JWT payload). */
export function identificarPapelSupabaseKey(key: string | undefined): string | null {
  if (!key?.trim()) return null
  try {
    const parts = key.trim().split(".")
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      role?: string
    }
    return payload.role ?? null
  } catch {
    return null
  }
}

function getSupabaseAdmin(): SupabaseAdminClient {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance
  }

  const supabaseUrl = resolverSupabaseUrl()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL não definida: use NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL"
    )
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

  const papel = identificarPapelSupabaseKey(serviceRoleKey)
  if (papel && papel !== "service_role") {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY inválida: JWT com role "${papel}". ` +
        "Use a chave service_role do Supabase (Project Settings → API), não a anon key."
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
