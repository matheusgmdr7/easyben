"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatarData } from "@/utils/formatters"
import { toast } from "sonner"
import { StatusEnvioWhatsApp } from "@/components/administradora/whatsapp-status-envio"

type Resumo = {
  total: number
  sucesso: number
  falha: number
  pendente: number
}

type ErroFrequente = {
  chave: string
  titulo: string
  mensagem: string
  error_code: string | null
  qtd: number
  pct_falhas: number
  eventos: Array<{ event_type: string; event_label: string; qtd: number }>
  ultima_ocorrencia: string | null
  status_tipico: string | null
}

type FalhasResumo = {
  total: number
  com_motivo: number
  sem_motivo: number
}

type FalhaRecente = {
  id?: string
  created_at: string
  failed_at: string | null
  event_type: string
  event_label: string
  status: string
  error_code: string | null
  titulo_erro: string
  mensagem: string
  cliente_nome?: string | null
  telefone_mascara?: string
}

type MensagemRow = {
  id: string
  cliente_nome: string | null
  event_label: string
  telefone_mascara: string
  status: string
  reference_date: string
  created_at: string
  sent_at: string | null
  failed_at: string | null
  error_message: string | null
  error_code: string | null
  titulo_erro: string | null
}

type CoberturaResumo = {
  elegiveis_total: number
  enviados_ok_total: number
  falhas_total: number
  nunca_tentados_total: number
  cobertura_pct: number
}

type CoberturaEventoDia = {
  event_type: string
  event_label: string
  reference_date: string
  vencimento_alvo: string
  elegiveis: number
  enviados_ok: number
  falhas: number
  pendentes_fila: number
  nunca_tentados: number
  cobertura_pct: number
}

type ErroPorTelefone = {
  telefone_mascara: string
  total_falhas: number
  titulo_erro: string
  error_code: string | null
  eventos: string[]
}

const btnSquare = "rounded-sm"

type PeriodoPreset = "hoje" | "semana" | "mes" | "custom"

const ORDEM_EVENTO = [
  "lembrete_d5",
  "aviso_d1",
  "aviso_d0",
  "cobranca_d3",
  "cobranca_d7",
  "cobranca_d15",
  "cobranca_d25",
]

type Props = {
  administradoraId: string
}

