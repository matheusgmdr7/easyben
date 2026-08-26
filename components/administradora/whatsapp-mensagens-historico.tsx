"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatarData } from "@/utils/formatters"
import { toast } from "sonner"
import { StatusEnvioWhatsApp } from "@/components/administradora/whatsapp-status-envio"

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

type MensagemDetalhe = MensagemRow & {
  message_sid: string | null
  preview?: {
    mensagem_renderizada: string | null
    variaveis: Array<{ twilio_key: string; label: string; valor: string }>
    corpo_template: string | null
  } | null
}

const btnSquare = "rounded-sm"

type Props = {
  administradoraId: string
}

function formatarDataHora(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return formatarData(String(iso).slice(0, 10))
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function WhatsAppMensagensHistorico({ administradoraId }: Props) {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<MensagemRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [detalheOpen, setDetalheOpen] = useState(false)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [detalhe, setDetalhe] = useState<MensagemDetalhe | null>(null)

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

  async function abrirDetalhe(messageId: string) {
    setDetalheOpen(true)
    setDetalhe(null)
    setCarregandoDetalhe(true)
    try {
      const qs = new URLSearchParams({
        administradora_id: administradoraId,
        message_id: messageId,
      })
      const res = await fetch(`/api/administradora/whatsapp/messages?${qs}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar detalhe")
      setDetalhe(data.message || null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar detalhe")
      setDetalheOpen(false)
    } finally {
      setCarregandoDetalhe(false)
    }
  }

  return (
    <>
      <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Histórico de envios WhatsApp</h2>
            <p className="text-sm text-slate-500">
              {total} mensagem{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}. Clique em
              &quot;Ver envio&quot; para conferir o texto exato enviado.
            </p>
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
                    Data/hora
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
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Detalhe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      Nenhum envio registrado ainda.
                    </td>
                  </tr>
                ) : (
                  messages.map((m, idx) => (
                    <tr key={m.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 text-slate-700 tabular-nums whitespace-nowrap text-xs">
                        {formatarDataHora(m.sent_at || m.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">
                        {m.cliente_nome || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{m.event_label}</td>
                      <td className="px-4 py-2.5 text-slate-500 tabular-nums text-xs">
                        {m.telefone_mascara}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusEnvioWhatsApp status={m.status} title={m.error_message || undefined} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(btnSquare, "h-8 text-xs text-slate-600")}
                          onClick={() => void abrirDetalhe(m.id)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver envio
                        </Button>
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

      <Dialog open={detalheOpen} onOpenChange={setDetalheOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe do envio</DialogTitle>
            <DialogDescription>
              Mensagem registrada no sistema — confira o texto e o status de entrega.
            </DialogDescription>
          </DialogHeader>

          {carregandoDetalhe ? (
            <div className="py-8 flex items-center justify-center text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : detalhe ? (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <dt className="text-slate-500">Evento</dt>
                  <dd className="text-slate-800">{detalhe.event_label}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <StatusEnvioWhatsApp
                      status={detalhe.status}
                      title={detalhe.error_message || undefined}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Enfileirado</dt>
                  <dd className="text-slate-800">{formatarDataHora(detalhe.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Enviado</dt>
                  <dd className="text-slate-800">{formatarDataHora(detalhe.sent_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Entregue</dt>
                  <dd className="text-slate-800">{formatarDataHora(detalhe.delivered_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Lido</dt>
                  <dd className="text-slate-800">{formatarDataHora(detalhe.read_at)}</dd>
                </div>
                {detalhe.message_sid && (
                  <div className="col-span-2">
                    <dt className="text-slate-500">ID Twilio</dt>
                    <dd className="text-slate-800 font-mono text-[11px]">{detalhe.message_sid}</dd>
                  </div>
                )}
                {detalhe.error_message && (
                  <div className="col-span-2">
                    <dt className="text-slate-500">Erro</dt>
                    <dd className="text-red-700 text-xs">{detalhe.error_message}</dd>
                  </div>
                )}
              </dl>

              {detalhe.preview?.mensagem_renderizada && (
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Mensagem enviada
                  </p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {detalhe.preview.mensagem_renderizada}
                  </p>
                </div>
              )}

              {detalhe.preview?.variaveis && detalhe.preview.variaveis.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Variáveis enviadas
                  </p>
                  <dl className="space-y-1.5 text-xs">
                    {detalhe.preview.variaveis.map((v) => (
                      <div key={v.twilio_key} className="grid grid-cols-[1fr_2fr] gap-2">
                        <dt className="text-slate-500">{`{${v.twilio_key}}`} {v.label}</dt>
                        <dd className="text-slate-800 break-all">{v.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
