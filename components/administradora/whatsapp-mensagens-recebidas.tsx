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
import { toast } from "sonner"

type InboundRow = {
  id: string
  message_sid: string
  telefone_mascara: string
  body_preview: string | null
  cliente_nome: string | null
  processed_at: string | null
  created_at: string
}

type InboundDetalhe = InboundRow & {
  body: string | null
  telefone: string
}

const btnSquare = "rounded-sm"

type Props = {
  administradoraId: string
}

function formatarDataHora(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function WhatsAppMensagensRecebidas({ administradoraId }: Props) {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<InboundRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [detalheOpen, setDetalheOpen] = useState(false)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [detalhe, setDetalhe] = useState<InboundDetalhe | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        administradora_id: administradoraId,
        page: String(page),
        limit: "20",
      })
      const res = await fetch(`/api/administradora/whatsapp/inbound-messages?${qs}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar mensagens")
      setMessages(data.messages || [])
      setTotalPages(data.total_pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar mensagens recebidas")
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
      const res = await fetch(`/api/administradora/whatsapp/inbound-messages?${qs}`, {
        cache: "no-store",
      })
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
            <h2 className="text-base font-semibold text-slate-800">Mensagens recebidas</h2>
            <p className="text-sm text-slate-500">
              Respostas dos clientes no número WhatsApp de cobrança ({total} registrada
              {total !== 1 ? "s" : ""}). Exige webhook inbound configurado na Twilio.
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
                    Recebida em
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Mensagem
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Detalhe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      Nenhuma mensagem recebida ainda para esta administradora.
                    </td>
                  </tr>
                ) : (
                  messages.map((m, idx) => (
                    <tr key={m.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 text-slate-700 tabular-nums whitespace-nowrap text-xs">
                        {formatarDataHora(m.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">
                        {m.cliente_nome || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 tabular-nums text-xs">
                        {m.telefone_mascara}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs max-w-md truncate">
                        {m.body_preview || "—"}
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
                          Ver
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
            <DialogTitle>Mensagem recebida</DialogTitle>
            <DialogDescription>Conteúdo enviado pelo cliente via WhatsApp.</DialogDescription>
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
                  <dt className="text-slate-500">Recebida em</dt>
                  <dd className="text-slate-800">{formatarDataHora(detalhe.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Cliente</dt>
                  <dd className="text-slate-800">{detalhe.cliente_nome || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Telefone</dt>
                  <dd className="text-slate-800">{detalhe.telefone_mascara}</dd>
                </div>
                {detalhe.message_sid && (
                  <div className="col-span-2">
                    <dt className="text-slate-500">ID Twilio</dt>
                    <dd className="text-slate-800 font-mono text-[11px]">{detalhe.message_sid}</dd>
                  </div>
                )}
              </dl>
              <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Texto
                </p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {detalhe.body?.trim() || "(sem texto)"}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
