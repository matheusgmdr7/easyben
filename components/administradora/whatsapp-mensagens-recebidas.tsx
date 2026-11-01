"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, MessageSquare, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { EVENTO_WHATSAPP_RESPOSTAS_ATUALIZADAS } from "@/lib/whatsapp-respostas-notificacoes"

type ConversaResumo = {
  id: string
  cliente_administradora_id: string | null
  cliente_nome: string | null
  telefone_mascara: string
  ultima_em: string
  ultima_preview: string
  ultima_origem: "cliente" | "nos"
  pode_responder: boolean
}

type ItemHistorico = {
  id: string
  origem: "cliente" | "nos"
  em: string
  texto: string
  rotulo: string
  status: string | null
}

type Historico = {
  cliente_nome: string | null
  telefone_mascara: string
  pode_responder: boolean
  motivo_bloqueio: string | null
  itens: ItemHistorico[]
}

const btnSquare = "rounded-sm"

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

function rotuloStatus(status: string | null) {
  if (!status) return null
  if (status === "failed" || status === "failed_permanent" || status === "undelivered") return "não entregue"
  if (status === "read") return "lida"
  if (status === "delivered") return "entregue"
  if (status === "sent" || status === "queued" || status === "pending") return "enviada"
  return null
}

export function WhatsAppMensagensRecebidas({
  administradoraId,
  conversaInicial,
}: {
  administradoraId: string
  conversaInicial?: string | null
}) {
  const [loading, setLoading] = useState(true)
  const [conversas, setConversas] = useState<ConversaResumo[]>([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [aberta, setAberta] = useState<ConversaResumo | null>(null)
  const [historico, setHistorico] = useState<Historico | null>(null)
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const abertaIdRef = useRef<string | null>(null)
  const pageRef = useRef(page)
  const historicoFimRef = useRef<HTMLDivElement>(null)
  const historicoQuantidadeRef = useRef(0)
  const conversaAbertaAutoRef = useRef<string | null>(null)

  const carregar = useCallback(async (opcoes?: { silencioso?: boolean }) => {
    if (!opcoes?.silencioso) setLoading(true)
    try {
      const qs = new URLSearchParams({
        administradora_id: administradoraId,
        page: String(page),
        limit: "20",
      })
      const res = await fetch(`/api/administradora/whatsapp/conversas?${qs}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar conversas")
      setConversas(data.conversas || [])
      setHasNext(Boolean(data.has_next))
    } catch (e) {
      if (!opcoes?.silencioso) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar conversas")
      }
    } finally {
      if (!opcoes?.silencioso) setLoading(false)
    }
  }, [administradoraId, page])

  const carregarHistorico = useCallback(
    async (conversaId: string, opcoes?: { silencioso?: boolean }) => {
      if (!opcoes?.silencioso) setCarregandoHistorico(true)
      try {
        const qs = new URLSearchParams({
          administradora_id: administradoraId,
          conversa_id: conversaId,
        })
        const res = await fetch(`/api/administradora/whatsapp/conversas?${qs}`, { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Erro ao carregar a conversa")
        setHistorico(data)
      } catch (e) {
        if (!opcoes?.silencioso) {
          toast.error(e instanceof Error ? e.message : "Erro ao carregar a conversa")
          setAberta(null)
        }
      } finally {
        if (!opcoes?.silencioso) setCarregandoHistorico(false)
      }
    },
    [administradoraId]
  )

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    abertaIdRef.current = aberta?.id ?? null
    pageRef.current = page
  }, [aberta?.id, page])

  useEffect(() => {
    function aoChegarResposta() {
      if (pageRef.current !== 1) setPage(1)
      else void carregar({ silencioso: true })
      const id = abertaIdRef.current
      if (id) void carregarHistorico(id, { silencioso: true })
    }
    window.addEventListener(EVENTO_WHATSAPP_RESPOSTAS_ATUALIZADAS, aoChegarResposta)
    return () => window.removeEventListener(EVENTO_WHATSAPP_RESPOSTAS_ATUALIZADAS, aoChegarResposta)
  }, [carregar, carregarHistorico])

  useEffect(() => {
    if (!conversaInicial || conversaAbertaAutoRef.current === conversaInicial) return
    conversaAbertaAutoRef.current = conversaInicial
    setAberta({
      id: conversaInicial,
      cliente_administradora_id: null,
      cliente_nome: null,
      telefone_mascara: "",
      ultima_em: "",
      ultima_preview: "",
      ultima_origem: "cliente",
      pode_responder: false,
    })
    setHistorico(null)
    setTexto("")
    void carregarHistorico(conversaInicial)
  }, [conversaInicial, carregarHistorico])

  useEffect(() => {
    const quantidade = historico?.itens.length ?? 0
    const fim = historicoFimRef.current
    const caixa = fim?.parentElement
    if (quantidade > historicoQuantidadeRef.current && caixa) {
      caixa.scrollTop = caixa.scrollHeight
    }
    historicoQuantidadeRef.current = quantidade
  }, [historico])

  function abrirConversa(conversa: ConversaResumo) {
    setAberta(conversa)
    setHistorico(null)
    setTexto("")
    void carregarHistorico(conversa.id)
  }

  async function responder() {
    if (!aberta) return
    const corpo = texto.trim()
    if (!corpo) {
      toast.error("Escreva a resposta.")
      return
    }
    setEnviando(true)
    try {
      const res = await fetch("/api/administradora/whatsapp/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          conversa_id: aberta.id,
          texto: corpo,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao responder")
      setTexto("")
      toast.success("Resposta enviada")
      await carregarHistorico(aberta.id)
      void carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao responder")
    } finally {
      setEnviando(false)
    }
  }

  const podeResponder = Boolean(historico?.pode_responder)

  return (
    <>
      <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Mensagens recebidas</h2>
            <p className="text-sm text-slate-500">
              Uma conversa por cliente. A lista atualiza sozinha quando o cliente responde.
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

        {loading && conversas.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Última mensagem
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Quando
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Conversa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conversas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      Nenhuma mensagem recebida ainda para esta administradora.
                    </td>
                  </tr>
                ) : (
                  conversas.map((c, idx) => (
                    <tr key={c.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {c.cliente_nome || (c.cliente_administradora_id ? "Cliente" : "Número sem cliente vinculado")}
                      </td>
                      <td className="px-4 py-2.5 text-xs tabular-nums text-slate-500">{c.telefone_mascara}</td>
                      <td className="max-w-md truncate px-4 py-2.5 text-xs text-slate-600">
                        <span className="mr-1 font-medium text-slate-500">
                          {c.ultima_origem === "cliente" ? "Cliente:" : "Nós:"}
                        </span>
                        {c.ultima_preview}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-700">
                        {formatarDataHora(c.ultima_em)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(btnSquare, "h-8 text-xs text-slate-600")}
                          onClick={() => abrirConversa(c)}
                        >
                          <MessageSquare className="mr-1 h-3.5 w-3.5" />
                          Abrir
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
          <p className="text-xs text-slate-500">Página {page}</p>
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
              disabled={!hasNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(aberta)}
        onOpenChange={(open) => {
          if (!open) {
            setAberta(null)
            setHistorico(null)
            setTexto("")
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{historico?.cliente_nome || aberta?.cliente_nome || "Conversa"}</DialogTitle>
            <DialogDescription>
              {historico?.telefone_mascara || aberta?.telefone_mascara} · o que enviamos e o que o cliente respondeu
            </DialogDescription>
          </DialogHeader>

          {carregandoHistorico && !historico ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando conversa…
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {(historico?.itens || []).length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Nenhuma mensagem neste histórico.</p>
              ) : (
                historico?.itens.map((item) => {
                  const nosso = item.origem === "nos"
                  const status = rotuloStatus(item.status)
                  return (
                    <div key={item.id} className={cn("flex", nosso ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-sm border px-3 py-2",
                          nosso ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-800"
                        )}
                      >
                        <p className={cn("text-[11px] font-semibold", nosso ? "text-slate-300" : "text-slate-500")}>
                          {item.rotulo}
                          {status ? ` · ${status}` : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{item.texto}</p>
                        <p className={cn("mt-1 text-[10px] tabular-nums", nosso ? "text-slate-400" : "text-slate-400")}>
                          {formatarDataHora(item.em)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={historicoFimRef} />
            </div>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-3">
            {historico && !podeResponder && historico.motivo_bloqueio ? (
              <p className="text-xs text-amber-800">{historico.motivo_bloqueio}</p>
            ) : (
              <p className="text-xs text-slate-500">A resposta livre vale por 24 horas depois da mensagem do cliente.</p>
            )}
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva a resposta"
              disabled={!podeResponder || enviando}
              maxLength={1000}
              className="min-h-[88px] rounded-sm"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className={cn(btnSquare, "bg-slate-900 text-white hover:bg-slate-800")}
                disabled={!podeResponder || enviando || !texto.trim()}
                onClick={() => void responder()}
              >
                {enviando ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                Responder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
