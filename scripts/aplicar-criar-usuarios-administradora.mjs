/**
 * Aplica scripts/criar-usuarios-administradora.sql via RPC execute_sql (se existir no projeto).
 * Uso: node scripts/aplicar-criar-usuarios-administradora.mjs
 */
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    for (const line of raw.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    /* ignore */
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local")
  process.exit(1)
}

const sqlPath = resolve(__dirname, "criar-usuarios-administradora.sql")
const sql = readFileSync(sqlPath, "utf8")

const statements = sql
  .split(";")
  .map((s) => s.replace(/^\s*--[^\n]*\n?/gm, "").trim())
  .filter((s) => s.length > 0)

const supabase = createClient(url, key)

async function run() {
  console.log(`Aplicando ${statements.length} comando(s) em usuarios_administradora...`)

  for (let i = 0; i < statements.length; i++) {
    const query = statements[i] + ";"
    const preview = query.split("\n")[0].slice(0, 80)
    console.log(`\n[${i + 1}/${statements.length}] ${preview}...`)

    const { error } = await supabase.rpc("execute_sql", { query })
    if (error) {
      console.error("Erro:", error.message)
      process.exit(1)
    }
    console.log("OK")
  }

  const { data, error } = await supabase.from("usuarios_administradora").select("id").limit(1)
  if (error) {
    console.error("Tabela criada mas verificação falhou:", error.message)
    process.exit(1)
  }

  console.log("\n✅ Migração concluída. Tabela usuarios_administradora disponível.")
  console.log("   Registros atuais (amostra):", data?.length ?? 0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
