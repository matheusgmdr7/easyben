import type { Config } from "@netlify/functions"
import { executarCronCatchupLembretesVencimento } from "../../lib/whatsapp-billing/reminders-catchup-cron"

/**
 * Catch-up lembretes D0/D-1 — a cada 15 min, 08h–12h45 BRT (11–15 UTC).
 */
export default async function handler() {
  try {
    const resultado = await executarCronCatchupLembretesVencimento()
    console.log("[whatsapp-billing-reminders-catchup]", JSON.stringify(resultado))
    return new Response(JSON.stringify({ ok: true, ...resultado }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[whatsapp-billing-reminders-catchup] erro:", message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export const config: Config = {
  schedule: "*/15 11-15 * * *",
}
