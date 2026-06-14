/**
 * Corrige o trigger de atualizado_em em usuarios_administradora.
 *
 * Uso:
 *   node scripts/aplicar-corrigir-trigger-usuarios-administradora.mjs
 *
 * Se não houver RPC execute_sql no projeto, copie o SQL exibido e execute
 * no Supabase → SQL Editor.
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
const sqlPath = resolve(__dirname, "corrigir-trigger-usuarios-administradora.sql")
const sql = readFileSync(sqlPath, "utf8")

async function testarUpdate(supabase) {
  const { data: users } = await supabase.from("usuarios_administradora").select("id, permissoes").limit(1)
  if (!users?.length) {
    console.log("Nenhum usuário para testar UPDATE (tabela vazia).")
    return
  }
  const u = users[0]
  const { error } = await supabase
    .from("usuarios_administradora")
    .update({ atualizado_em: new Date().toISOString() })
    .eq("id", u.id)
  if (error) {
    console.log("\n⚠️  UPDATE ainda falha:", error.message)
    return
  }
  console.log("\n✅ UPDATE em usuarios_administradora funcionando.")
}

async function run() {
  if (!url || !key) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local")
    process.exit(1)
  }

  const supabase = createClient(url, key)

  console.log("Testando UPDATE antes da correção...")
  await testarUpdate(supabase)

  const statements = sql
    .split(";")
    .map((s) => s.replace(/^\s*--[^\n]*\n?/gm, "").trim())
    .filter((s) => s.length > 0)

  console.log(`\nAplicando ${statements.length} comando(s) via RPC execute_sql...`)

  let aplicou = true
  for (let i = 0; i < statements.length; i++) {
    const query = statements[i] + ";"
    const preview = query.split("\n").find((l) => l.trim() && !l.trim().startsWith("--"))?.trim().slice(0, 70)
    console.log(`\n[${i + 1}/${statements.length}] ${preview}...`)

    const { error } = await supabase.rpc("execute_sql", { query })
    if (error) {
      aplicou = false
      console.error("RPC indisponível:", error.message)
      break
    }
    console.log("OK")
  }

  if (!aplicou) {
    console.log("\n--- Cole no Supabase SQL Editor ---\n")
    console.log(sql)
    console.log("\n--- Fim do SQL ---\n")
    process.exit(1)
  }

  console.log("\nTestando UPDATE após correção...")
  await testarUpdate(supabase)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
