"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Eye, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"

type TemplateItem = {
  event_type: string
  label: string
  descricao: string | null
  pronto: boolean
}

type ClienteOpcao = {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
}

type PreviewMensagem = {
  mensagem_renderizada: string | null
  corpo_template: string | null
  variaveis: Array<{ twilio_key: string; label: string; valor: string }>
}

type Props = {
  administradoraId: string
}

const btnSquare = "rounded-sm"

export function WhatsAppEnvioManual({ administradoraId }: Props) {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [eventType, setEventType] = useState("")
  const [telefone, setTelefone] = useState("")
  const [buscaCliente, setBuscaCliente] = useState("")
  const [clientes, setClientes] = useState<ClienteOpcao[]>([])
  const [clienteId, setClienteId] = useState("")
  const [buscandoClientes, setBuscandoClientes] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewMensagem | null>(null)
  const [carregandoPreview, setCarregandoPreview] = useState(false)

  const templatesProntos = useMemo(() => templates.filter((t) => t.pronto), [templates])

  const carregarTemplates = useCallback(async () => {
    setCarregando(true)
    try {
      const qs = new URLSearchParams({ administradora_id: administradoraId })
      const res = await fetch(`/api/administradora/whatsapp/test-templates?${qs}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar modelos")
      const lista = Array.isArray(data.templates) ? data.templates : []
      setTemplates(lista)
      const primeiro = lista.find((t: TemplateItem) => t.pronto)
      if (primeiro) {
        setEventType((prev) => prev || primeiro.event_type)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar modelos")
    } finally {
      setCarregando(false)
    }
  }, [administradoraId])

  useEffect(() => {
    void carregarTemplates()
  }, [carregarTemplates])

  useEffect(() => {
    const termo = buscaCliente.trim()
    if (termo.length < 2) {
      setClientes([])
      return
    }

    const t = window.setTimeout(() => {
      void (async () => {
        setBuscandoClientes(true)
        try {
          const qs = new URLSearchParams({
            administradora_id: administradoraId,
            q: termo,
          })
          const res = await fetch(`/api/administradora/whatsapp/test-templates?${qs}`, {
            cache: "no-store",
          })
          const data = await res.json()
          if (res.ok) setClientes(Array.isArray(data.clientes) ? data.clientes : [])
        } catch {
          setClientes([])
        } finally {
          setBuscandoClientes(false)
        }
      })()
    }, 350)

    return () => window.clearTimeout(t)
  }, [administradoraId, buscaCliente])

  function selecionarCliente(c: ClienteOpcao) {
    setClienteId(c.id)
    setBuscaCliente(c.nome)
    setClientes([])
    if (c.telefone && !telefone.trim()) {
      setTelefone(c.telefone)
    }
  }

  async function abrirPreview() {
    if (!eventType) {
      toast.error("Selecione um modelo de mensagem.")
      return
    }
    setPreviewOpen(true)
    setPreview(null)
    setCarregandoPreview(true)
    try {
      const qs = new URLSearchParams({
        administradora_id: administradoraId,
        event_type: eventType,
      })
      if (clienteId) qs.set("cliente_administradora_id", clienteId)
      const res = await fetch(`/api/administradora/whatsapp/test-templates?${qs}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao montar prévia")
      setPreview(data.mensagem || null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na prévia")
      setPreviewOpen(false)
    } finally {
      setCarregandoPreview(false)
    }
  }

  async function enviar() {
    const tel = normalizarTelefoneWhatsApp(telefone)
    if (!tel) {
      toast.error("Informe um telefone válido com DDD.")
      return
    }
    if (!eventType) {
      toast.error("Selecione o modelo de mensagem.")
      return
    }

    setEnviando(true)
    try {
      const res = await fetch("/api/administradora/whatsapp/test-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          telefone: tel,
          event_type: eventType,
          ...(clienteId ? { cliente_administradora_id: clienteId } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Não foi possível enfileirar o envio")
      toast.success(data.message || "Mensagem enfileirada. O envio ocorre em instantes pelo worker.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-base font-semibold text-slate-800">Envio manual</h2>
          <p className="text-xs text-slate-600 mt-1">
            Escolha um template aprovado na Meta, informe o número de destino e envie pela fila
            WhatsApp (Twilio). Opcionalmente vincule um cliente para preencher variáveis com dados
            reais (fatura, boleto, nome).
          </p>
        </div>

        <div className="p-5 space-y-5 max-w-xl">
          {carregando ? (
            <p className="text-sm text-slate-500 flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando modelos…
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="envio-manual-template" className="text-xs font-semibold text-slate-600">
                  Modelo de mensagem
                </Label>
                <select
                  id="envio-manual-template"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className={cn(
                    "h-10 w-full border border-slate-300 bg-white px-3 text-sm",
                    btnSquare
                  )}
                >
                  <option value="">Selecione…</option>
                  {templates.map((t) => (
                    <option key={t.event_type} value={t.event_type} disabled={!t.pronto}>
                      {t.label}
                      {!t.pronto ? " (indisponível)" : ""}
                    </option>
                  ))}
                </select>
                {templatesProntos.length === 0 && (
                  <p className="text-xs text-amber-700">Nenhum template pronto. Configure na aba Modelos.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="envio-manual-telefone" className="text-xs font-semibold text-slate-600">
                  Telefone de destino
                </Label>
                <Input
                  id="envio-manual-telefone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className={cn(btnSquare, "h-10")}
                />
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="envio-manual-cliente" className="text-xs font-semibold text-slate-600">
                  Cliente (opcional — dados da mensagem)
                </Label>
                <Input
                  id="envio-manual-cliente"
                  placeholder="Buscar por nome ou CPF…"
                  value={buscaCliente}
                  onChange={(e) => {
                    setBuscaCliente(e.target.value)
                    setClienteId("")
                  }}
                  className={cn(btnSquare, "h-10")}
                />
                {buscandoClientes && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Buscando…
                  </p>
                )}
                {clientes.length > 0 && (
                  <ul
                    className={cn(
                      "absolute z-10 mt-1 w-full max-h-48 overflow-y-auto border border-slate-200 bg-white shadow-md",
                      btnSquare
                    )}
                  >
                    {clientes.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                          onClick={() => selecionarCliente(c)}
                        >
                          <span className="font-medium text-slate-800">{c.nome}</span>
                          {c.cpf && (
                            <span className="text-xs text-slate-500 ml-2">{c.cpf}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {clienteId && (
                  <p className="text-[11px] text-emerald-700">Cliente vinculado para variáveis da mensagem.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(btnSquare, "border-slate-300")}
                  disabled={!eventType || templatesProntos.length === 0}
                  onClick={() => void abrirPreview()}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Ver prévia
                </Button>
                <Button
                  type="button"
                  className={cn(btnSquare, "bg-[#0F172A] hover:bg-[#1E293B] text-white")}
                  disabled={enviando || !eventType}
                  onClick={() => void enviar()}
                >
                  {enviando ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Enviar mensagem
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia do envio</DialogTitle>
            <DialogDescription>
              Texto montado com {clienteId ? "dados do cliente selecionado" : "dados de exemplo"}.
            </DialogDescription>
          </DialogHeader>
          {carregandoPreview ? (
            <div className="py-8 flex items-center justify-center text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Montando…
            </div>
          ) : preview?.mensagem_renderizada ? (
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-200 bg-slate-50 p-4 rounded-sm">
              {preview.mensagem_renderizada}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Prévia indisponível para este modelo.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
