/**
 * Status da fila outbound WhatsApp (Redis/BullMQ).
 *
 * Pré-requisitos:
 *   - Arquivo .env.local na raiz com REDIS_URL ou UPSTASH_REDIS_URL
 *
 * Uso:
 *   npm run whatsapp:fila-status
 *   # ou
 *   npx tsx --env-file=.env.local scripts/status-fila-whatsapp.ts
 */
import { getOutboundQueue } from "../lib/whatsapp-billing/queues"
import { getAdaptiveMaxPerSecond } from "../lib/whatsapp-billing/adaptive-rate-limit"

async function main() {
  const q = getOutboundQueue()
  const [waiting, delayed, active, completed, failed] = await Promise.all([
    q.getWaitingCount(),
    q.getDelayedCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
  ])

  const adaptiveRate = await getAdaptiveMaxPerSecond()

  const failedJobs = await q.getFailed(0, 5)
  const amostraFalhas = failedJobs.map((j) => ({
    id: j.id,
    eventType: j.data?.eventType,
    failedReason: j.failedReason?.slice(0, 120),
  }))

  console.log("=== Fila WhatsApp (BullMQ) ===")
  console.log("Nome:", "whatsapp-outbound-notifications")
  console.log("")
  console.log("Contagens:")
  console.log(
    JSON.stringify(
      {
        waiting: "Aguardando processamento",
        delayed: "Agendadas (delay/stagger)",
        active: "Sendo processadas agora",
        completed: "Concluídas (histórico Redis)",
        failed: "Falharam após todas tentativas",
      },
      null,
      2
    )
  )
  console.log(JSON.stringify({ waiting, delayed, active, completed, failed }, null, 2))
  console.log("")
  console.log("Rate adaptativo worker:", `${adaptiveRate} msg/s`)
  console.log("")
  if (amostraFalhas.length) {
    console.log("Últimas falhas na fila (amostra):")
    console.log(JSON.stringify(amostraFalhas, null, 2))
  } else {
    console.log("Nenhuma falha recente na fila Redis.")
  }
  console.log("")
  console.log("Interpretação rápida:")
  if (waiting + delayed > 500) {
    console.log("- Alto volume na fila: worker pode estar lento ou parado.")
  }
  if (failed > 20) {
    console.log("- Muitas falhas Redis: verifique logs do worker e limites Meta/Twilio.")
  }
  if (waiting === 0 && delayed === 0 && active === 0) {
    console.log("- Fila vazia: crons podem não ter enfileirado ou tudo já foi processado.")
  }

  await q.close()
}

main().catch((err) => {
  console.error("Erro:", err instanceof Error ? err.message : err)
  console.error("")
  console.error("Verifique se REDIS_URL ou UPSTASH_REDIS_URL está definido em .env.local")
  process.exit(1)
})
