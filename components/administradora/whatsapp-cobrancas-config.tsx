"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type EventLabels = Record<string, string>

type Settings = {
  administradora_id: string
  whatsapp_automatico_ativo: boolean
  horario_envio: string
  horario_envio_tarde: string | null
  eventos_ativos: Record<string, boolean>
  telefone_suporte_whatsapp: string | null
  url_portal_cliente: string | null
}

const btnSquare = "rounded-sm"

type Props = {
  administradoraId: string
}

export function WhatsAppCobrancasConfig({ administradoraId }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [eventLabels, setEventLabels] = useState<EventLabels>({})

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/administradora/whatsapp/settings?administradora_id=${encodeURIComponent(administradoraId)}`,
        { cache: "no-store" }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar configurações")
      setSettings(data.settings)
      setEventLabels(data.event_labels || {})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar WhatsApp")
    } finally {
      setLoading(false)
    }
  }, [administradoraId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(partial: Partial<Settings>) {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch("/api/administradora/whatsapp/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          ...partial,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      setSettings(data.settings)
      toast.success("Configurações salvas")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando configurações WhatsApp…
      </div>
    )
  }

  if (!settings) return null

  const horarioInput = settings.horario_envio.slice(0, 5)
  const horarioTardeInput = settings.horario_envio_tarde?.slice(0, 5) || "15:00"
  const retentativaTardeAtiva = settings.horario_envio_tarde != null

  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">WhatsApp automático (Twilio)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Lembretes, boas-vindas e confirmação de pagamento via templates aprovados na Twilio.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-sm border border-slate-200 bg-slate-50/80 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Envio automático ativo</p>
            <p className="text-xs text-slate-500">Cron diário + gatilhos de boleto e pagamento</p>
          </div>
          <Switch
            checked={settings.whatsapp_automatico_ativo}
            disabled={saving}
            onCheckedChange={(checked) => {
              setSettings((s) => (s ? { ...s, whatsapp_automatico_ativo: checked } : s))
              void salvar({ whatsapp_automatico_ativo: checked })
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="wa-horario" className="text-xs uppercase tracking-wide text-slate-500">
              Horário manhã (BRT)
            </Label>
            <Input
              id="wa-horario"
              type="time"
              className={cn(btnSquare, "h-10")}
              value={horarioInput}
              disabled={saving}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, horario_envio: `${e.target.value}:00` } : s))
              }
              onBlur={() => void salvar({ horario_envio: settings.horario_envio })}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="wa-horario-tarde" className="text-xs uppercase tracking-wide text-slate-500">
                Retentativa tarde (BRT)
              </Label>
              <Switch
                checked={retentativaTardeAtiva}
                disabled={saving || !settings.whatsapp_automatico_ativo}
                onCheckedChange={(checked) => {
                  const horario_envio_tarde = checked ? `${horarioTardeInput}:00` : null
                  setSettings((s) => (s ? { ...s, horario_envio_tarde } : s))
                  void salvar({ horario_envio_tarde })
                }}
              />
            </div>
            <Input
              id="wa-horario-tarde"
              type="time"
              className={cn(btnSquare, "h-10")}
              value={horarioTardeInput}
              disabled={saving || !retentativaTardeAtiva}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, horario_envio_tarde: `${e.target.value}:00` } : s
                )
              }
              onBlur={() => {
                if (retentativaTardeAtiva) {
                  void salvar({ horario_envio_tarde: settings.horario_envio_tarde })
                }
              }}
            />
            <p className="text-[11px] text-slate-500 leading-snug">
              Reenvia lembretes que falharam na manhã, sem duplicar envios já entregues.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-suporte" className="text-xs uppercase tracking-wide text-slate-500">
              Telefone suporte (opcional)
            </Label>
            <Input
              id="wa-suporte"
              className={cn(btnSquare, "h-10")}
              placeholder="+5511999999999"
              value={settings.telefone_suporte_whatsapp || ""}
              disabled={saving}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, telefone_suporte_whatsapp: e.target.value || null } : s
                )
              }
              onBlur={() =>
                void salvar({ telefone_suporte_whatsapp: settings.telefone_suporte_whatsapp })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="wa-portal" className="text-xs uppercase tracking-wide text-slate-500">
              URL portal cliente
            </Label>
            <Input
              id="wa-portal"
              className={cn(btnSquare, "h-10")}
              placeholder="https://easyben.com.br/benefit/cliente"
              value={settings.url_portal_cliente || ""}
              disabled={saving}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, url_portal_cliente: e.target.value || null } : s))
              }
              onBlur={() => void salvar({ url_portal_cliente: settings.url_portal_cliente })}
            />
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Eventos automáticos</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {Object.entries(eventLabels).map(([key, label]) => (
            <li
              key={key}
              className="flex items-center justify-between gap-3 rounded-sm border border-slate-100 px-3 py-2.5"
            >
              <span className="text-sm text-slate-700">{label}</span>
              <Switch
                checked={settings.eventos_ativos[key] !== false}
                disabled={saving || !settings.whatsapp_automatico_ativo}
                onCheckedChange={(checked) => {
                  const eventos_ativos = { ...settings.eventos_ativos, [key]: checked }
                  setSettings((s) => (s ? { ...s, eventos_ativos } : s))
                  void salvar({ eventos_ativos })
                }}
              />
            </li>
          ))}
        </ul>
        {!settings.whatsapp_automatico_ativo ? (
          <p className="text-xs text-amber-700 mt-3">
            Ative o envio automático para configurar eventos individuais.
          </p>
        ) : null}
      </div>

      <div className="px-5 py-3 bg-slate-50/80 flex justify-end">
        <Button
          type="button"
          variant="outline"
          className={cn(btnSquare, "border-slate-300")}
          disabled={loading || saving}
          onClick={() => void carregar()}
        >
          Recarregar
        </Button>
      </div>
    </div>
  )
}
