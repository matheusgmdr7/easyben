"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatarData } from "@/utils/formatters"
import { toast } from "sonner"

type MensagemRow = {
  id: string
  fatura_id: string | null
  cliente_nome: string | null
  event_type: string
  event_label: string
  telefone_mascara: string
  status: string
  reference_date: string
  created_at: string
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  failed_at: string | null
  error_message: string | null
}

const btnSquare = "rounded-sm"

function rotuloStatusWhatsApp(status: string) {
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

function corStatusWhatsApp(status: string) {
  const s = String(status || "").toLowerCase()
  if (s === "read" || s === "delivered") return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (s === "sent" || s === "queued") return "text-sky-700 bg-sky-50 border-sky-200"
  if (s === "failed" || s === "failed_permanent" || s === "undelivered")
    return "text-rose-700 bg-rose-50 border-rose-200"
  return "text-slate-600 bg-slate-50 border-slate-200"
}

type Props = {
  administradoraId: string
}

export function WhatsAppMensagensHistorico({ administradoraId }: Props) {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<MensagemRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        administradora_id: administradoraId,
        page: String(page),
        limit: "20",
      })
      const res = await fetch(`/api/administradora/whatsapp/messages?${qs}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar histórico")
      setMessages(data.messages || [])
      setTotalPages(data.total_pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar histórico")
    } finally {
      setLoading(false)
    }
  }, [administradoraId, page])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Histórico de envios WhatsApp</h2>
          <p className="text-sm text-slate-500">{total} mensagem{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(btnSquare, "border-slate-300")}
          disabled={loading}
          onClick={() => void carregar()}
        >
          Atualizar
        </Button>
      </div>

      {loading && messages.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Evento
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Telefone
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Nenhum envio registrado ainda.
                  </td>
                </tr>
              ) : (
                messages.map((m, idx) => (
                  <tr key={m.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-4 py-2.5 text-slate-700 tabular-nums whitespace-nowrap">
                      {formatarData(String(m.created_at).slice(0, 10))}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium">
                      {m.cliente_nome || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 text-xs">{m.event_label}</td>
                    <td className="px-4 py-2.5 text-slate-500 tabular-nums text-xs">
                      {m.telefone_mascara}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium",
                          corStatusWhatsApp(m.status)
                        )}
                        title={m.error_message || undefined}
                      >
                        {rotuloStatusWhatsApp(m.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3">
        <p className="text-xs text-slate-500">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(btnSquare, "border-slate-300")}
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(btnSquare, "border-slate-300")}
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Badge compacto para coluna do painel de pendências. */
export function BadgeStatusWhatsAppFatura({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
        corStatusWhatsApp(status)
      )}
    >
      {rotuloStatusWhatsApp(status)}
    </span>
  )
}

export { rotuloStatusWhatsApp, corStatusWhatsApp }
