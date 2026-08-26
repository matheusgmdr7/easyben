/**
 * Reenfileira mensagens WhatsApp que falharam por limite de taxa / conta restrita.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/reenfileirar-whatsapp-falhas.ts
 *   npx tsx --env-file=.env.local scripts/reenfileirar-whatsapp-falhas.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/reenfileirar-whatsapp-falhas.ts --data-inicio 2026-08-25 --data-fim 2026-08-26
 */
import { reenfileirarMensagensWhatsAppFalhas } from "../lib/whatsapp-billing/requeue-failed"

function parseArgs() {
  const args = process.argv.slice(2)
  let dataInicio = "2026-08-25"
  let dataFim = "2026-08-26"
  let dryRun = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--dry-run") dryRun = true
    else if (arg === "--data-inicio" && args[i + 1]) dataInicio = args[++i]
    else if (arg === "--data-fim" && args[i + 1]) dataFim = args[++i]
  }

  const failedFrom = `${dataInicio}T03:00:00.000Z`
  const failedToDiaSeguinte = new Date(`${dataFim}T12:00:00.000Z`)
  failedToDiaSeguinte.setUTCDate(failedToDiaSeguinte.getUTCDate() + 1)
  const failedTo = `${failedToDiaSeguinte.toISOString().slice(0, 10)}T02:59:59.999Z`

  return { failedFrom, failedTo, dataInicio, dataFim, dryRun }
}

async function main() {
  const { failedFrom, failedTo, dataInicio, dataFim, dryRun } = parseArgs()
  const createdFrom = `${dataInicio}T03:00:00.000Z`
  const createdToDiaSeguinte = new Date(`${dataFim}T12:00:00.000Z`)
  createdToDiaSeguinte.setUTCDate(createdToDiaSeguinte.getUTCDate() + 1)
  const createdTo = `${createdToDiaSeguinte.toISOString().slice(0, 10)}T02:59:59.999Z`

  console.log("Reenfileiramento WhatsApp — falhas retentáveis")
  console.log(`  created_at: ${dataInicio} → ${dataFim} (BRT)`)
  console.log(`  status: failed, failed_permanent, undelivered`)
  console.log(`  dry-run: ${dryRun ? "sim" : "não"}`)
  console.log("")

  const resultado = await reenfileirarMensagensWhatsAppFalhas({
    createdFrom,
    createdTo,
    dryRun,
    recoverySuffix: `recovery:manual:${Date.now()}`,
    maxMessages: 1000,
  })

  console.log(JSON.stringify(resultado, null, 2))

  if (resultado.total === 0) {
    console.log("\nNenhuma mensagem encontrada com os filtros informados.")
    console.log("Tente ajustar --data-inicio / --data-fim ou verifique error_code no banco.")
  } else if (dryRun) {
    console.log(`\nDry-run: ${resultado.total} mensagem(ns) seriam reenfileiradas.`)
    console.log("Execute sem --dry-run para enfileirar de fato.")
  } else {
    console.log(`\n${resultado.enqueued} mensagem(ns) reenfileirada(s).`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
