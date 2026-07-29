/**
 * Bateria de testes locais WhatsApp/Twilio — npx tsx --env-file=.env.local scripts/test-whatsapp-local.ts
 */
import "../lib/load-env-local"

const BASE = process.env.TEST_BASE_URL?.trim() || "http://localhost:3000"

type Result = { name: string; ok: boolean; detail: string }

const results: Result[] = []

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail })
  const icon = ok ? "✓" : "✗"
  console.log(`${icon} ${name}: ${detail}`)
}

async function testEnvVars() {
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_NUMBER",
    "UPSTASH_REDIS_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]
  const missing = required.filter((k) => !process.env[k]?.trim())
  record(
    "Variáveis .env.local",
    missing.length === 0,
    missing.length ? `faltam: ${missing.join(", ")}` : "todas presentes"
  )
}

async function testRedis() {
  const { getRedisConnection, fecharRedisConnection } = await import("../lib/whatsapp-billing")
  const redis = getRedisConnection()
  const pong = await redis.ping()
  await fecharRedisConnection()
  record("Redis Upstash", pong === "PONG", pong)
}

async function testTwilioApi() {
  const Twilio = (await import("twilio")).default
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const client = Twilio(sid, process.env.TWILIO_AUTH_TOKEN!)
  const account = await client.api.accounts(sid).fetch()
  record("Twilio API", true, `conta "${account.friendlyName}"`)
}

async function testSupabaseTemplates() {
  const { supabaseAdmin } = await import("../lib/supabase-admin")
  const { data, error } = await supabaseAdmin
    .from("billing_templates")
    .select("event_type, content_sid")
    .order("event_type")

  if (error) {
    record("Supabase billing_templates", false, error.message)
    return
  }

  const semSid = (data || []).filter((r) => !r.content_sid?.startsWith("HX"))
  record(
    "Supabase billing_templates",
    semSid.length === 0 && (data?.length ?? 0) >= 10,
    `${data?.length ?? 0} templates, ${semSid.length} sem ContentSid`
  )
}

async function waitForServer(maxMs = 60000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(3000) })
      if (res.ok || res.status < 500) return true
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return false
}

async function testWebhook(path: string, body: Record<string, string>, label: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  })
  const text = await res.text()
  record(
    label,
    res.status === 200,
    `HTTP ${res.status}${text ? ` — ${text.slice(0, 80)}` : ""}`
  )
}

async function testWebhooks() {
  const up = await waitForServer()
  if (!up) {
    record("Next.js dev server", false, `${BASE} não respondeu a tempo`)
    return
  }
  record("Next.js dev server", true, BASE)

  process.env.TWILIO_SKIP_WEBHOOK_VALIDATION = "1"

  await testWebhook(
    "/api/webhooks/whatsapp/status",
    {
      MessageSid: "SM_test_local_status",
      MessageStatus: "delivered",
      AccountSid: process.env.TWILIO_ACCOUNT_SID || "",
    },
    "Webhook status"
  )

  await testWebhook(
    "/api/webhooks/whatsapp/inbound",
    {
      MessageSid: `IM_test_local_${Date.now()}`,
      From: "whatsapp:+5511999998888",
      To: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      Body: "teste local easyben",
      AccountSid: process.env.TWILIO_ACCOUNT_SID || "",
    },
    "Webhook inbound"
  )
}

async function testQueueEnqueue() {
  const { enfileirarNotificacaoOutbound, getOutboundQueue, fecharRedisConnection } = await import(
    "../lib/whatsapp-billing"
  )

  const jobId = `test-local-${Date.now()}`
  await enfileirarNotificacaoOutbound(
    {
      eventType: "lembrete_d5",
      clienteId: "00000000-0000-0000-0000-000000000002",
      administradoraId: "00000000-0000-0000-0000-000000000001",
      telefone: "+5511999998888",
      faturaId: "00000000-0000-0000-0000-000000000003",
      referenceDate: "2026-05-19",
      variaveis: { "1": "Cliente Teste", "2": "R$ 100,00" },
    },
    jobId
  )

  const queue = getOutboundQueue()
  let job = await queue.getJob(jobId)
  const waiting = await queue.getWaitingCount()

  if (!job) {
    job = (await queue.getJobs(["active", "completed", "failed"], 0, 20, true)).find(
      (j) => j.id === jobId
    )
  }

  if (job) {
    try {
      await job.remove()
    } catch {
      /* worker processando — ok */
    }
  }

  await fecharRedisConnection()

  record(
    "Fila outbound (enqueue)",
    !!job,
    job ? `job ${jobId} enfileirado/consumido (${waiting} aguardando)` : "job não encontrado"
  )
}

