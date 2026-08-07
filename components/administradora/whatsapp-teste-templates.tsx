"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { formatarTelefone } from "@/utils/formatters"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"

type TemplateItem = {
  event_type: string
  label: string
  descricao: string | null
  content_sid: string | null
  ativo: boolean
  pronto: boolean
}

type Props = {
  administradoraId: string
}

const btnSquare = "rounded-sm"

export function WhatsAppTesteTemplates({ administradoraId }: Props) {
  const [telefone, setTelefone] = useState("")
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [enviandoTodos, setEnviandoTodos] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch("/api/administradora/whatsapp/test-templates", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar modelos")
      setTemplates(Array.isArray(data.templates) ? data.templates : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar modelos")
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const telefoneOk = Boolean(normalizarTelefoneWhatsApp(telefone))
  const prontos = templates.filter((t) => t.pronto)

  async function enviarUm(eventType: string) {
    if (!telefoneOk) {
      toast.error("Informe um telefone válido com DDD")
      return
    }
    setEnviandoId(eventType)
    try {
      const res = await fetch("/api/administradora/whatsapp/test-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          telefone,
          event_type: eventType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao enfileirar")
      toast.success(data.message || "Modelo enfileirado para envio")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar teste")
    } finally {
      setEnviandoId(null)
    }
  }

  async function enviarTodos() {
    if (!telefoneOk) {
      toast.error("Informe um telefone válido com DDD")
      return
    }
    if (prontos.length === 0) {
      toast.error("Nenhum modelo pronto para envio")
      return
    }
    setEnviandoTodos(true)
    try {
      const res = await fetch("/api/administradora/whatsapp/test-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          telefone,
          enviar_todos: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao enfileirar")
      toast.success(data.message || `${data.enfileirados} modelo(s) enfileirado(s)`)
      if (Array.isArray(data.falhas) && data.falhas.length > 0) {
        toast.warning(`${data.falhas.length} modelo(s) não enfileirado(s)`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar todos")
    } finally {
      setEnviandoTodos(false)
    }
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
        <h2 className="text-base font-semibold text-slate-800">Testar modelos de mensagem</h2>
        <p className="text-xs text-slate-600 mt-1">
          Envie cada template Twilio para um número de teste com dados de exemplo (cliente fictício,
          valores e links demonstrativos).
        </p>
      </div>

      <div className="p-5 space-y-5">
        <div className="max-w-md space-y-2">
          <Label htmlFor="whatsapp-teste-telefone">Telefone de destino</Label>
          <Input
            id="whatsapp-teste-telefone"
            placeholder="(21) 99999-9999"
            value={telefone}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value) || e.target.value)}
            className={cn(btnSquare, "h-10")}
          />
          <p className="text-[11px] text-slate-500">Use um número WhatsApp real que você consiga conferir.</p>
        </div>

        <Alert className="border-amber-200 bg-amber-50/80">
          <AlertDescription className="text-xs text-amber-900">
            Os envios usam dados fictícios de exemplo. Mensagens reais aos clientes continuam usando
            dados reais da fatura/cadastro. Cada teste gera um job na fila Twilio.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className={cn(btnSquare, "bg-[#0F172A] hover:bg-[#1E293B] text-white")}
            disabled={!telefoneOk || enviandoTodos || prontos.length === 0}
            onClick={() => void enviarTodos()}
          >
            {enviandoTodos ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando todos…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar todos ({prontos.length})
              </>
            )}
          </Button>
        </div>

        {carregando ? (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando modelos…
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-sm">
            {templates.map((t) => (
              <li
                key={t.event_type}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{t.label}</p>
                  {t.descricao && <p className="text-xs text-slate-500 truncate">{t.descricao}</p>}
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t.event_type}</p>
                  {!t.pronto && (
                    <p className="text-xs text-amber-700 mt-1">
                      {!t.ativo ? "Template inativo" : "Content SID não configurado"}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(btnSquare, "shrink-0")}
                  disabled={!t.pronto || !telefoneOk || enviandoId === t.event_type || enviandoTodos}
                  onClick={() => void enviarUm(t.event_type)}
                >
                  {enviandoId === t.event_type ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    "Enviar teste"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
