"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LimitesPayload = {
  sender: {
    status: string | null
    messaging_limit_raw: string | null
    messaging_limit_max: number | null
    quality_rating: string | null
  }
  uso_24h: { destinatarios_unicos: number }
  restantes: number | null
  percentual_uso: number | null
  em_risco: boolean
  twilio_configurado: boolean
  atualizado_em: string
}

function formatarNumero(n: number) {
  return n.toLocaleString("pt-BR")
}

function rotuloQualidade(raw: string | null) {
  const q = String(raw || "").toUpperCase()
  if (q === "HIGH") return { label: "Alta", className: "text-green-700 bg-green-50 border-green-200" }
  if (q === "MEDIUM") return { label: "Média", className: "text-amber-700 bg-amber-50 border-amber-200" }
  if (q === "LOW") return { label: "Baixa", className: "text-rose-700 bg-rose-50 border-rose-200" }
  return { label: raw || "—", className: "text-slate-600 bg-slate-50 border-slate-200" }
}

type WhatsAppLimiteEnviosProps = {
  /** Incrementar para forçar refresh após envio manual. */
  refreshToken?: number
  className?: string
}

export function WhatsAppLimiteEnvios({ refreshToken = 0, className }: WhatsAppLimiteEnviosProps) {
  const [dados, setDados] = useState<LimitesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setErro(null)
      const res = await fetch("/api/administradora/whatsapp/limites", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao consultar limites")
      setDados(data)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao consultar limites")
      setDados(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    void carregar()
  }, [carregar, refreshToken])

  useEffect(() => {
    const id = window.setInterval(() => void carregar(), 60_000)
    return () => window.clearInterval(id)
  }, [carregar])

  if (loading && !dados) {
    return (
      <div className={cn("flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Consultando limite de envios WhatsApp…
      </div>
    )
  }

  if (erro && !dados) {
    return (
      <div className={cn("rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900", className)}>
        Não foi possível consultar o limite: {erro}
      </div>
    )
  }

  if (!dados) return null

  const max = dados.sender.messaging_limit_max
  const usados = dados.uso_24h.destinatarios_unicos
  const restantes = dados.restantes
  const pct = dados.percentual_uso ?? 0
  const qualidade = rotuloQualidade(dados.sender.quality_rating)
  const limiteLabel =
    dados.sender.messaging_limit_raw ||
    (max != null ? `${formatarNumero(max)}/24h` : "Ilimitado")
  const statusSender = String(dados.sender.status || "—")

  return (
    <div
      className={cn(
        "rounded-sm border px-4 py-3",
        dados.em_risco ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Limite WhatsApp (Meta / 24h)
            </p>
            {dados.em_risco ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                Atenção ao limite
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900 tabular-nums">{formatarNumero(usados)}</span>
            {" "}usados
            {max != null ? (
              <>
                {" · "}
                <span className="tabular-nums">{formatarNumero(restantes ?? 0)}</span> disponíveis de{" "}
                <span className="tabular-nums">{formatarNumero(max)}</span>
              </>
            ) : (
              <> · tier {limiteLabel}</>
            )}
          </p>
          <p className="text-xs text-slate-500">
            Contagem por destinatário único nas últimas 24h (templates de cobrança). Status: {statusSender}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className={cn("rounded-sm border px-2 py-0.5 text-[11px] font-medium", qualidade.className)}>
            Qualidade {qualidade.label}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-sm border-slate-300 text-xs"
            disabled={loading}
            onClick={() => {
              setLoading(true)
              void carregar()
            }}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {max != null ? (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                "h-full transition-all",
                pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 tabular-nums">{pct}% do tier ({limiteLabel})</p>
        </div>
      ) : null}

      {!dados.twilio_configurado ? (
        <p className="mt-2 text-xs text-amber-800">
          Twilio não configurado — exibindo apenas o uso interno das últimas 24h.
        </p>
      ) : null}
    </div>
  )
}
