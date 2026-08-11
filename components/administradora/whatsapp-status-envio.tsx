import { cn } from "@/lib/utils"

export function rotuloStatusWhatsApp(status: string) {
  const s = String(status || "").toLowerCase()
  if (s === "read") return "Lido"
  if (s === "delivered") return "Entregue"
  if (s === "sent") return "Enviado"
  if (s === "queued") return "Na fila"
  if (s === "pending") return "Pendente"
  if (s === "failed" || s === "failed_permanent") return "Falhou"
  if (s === "undelivered") return "Não entregue"
  return status || "—"
}

function corPontoStatusWhatsApp(status: string) {
  const s = String(status || "").toLowerCase()
  if (s === "read" || s === "delivered") return "bg-emerald-600"
  if (s === "sent") return "bg-slate-500"
  if (s === "queued" || s === "pending" || s === "accepted" || s === "sending" || s === "enfileirado") {
    return "bg-amber-500"
  }
  if (s === "failed" || s === "failed_permanent" || s === "undelivered") return "bg-red-600"
  return "bg-slate-300"
}

function corTextoStatusWhatsApp(status: string) {
  const s = String(status || "").toLowerCase()
  if (s === "failed" || s === "failed_permanent" || s === "undelivered") return "text-red-800"
  if (s === "read" || s === "delivered") return "text-slate-800"
  return "text-slate-600"
}

export function isStatusEnvioEmProgresso(status: string) {
  const s = String(status || "").toLowerCase()
  return s === "queued" || s === "pending" || s === "accepted" || s === "sending" || s === "enfileirado"
}

function corAnelStatusWhatsApp(status: string) {
  const s = String(status || "").toLowerCase()
  if (s === "read" || s === "delivered") return "bg-emerald-500"
  if (s === "sent") return "bg-slate-500"
  if (s === "queued" || s === "pending" || s === "accepted" || s === "sending" || s === "enfileirado") {
    return "bg-amber-400"
  }
  if (s === "failed" || s === "failed_permanent" || s === "undelivered") return "bg-red-500"
  return "bg-slate-300"
}

type StatusEnvioWhatsAppProps = {
  status?: string | null
  title?: string
  vazio?: string
  className?: string
  /** Força animação de progresso (ex.: enquanto a API processa o envio). */
  emProgresso?: boolean
}

/** Indicador de status de envio WhatsApp (ponto animado + texto). */
export function StatusEnvioWhatsApp({
  status,
  title,
  vazio = "—",
  className,
  emProgresso = false,
}: StatusEnvioWhatsAppProps) {
  if (!status?.trim() && !emProgresso) {
    return <span className={cn("text-xs text-slate-400", className)}>{vazio}</span>
  }

  const statusEfetivo = emProgresso && !status?.trim() ? "queued" : String(status || "queued")
  const animar = emProgresso || isStatusEnvioEmProgresso(statusEfetivo)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-normal tabular-nums",
        corTextoStatusWhatsApp(statusEfetivo),
        className
      )}
      title={title}
    >
      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center" aria-hidden>
        {animar ? (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping",
              corAnelStatusWhatsApp(statusEfetivo)
            )}
          />
        ) : null}
        <span
          className={cn(
            "relative h-2 w-2 rounded-full",
            corPontoStatusWhatsApp(statusEfetivo),
            animar && "animate-pulse"
          )}
        />
      </span>
      {emProgresso && !status?.trim()
        ? "Enviando…"
        : rotuloStatusWhatsApp(statusEfetivo)}
    </span>
  )
}
