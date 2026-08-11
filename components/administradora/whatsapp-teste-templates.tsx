"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type TemplateItem = {
  event_type: string
  label: string
  descricao: string | null
  content_sid: string | null
  ativo: boolean
  pronto: boolean
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

export function WhatsAppTesteTemplates({ administradoraId }: Props) {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [previewMensagemOpen, setPreviewMensagemOpen] = useState(false)
  const [previewMensagemEvent, setPreviewMensagemEvent] = useState<string | null>(null)
  const [previewMensagem, setPreviewMensagem] = useState<PreviewMensagem | null>(null)
  const [carregandoMensagem, setCarregandoMensagem] = useState(false)

  const carregarTemplates = useCallback(async () => {
    setCarregando(true)
    try {
      const qs = new URLSearchParams({ administradora_id: administradoraId })
      const res = await fetch(`/api/administradora/whatsapp/test-templates?${qs}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar modelos")
      setTemplates(Array.isArray(data.templates) ? data.templates : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar modelos")
    } finally {
      setCarregando(false)
    }
  }, [administradoraId])

  useEffect(() => {
    void carregarTemplates()
  }, [carregarTemplates])

  async function abrirPreviewMensagem(eventType: string, label: string) {
    setPreviewMensagemEvent(label)
    setPreviewMensagemOpen(true)
    setPreviewMensagem(null)
    setCarregandoMensagem(true)
    try {
      const qs = new URLSearchParams({
        administradora_id: administradoraId,
        event_type: eventType,
      })
      const res = await fetch(`/api/administradora/whatsapp/test-templates?${qs}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao montar prévia")
      setPreviewMensagem(data.mensagem || null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar mensagem")
      setPreviewMensagemOpen(false)
    } finally {
      setCarregandoMensagem(false)
    }
  }

  const prontos = templates.filter((t) => t.pronto).length

  return (
    <>
      <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-base font-semibold text-slate-800">Modelos de mensagem</h2>
          <p className="text-xs text-slate-600 mt-1">
            Visualize o texto e as variáveis de cada template WhatsApp configurado. A prévia usa
            dados de exemplo para ilustrar como a mensagem será montada no envio automático.
          </p>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700 tabular-nums">{templates.length}</span> modelo(s)
            {" · "}
            <span className="font-medium text-slate-700 tabular-nums">{prontos}</span> pronto(s) para envio
          </p>
        </div>

        <div className="p-5">
          {carregando ? (
            <p className="text-sm text-slate-500 flex items-center gap-2 py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando modelos…
            </p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum modelo configurado.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-sm">
              {templates.map((t) => (
                <li
                  key={t.event_type}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{t.label}</p>
                    {t.descricao && (
                      <p className="text-xs text-slate-500 mt-0.5">{t.descricao}</p>
                    )}
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{t.event_type}</p>
                    {!t.pronto && (
                      <p className="text-xs text-amber-700 mt-1">
                        {!t.ativo ? "Template inativo" : "Content SID não configurado"}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        btnSquare,
                        "border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400"
                      )}
                      disabled={!t.pronto}
                      onClick={() => void abrirPreviewMensagem(t.event_type, t.label)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Ver mensagem
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={previewMensagemOpen} onOpenChange={setPreviewMensagemOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia da mensagem</DialogTitle>
            <DialogDescription>
              {previewMensagemEvent} — texto montado com dados de exemplo para visualização do template.
            </DialogDescription>
          </DialogHeader>

          {carregandoMensagem ? (
            <div className="py-8 flex items-center justify-center text-slate-500 text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Montando prévia…
            </div>
          ) : previewMensagem ? (
            <div className="space-y-4">
              {previewMensagem.mensagem_renderizada && (
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Mensagem
                  </p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {previewMensagem.mensagem_renderizada}
                  </p>
                </div>
              )}

              {previewMensagem.variaveis.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    Variáveis do template
                  </p>
                  <dl className="space-y-1.5 text-xs">
                    {previewMensagem.variaveis.map((v) => (
                      <div key={v.twilio_key} className="grid grid-cols-[1fr_2fr] gap-2">
                        <dt className="text-slate-500">
                          {`{${v.twilio_key}}`} {v.label}
                        </dt>
                        <dd className="text-slate-800 break-all">{v.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {!previewMensagem.corpo_template && (
                <p className="text-[11px] text-slate-500">
                  O corpo do template não pôde ser carregado da Twilio; a prévia acima usa as
                  variáveis mapeadas.
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