async function testApisUi() {
  const up = await waitForServer(5000)
  if (!up) {
    record("APIs UI (settings/messages)", false, "dev server offline")
    return
  }

  const { supabaseAdmin } = await import("../lib/supabase-admin")

  const { data: adm } = await supabaseAdmin
    .from("administradoras")
    .select("id, nome")
    .limit(1)
    .maybeSingle()

  if (!adm?.id) {
    record("APIs UI — administradora", false, "nenhuma administradora no banco")
    return
  }

  const admId = adm.id

  const resSettings = await fetch(
    `${BASE}/api/administradora/whatsapp/settings?administradora_id=${encodeURIComponent(admId)}`
  )
  const settingsData = await resSettings.json()
  record(
    "API GET settings",
    resSettings.ok && settingsData.settings?.administradora_id === admId,
    resSettings.ok
      ? `automático=${settingsData.settings?.whatsapp_automatico_ativo}`
      : settingsData.error || `HTTP ${resSettings.status}`
  )

  const resMessages = await fetch(
    `${BASE}/api/administradora/whatsapp/messages?administradora_id=${encodeURIComponent(admId)}&limit=5`
  )
  const messagesData = await resMessages.json()
  record(
    "API GET messages",
    resMessages.ok && Array.isArray(messagesData.messages),
    resMessages.ok ? `${messagesData.total ?? 0} mensagens no histórico` : messagesData.error
  )

  const { data: fatura } = await supabaseAdmin
    .from("faturas")
    .select("id, cliente_administradora_id, cliente_telefone, vencimento, status")
    .eq("administradora_id", admId)
    .in("status", ["pendente", "atrasada"])
    .not("cliente_telefone", "is", null)
    .limit(1)
    .maybeSingle()

  if (!fatura?.id) {
    record("API POST enviar-cobranca", true, "pulado — sem fatura pendente com telefone")
    return
  }

  const resEnviar = await fetch(`${BASE}/api/administradora/whatsapp/enviar-cobranca`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      administradora_id: admId,
      fatura_id: fatura.id,
    }),
  })
  const enviarData = await resEnviar.json()
  record(
    "API POST enviar-cobranca",
    resEnviar.ok && enviarData.enqueued === true,
    resEnviar.ok
      ? `enfileirado evento=${enviarData.event_type}`
      : enviarData.error || enviarData.reason || `HTTP ${resEnviar.status}`
  )
}

async function testCronLembretes() {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    record("Cron lembretes", true, "pulado — CRON_SECRET não definido no .env.local")
    return
  }

  const res = await fetch(
    `${BASE}/api/cron/whatsapp-billing-reminders?ignorar_horario=1`,
    { headers: { Authorization: `Bearer ${secret}` } }
  )
  const data = await res.json()
  record(
    "Cron lembretes",
    res.ok && data.data_referencia,
    res.ok
      ? `enfileirados=${data.total_enfileirados}, ignorados=${data.total_ignorados}`
      : data.error || `HTTP ${res.status}`
  )
}

async function main() {
  console.log("\n=== Testes locais WhatsApp / Twilio ===\n")

  await testEnvVars()
  await testRedis()
  await testTwilioApi()
  await testSupabaseTemplates()
  await testQueueEnqueue()
  await testWebhooks()
  await testApisUi()
  await testCronLembretes()

  const failed = results.filter((r) => !r.ok)
  console.log("\n--- Resumo ---")
  console.log(`${results.length - failed.length}/${results.length} passou`)
  if (failed.length) {
    console.log("Falhas:", failed.map((f) => f.name).join(", "))
    process.exit(1)
  }
  console.log("\nTodos os testes locais passaram. Abra http://localhost:3000/administradora/financeiro/cobrancas\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