function dataLocalIso(data = new Date()) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, "0")
  const dia = String(data.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function intervaloPreset(preset: Exclude<PeriodoPreset, "custom">) {
  const hoje = dataLocalIso()
  if (preset === "hoje") return { de: hoje, ate: hoje }
  if (preset === "semana") {
    const data = new Date()
    const diaSemana = data.getDay()
    const voltar = diaSemana === 0 ? 6 : diaSemana - 1
    data.setDate(data.getDate() - voltar)
    return { de: dataLocalIso(data), ate: hoje }
  }
  const data = new Date()
  return {
    de: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-01`,
    ate: hoje,
  }
}

function numero(valor: number) {
  return valor.toLocaleString("pt-BR")
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

function formatarPeriodo(de: string, ate: string) {
  return `${formatarData(de)} — ${formatarData(ate)}`
}

export function WhatsAppRelatorioEnvios({ administradoraId }: Props) {
  const mesInicial = intervaloPreset("mes")
  const [preset, setPreset] = useState<PeriodoPreset>("mes")
  const [de, setDe] = useState(mesInicial.de)
  const [ate, setAte] = useState(mesInicial.ate)
  const [modoData, setModoData] = useState<"created_at" | "reference_date">("reference_date")
  const [eventType, setEventType] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [coberturaResumo, setCoberturaResumo] = useState<CoberturaResumo | null>(null)
  const [coberturaEventos, setCoberturaEventos] = useState<CoberturaEventoDia[]>([])
  const [errosPorTelefone, setErrosPorTelefone] = useState<ErroPorTelefone[]>([])
  const [falhasResumo, setFalhasResumo] = useState<FalhasResumo | null>(null)
  const [errosFrequentes, setErrosFrequentes] = useState<ErroFrequente[]>([])
  const [falhasRecentes, setFalhasRecentes] = useState<FalhaRecente[]>([])
  const [mensagens, setMensagens] = useState<MensagemRow[]>([])
  const [analiseErrosAberta, setAnaliseErrosAberta] = useState(false)
  const [detalheDiaAberto, setDetalheDiaAberto] = useState(false)
  const [confirmacaoEnvio, setConfirmacaoEnvio] = useState<{
    eventType?: string
    rotulo: string
    quantidade: number
  } | null>(null)
  const [progressoEnvio, setProgressoEnvio] = useState<{ feitos: number; total: number } | null>(null)
  const pedidoRef = useRef(0)

  const porEventoBase = useMemo(() => {
    const mapa = new Map<string, CoberturaEventoDia>()
    for (const row of coberturaEventos) {
      const atual = mapa.get(row.event_type)
      if (!atual) {
        mapa.set(row.event_type, { ...row })
        continue
      }
      atual.elegiveis += row.elegiveis
      atual.enviados_ok += row.enviados_ok
      atual.falhas += row.falhas
      atual.pendentes_fila += row.pendentes_fila
      atual.nunca_tentados += row.nunca_tentados
    }
    return Array.from(mapa.values())
      .map((row) => ({
        ...row,
        cobertura_pct: row.elegiveis > 0 ? Math.round((row.enviados_ok / row.elegiveis) * 100) : 0,
      }))
      .sort((a, b) => ORDEM_EVENTO.indexOf(a.event_type) - ORDEM_EVENTO.indexOf(b.event_type))
  }, [coberturaEventos])

  const faltantesPeriodo =
    (coberturaResumo?.falhas_total || 0) + (coberturaResumo?.nunca_tentados_total || 0)

  async function enviarFaltantes(alvo: { eventType?: string; quantidade: number }) {
    if (alvo.quantidade <= 0 || progressoEnvio) return
    setConfirmacaoEnvio(null)
    setProgressoEnvio({ feitos: 0, total: alvo.quantidade })
    let cursor: { reference_date: string; event_type: string; apos_id: string } | null = null
    let stagger = 0
    let feitos = 0
    try {
      for (let rodada = 0; rodada < 80; rodada++) {
        const res = await fetch("/api/administradora/whatsapp/cobertura/enviar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            administradora_id: administradoraId,
            de,
            ate,
            event_type: alvo.eventType || undefined,
            stagger_inicial: stagger,
            cursor,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Erro ao enfileirar os avisos")
        const enfileiradosRodada = Number(data.enfileirados) || 0
        feitos += enfileiradosRodada
        stagger = Number(data.proximo_stagger) || stagger
        const cursorAnterior = cursor ? JSON.stringify(cursor) : ""
        cursor = data.cursor || null
        setProgressoEnvio({ feitos: Math.min(feitos, alvo.quantidade), total: alvo.quantidade })
        if (data.concluido) break
        if (!cursor) break
        if (JSON.stringify(cursor) === cursorAnterior && enfileiradosRodada === 0) break
      }
      toast.success(
        feitos > 0
          ? `${feitos.toLocaleString("pt-BR")} aviso(s) entraram na fila. Quem já recebeu não é reenviado.`
          : "Nenhum aviso novo entrou na fila. Quem já recebeu ou já estava na fila foi mantido."
      )
      void carregar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enfileirar os avisos")
    } finally {
      setProgressoEnvio(null)
    }
  }

  function escolherPeriodo(proximo: PeriodoPreset) {
    setPreset(proximo)
    setPage(1)
    if (proximo === "custom") return
    const intervalo = intervaloPreset(proximo)
    setDe(intervalo.de)
    setAte(intervalo.ate)
  }

  const carregar = useCallback(async () => {
    const pedido = ++pedidoRef.current
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        administradora_id: administradoraId,
        de,
        ate,
        page: String(page),
        limit: "25",
        modo_data: modoData,
      })
      if (eventType) qs.set("event_type", eventType)
      if (status) qs.set("status", status)

      const qsCobertura = new URLSearchParams({
        administradora_id: administradoraId,
        de,
        ate,
      })

      const [res, resCobertura] = await Promise.all([
        fetch(`/api/administradora/whatsapp/relatorio?${qs}`, { cache: "no-store" }),
        fetch(`/api/administradora/whatsapp/cobertura?${qsCobertura}`, { cache: "no-store" }),
      ])
      const data = await res.json()
      if (pedido !== pedidoRef.current) return
      if (!res.ok) throw new Error(data.error || "Erro ao carregar relatório")

      const dataCobertura = await resCobertura.json()
      if (pedido !== pedidoRef.current) return
      if (resCobertura.ok) {
        setCoberturaResumo(dataCobertura.resumo || null)
        setCoberturaEventos(dataCobertura.por_evento_dia || [])
        setErrosPorTelefone(dataCobertura.erros_por_telefone || [])
      }

      setResumo(data.resumo || null)
      setFalhasResumo(data.falhas_resumo || null)
      setErrosFrequentes(data.erros_frequentes || [])
      setFalhasRecentes(data.falhas_recentes || [])
      setMensagens(data.mensagens || [])
      setTotalPages(data.total_pages || 1)
    } catch (e) {
      if (pedido === pedidoRef.current) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar relatório")
      }
    } finally {
      if (pedido === pedidoRef.current) setLoading(false)
    }
  }, [administradoraId, de, ate, modoData, eventType, status, page])

  useEffect(() => {
    void carregar()
  }, [carregar])

  function aplicarFiltro() {
    if (page !== 1) {
      setPage(1)
    } else {
      void carregar()
    }
  }

  function filtrarSoFalhas() {
    setStatus("__falhas__")
    if (page !== 1) setPage(1)
  }

  const STATUS_FALHA = new Set(["failed", "failed_permanent", "undelivered"])

  const taxaSucesso =
    resumo && resumo.total > 0 ? Math.round((resumo.sucesso / resumo.total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Relatório de envios WhatsApp</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatarPeriodo(de, ate)} · quantas faturas da base receberam cada aviso
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(btnSquare, "border-slate-300 hover:bg-slate-100 hover:text-slate-900")}
            disabled={loading}
            onClick={() => void carregar()}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Atualizando…
              </>
            ) : (
              "Atualizar"
            )}
          </Button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Período</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["hoje", "Hoje"],
                ["semana", "Esta semana"],
                ["mes", "Este mês"],
                ["custom", "Selecionar período"],
              ] as const
            ).map(([valor, rotulo]) => (
              <Button
                key={valor}
                type="button"
                size="sm"
                variant={preset === valor ? "default" : "outline"}
                className={cn(
                  btnSquare,
                  "h-9",
                  preset === valor
                    ? "bg-[#0F172A] text-white hover:bg-[#1E293B]"
                    : "border-slate-300"
                )}
                onClick={() => escolherPeriodo(valor)}
              >
                {rotulo}
              </Button>
            ))}
          </div>
          {preset === "custom" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="rel-de" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  De
                </Label>
                <Input
                  id="rel-de"
                  type="date"
                  className={cn(btnSquare, "h-10 w-full sm:w-44")}
                  value={de}
                  onChange={(e) => setDe(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-ate" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Até
                </Label>
                <Input
                  id="rel-ate"
                  type="date"
                  className={cn(btnSquare, "h-10 w-full sm:w-44")}
                  value={ate}
                  onChange={(e) => setAte(e.target.value)}
                />
              </div>
              <Button
                type="button"
                className={cn(btnSquare, "h-10 bg-[#0F172A] text-white hover:bg-[#1E293B]")}
                disabled={loading}
                onClick={() => aplicarFiltro()}
              >
                Aplicar período
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {progressoEnvio ? (
        <div className="rounded-sm border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">Colocando avisos na fila</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {numero(progressoEnvio.feitos)} de {numero(progressoEnvio.total)}. Quem já recebeu não entra de novo.
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-slate-200">
            <div
              className="h-full bg-slate-900 transition-all"
              style={{
                width: `${Math.min(100, Math.round((progressoEnvio.feitos / Math.max(progressoEnvio.total, 1)) * 100))}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {loading && !resumo ? (
        <div className="rounded-sm border border-slate-200 bg-white shadow-sm flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando relatório…
        </div>
      ) : (
        <>
          {coberturaResumo ? (
            <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                <h3 className="text-sm font-semibold text-slate-800">A base recebeu os avisos?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {numero(coberturaResumo.enviados_ok_total)} de {numero(coberturaResumo.elegiveis_total)} avisos
                  previstos foram entregues ({coberturaResumo.cobertura_pct}%).{" "}
                  {numero(coberturaResumo.falhas_total)} falharam e{" "}
                  {numero(coberturaResumo.nunca_tentados_total)} ainda não foram enviados.
                </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className={cn(btnSquare, "h-9 shrink-0 bg-[#0F172A] text-white hover:bg-[#1E293B]")}
                  disabled={loading || Boolean(progressoEnvio) || faltantesPeriodo <= 0}
                  onClick={() =>
                    setConfirmacaoEnvio({
                      rotulo: "todos os avisos deste período",
                      quantidade: faltantesPeriodo,
                    })
                  }
                >
                  Enviar falhas e sem envio
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
                {[
                  { label: "Base prevista", value: numero(coberturaResumo.elegiveis_total), hint: "Faturas que deveriam receber" },
                  { label: "Enviadas", value: numero(coberturaResumo.enviados_ok_total), hint: "Chegaram ao cliente" },
                  { label: "Falhas", value: numero(coberturaResumo.falhas_total), hint: "Tentativa não entregue" },
                  { label: "Sem envio", value: numero(coberturaResumo.nunca_tentados_total), hint: "Ainda não houve tentativa" },
                  { label: "Receberam", value: `${coberturaResumo.cobertura_pct}%`, hint: "Enviadas sobre a base" },
                ].map((card) => (
                  <div key={card.label} className="rounded-sm border border-slate-200 bg-slate-50/60 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{card.value}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{card.hint}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Evento</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Base</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Enviadas</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Falhas</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Na fila</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Sem envio</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Receberam</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Envio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {porEventoBase.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                          Nenhuma fatura em aberto precisava de aviso neste período.
                        </td>
                      </tr>
                    ) : (
                      porEventoBase.map((row, idx) => {
                        const total = Math.max(row.elegiveis, 1)
                        return (
                          <tr key={row.event_type} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="px-4 py-2.5 text-slate-800">
                              <p>{row.event_label}</p>
                              <div className="mt-1.5 flex h-1.5 w-full max-w-[10rem] overflow-hidden rounded-sm bg-slate-200">
                                <div className="bg-emerald-600" style={{ width: `${(row.enviados_ok / total) * 100}%` }} />
                                <div className="bg-red-500" style={{ width: `${(row.falhas / total) * 100}%` }} />
                                <div className="bg-amber-400" style={{ width: `${(row.nunca_tentados / total) * 100}%` }} />
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">{numero(row.elegiveis)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{numero(row.enviados_ok)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-red-700">{numero(row.falhas)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{numero(row.pendentes_fila)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-amber-700">{numero(row.nunca_tentados)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900">{row.cobertura_pct}%</td>
                            <td className="px-4 py-2.5 text-right">
                              {row.falhas + row.nunca_tentados > 0 ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className={cn(btnSquare, "h-8 border-slate-300 text-xs")}
                                  disabled={Boolean(progressoEnvio)}
                                  onClick={() =>
                                    setConfirmacaoEnvio({
                                      eventType: row.event_type,
                                      rotulo: row.event_label,
                                      quantidade: row.falhas + row.nunca_tentados,
                                    })
                                  }
                                >
                                  Enviar {numero(row.falhas + row.nunca_tentados)}
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400">Em dia</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                Sem envio é a fatura da base para a qual o sistema ainda não tentou mandar a mensagem. A coluna que
                antes aparecia como “Nunca” era esse número.
              </p>
              {coberturaEventos.length > 0 ? (
                <Collapsible open={detalheDiaAberto} onOpenChange={setDetalheDiaAberto}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Ver o mesmo controle separado por dia
                      <ChevronDown className={cn("h-4 w-4 transition-transform", detalheDiaAberto && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/90">
                            <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-slate-600">Dia do aviso</th>
                            <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-slate-600">Evento</th>
                            <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-slate-600">Vencimento</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase text-slate-600">Base</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase text-slate-600">Enviadas</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase text-slate-600">Falhas</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase text-slate-600">Sem envio</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase text-slate-600">Receberam</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {coberturaEventos.map((row) => (
                            <tr key={`${row.reference_date}-${row.event_type}`}>
                              <td className="px-4 py-2 text-xs text-slate-600">{formatarData(row.reference_date)}</td>
                              <td className="px-4 py-2 text-slate-700">{row.event_label}</td>
                              <td className="px-4 py-2 text-xs text-slate-500">{formatarData(row.vencimento_alvo)}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{numero(row.elegiveis)}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{numero(row.enviados_ok)}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-red-700">{numero(row.falhas)}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-amber-700">{numero(row.nunca_tentados)}</td>
                              <td className="px-4 py-2 text-right tabular-nums font-medium">{row.cobertura_pct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}
            </div>
          ) : null}

          {errosPorTelefone.length > 0 ? (
            <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 bg-slate-50/80">
                <h3 className="text-sm font-semibold text-slate-800">Telefones com mais falhas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90">
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-slate-600">
                        Telefone
                      </th>
                      <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase text-slate-600">
                        Falhas
                      </th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-slate-600">
                        Motivo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {errosPorTelefone.map((row) => (
                      <tr key={row.telefone_mascara}>
                        <td className="px-4 py-2 tabular-nums text-slate-700">{row.telefone_mascara}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.total_falhas}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">
                          {row.titulo_erro}
                          {row.error_code ? ` (cód. ${row.error_code})` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {resumo ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Total de envios", value: resumo.total, hint: "Mensagens registradas, com reenvios" },
                {
                  label: "Sucesso",
                  value: resumo.sucesso,
                  hint: `${taxaSucesso}% do total`,
                },
                { label: "Falhas", value: resumo.falha, hint: "Não entregues ou erro" },
                { label: "Pendentes", value: resumo.pendente, hint: "Na fila ou aguardando" },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{card.value}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{card.hint}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 bg-slate-50/80 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Detalhamento de envios</h3>
            {resumo && resumo.falha > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(btnSquare, "border-slate-300 text-xs h-8")}
                onClick={() => filtrarSoFalhas()}
              >
                Ver só falhas
              </Button>
            ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                aria-label="Contar o detalhe por"
                className={cn(btnSquare, "h-10 w-full border border-slate-300 bg-white px-3 text-sm")}
                value={modoData}
                onChange={(e) => setModoData(e.target.value as "created_at" | "reference_date")}
              >
                <option value="reference_date">Pelo dia do aviso</option>
                <option value="created_at">Pela data em que foi registrado</option>
              </select>
              <select
                aria-label="Evento"
                className={cn(btnSquare, "h-10 w-full border border-slate-300 bg-white px-3 text-sm")}
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="">Todos os eventos</option>
                <option value="lembrete_d5">Lembrete D-5</option>
                <option value="aviso_d1">Aviso véspera (D-1)</option>
                <option value="aviso_d0">Aviso no vencimento (D0)</option>
                <option value="cobranca_d3">Cobrança D+3</option>
                <option value="cobranca_d7">Cobrança D+7</option>
                <option value="cobranca_d15">Cobrança D+15</option>
                <option value="cobranca_d25">Cobrança D+25</option>
                <option value="saudacao_boas_vindas">Saudação</option>
                <option value="primeiro_boleto_gerado">Primeiro boleto</option>
                <option value="confirmacao_pagamento">Confirmação de pagamento</option>
              </select>
              <select
                aria-label="Status"
                className={cn(btnSquare, "h-10 w-full border border-slate-300 bg-white px-3 text-sm")}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="__falhas__">Todas as falhas</option>
                <option value="sent">Enviado</option>
                <option value="delivered">Entregue</option>
                <option value="read">Lido</option>
                <option value="failed">Falhou</option>
                <option value="failed_permanent">Falha permanente</option>
                <option value="queued">Na fila</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          </div>
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
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mensagens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      Nenhum envio encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  mensagens.map((m, idx) => (
                    <tr key={m.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 text-slate-600 text-xs whitespace-nowrap tabular-nums">
                        {formatarDataHora(m.sent_at || m.failed_at || m.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{m.cliente_nome || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{m.event_label}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs tabular-nums">{m.telefone_mascara}</td>
                      <td className="px-4 py-2.5">
                        <StatusEnvioWhatsApp
                          status={m.status}
                          title={m.error_message || m.titulo_erro || undefined}
                        />
                      </td>
                      <td className="px-4 py-2.5 max-w-[220px]">
                        {STATUS_FALHA.has(m.status) ? (
                          <div>
                            <p className="text-xs text-slate-800">{m.titulo_erro || "Sem motivo"}</p>
                            {m.error_code ? (
                              <p className="text-[11px] text-slate-500 tabular-nums">Cód. {m.error_code}</p>
                            ) : null}
                            {m.error_message && m.error_message !== m.titulo_erro ? (
                              <p className="text-[11px] text-slate-500 line-clamp-2" title={m.error_message}>
                                {m.error_message}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

          {(resumo?.falha ?? 0) > 0 || errosFrequentes.length > 0 || falhasRecentes.length > 0 ? (
            <Collapsible open={analiseErrosAberta} onOpenChange={setAnaliseErrosAberta}>
              <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left bg-slate-50/80 border-b border-slate-100 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800">Análise de erros</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {resumo?.falha ?? 0} falha{(resumo?.falha ?? 0) !== 1 ? "s" : ""} no período
                        {errosFrequentes.length > 0
                          ? ` · ${errosFrequentes.length} tipo${errosFrequentes.length !== 1 ? "s" : ""} de erro`
                          : ""}
                        {falhasResumo && falhasResumo.total > 0
                          ? ` · ${falhasResumo.com_motivo} com motivo`
                          : ""}
                        {!analiseErrosAberta ? " · clique para expandir" : ""}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                        analiseErrosAberta && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-b border-slate-100">
                    <div className="px-5 py-2.5 bg-white border-b border-slate-100">
                      <h4 className="text-xs font-semibold text-slate-700">Erros mais frequentes</h4>
                      {falhasResumo && falhasResumo.total > 0 ? (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {falhasResumo.com_motivo} com motivo · {falhasResumo.sem_motivo} sem motivo
                          detalhado
                        </p>
                      ) : null}
                    </div>
                    {errosFrequentes.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-slate-500 text-center">
                        Nenhum erro classificado no período.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/90">
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Motivo
                              </th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Código
                              </th>
                              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Qtd
                              </th>
                              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                % falhas
                              </th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Eventos
                              </th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Última
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {errosFrequentes.map((e, idx) => (
                              <tr
                                key={e.chave}
                                className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                              >
                                <td className="px-4 py-2 max-w-xs">
                                  <p className="text-xs font-medium text-slate-800">{e.titulo}</p>
                                  {e.mensagem !== e.titulo ? (
                                    <p
                                      className="text-[11px] text-slate-500 mt-0.5 line-clamp-2"
                                      title={e.mensagem}
                                    >
                                      {e.mensagem}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-4 py-2 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                                  {e.error_code || "—"}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums text-slate-800 font-medium">
                                  {e.qtd}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                                  {e.pct_falhas}%
                                </td>
                                <td className="px-4 py-2 text-xs text-slate-600">
                                  {e.eventos.length === 0
                                    ? "—"
                                    : e.eventos
                                        .map((ev) => `${ev.event_label} (${ev.qtd})`)
                                        .join(", ")}
                                </td>
                                <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                                  {formatarDataHora(e.ultima_ocorrencia)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {falhasRecentes.length > 0 ? (
                    <div>
                      <div className="px-5 py-2.5 bg-white border-b border-slate-100">
                        <h4 className="text-xs font-semibold text-slate-700">Últimas falhas</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Amostra recente para investigação rápida
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/90">
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Quando
                              </th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Cliente
                              </th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Evento
                              </th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Motivo
                              </th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                Código
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {falhasRecentes.map((f, idx) => (
                              <tr
                                key={f.id || `${f.created_at}-${idx}`}
                                className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                              >
                                <td className="px-4 py-2 text-xs text-slate-600 whitespace-nowrap tabular-nums">
                                  {formatarDataHora(f.failed_at || f.created_at)}
                                </td>
                                <td className="px-4 py-2 text-slate-800 text-xs">{f.cliente_nome || "—"}</td>
                                <td className="px-4 py-2 text-slate-600 text-xs">{f.event_label}</td>
                                <td className="px-4 py-2 max-w-xs">
                                  <p className="text-xs text-slate-800">{f.titulo_erro}</p>
                                  {f.mensagem !== f.titulo_erro ? (
                                    <p
                                      className="text-[11px] text-slate-500 line-clamp-1"
                                      title={f.mensagem}
                                    >
                                      {f.mensagem}
                                    </p>
                                  ) : null}
                                </td>
                                <td className="px-4 py-2 text-xs text-slate-600 tabular-nums">
                                  {f.error_code || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </CollapsibleContent>
              </div>
            </Collapsible>
          ) : null}
        </>
      )}

      <Dialog open={Boolean(confirmacaoEnvio)} onOpenChange={(aberto) => !aberto && setConfirmacaoEnvio(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar o que ainda não chegou</DialogTitle>
            <DialogDescription>
              {confirmacaoEnvio
                ? `${numero(confirmacaoEnvio.quantidade)} faturas de ${confirmacaoEnvio.rotulo} vão para a fila: as que falharam e as que nem chegaram a ser tentadas. Quem já recebeu o aviso fica de fora.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className={cn(btnSquare, "border-slate-300")}
              onClick={() => setConfirmacaoEnvio(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className={cn(btnSquare, "bg-[#0F172A] text-white hover:bg-[#1E293B]")}
              onClick={() => {
                if (!confirmacaoEnvio) return
                void enviarFaltantes(confirmacaoEnvio)
              }}
            >
              Colocar na fila
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
