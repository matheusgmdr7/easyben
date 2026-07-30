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
  if (s === "read" || s === "delivered") return "bg-slate-800"
  if (s === "sent") return "bg-slate-600"
  if (s === "queued" || s === "pending") return "bg-slate-400"
  if (s === "failed" || s === "failed_permanent" || s === "undelivered") return "bg-red-600"
  return "bg-slate-300"
}

function corTextoStatusWhatsApp(status: string) {
  const s = String(status || "").toLowerCase()
  if (s === "failed" || s === "failed_permanent" || s === "undelivered") return "text-red-800"
  if (s === "read" || s === "delivered") return "text-slate-800"
  return "text-slate-600"
}

type StatusEnvioWhatsAppProps = {
  status?: string | null
  title?: string
  vazio?: string
  className?: string
}

/** Indicador minimalista de status de envio WhatsApp (ponto + texto). */
export function StatusEnvioWhatsApp({
  status,
  title,
  vazio = "—",
  className,
}: StatusEnvioWhatsAppProps) {
  if (!status?.trim()) {
    return <span className={cn("text-xs text-slate-400", className)}>{vazio}</span>
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-normal tabular-nums",
        corTextoStatusWhatsApp(status),
        className
      )}
      title={title}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", corPontoStatusWhatsApp(status))}
        aria-hidden
      />
      {rotuloStatusWhatsApp(status)}
    </span>
  )
}
