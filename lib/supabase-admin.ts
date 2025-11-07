import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Cria um cliente Supabase com a chave de serviço (service_role)
// Esta chave tem permissões de administrador e pode ignorar o RLS
// ⚠️ IMPORTANTE: Este cliente só deve ser usado no servidor (API routes, Server Components)
// NUNCA use no cliente (Client Components) por segurança!

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validar que as variáveis estão definidas
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL não está definida nas variáveis de ambiente")
}

if (!serviceRoleKey) {
  // No cliente, retornar um erro mais amigável
  if (typeof window !== "undefined") {
    console.error("❌ ERRO: supabaseAdmin não pode ser usado no cliente!")
    console.error("As operações que requerem service role devem ser feitas através de API routes.")
  }
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY não está definida nas variáveis de ambiente. " +
    "Esta chave é necessária apenas no servidor para operações administrativas."
  )
}

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export { supabaseAdmin }
