import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

/**
 * Carrega .env.local (e .env) para scripts/workers fora do Next.js.
 * Next.js já faz isso automaticamente; processos tsx precisam chamar explicitamente.
 */
export function loadEnvLocal(): void {
  if (process.env.__ENV_LOCAL_LOADED === "1") return

  for (const filename of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), filename)
    if (!existsSync(path)) continue

    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) {
        process.env[key] = val
      }
    }
  }

  process.env.__ENV_LOCAL_LOADED = "1"
}

loadEnvLocal()
