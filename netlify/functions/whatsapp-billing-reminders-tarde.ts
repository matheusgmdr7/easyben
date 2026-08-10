import type { Config } from "@netlify/functions"
import { executarCronLembretesWhatsApp } from "../../lib/whatsapp-billing/reminders-cron"

/**
 * Cron diário Netlify — retentativa tarde dos lembretes WhatsApp.
 * Agenda: 18:00 UTC = 15:00 BRT
 */
export default async function handler() {
  try {
    const resultado = await executarCronLembretesWhatsApp({ janela: "tarde" })
    console.log("[whatsapp-billing-reminders-tarde]", JSON.stringify(resultado))
    return new Response(JSON.stringify({ ok: true, ...resultado }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[whatsapp-billing-reminders-tarde] erro:", message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export const config: Config = {
  schedule: "0 18 * * *",
}
