"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

type PorEvento = {
  event_type: string
  event_label: string
  total: number
  sucesso: number
  falha: number
}

type ErroFrequente = { mensagem: string; qtd: number }

type MensagemRow = {
  id: string
  cliente_nome: string | null
  event_label: string
  telefone_mascara: string
  status: string
  reference_date: string
  created_at: string
  error_message: string | null
}

const btnSquare = "rounded-sm"

type Props = {
  administradoraId: string
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10)
}

function inicioMesIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
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
  const [de, setDe] = useState(inicioMesIso)
  const [ate, setAte] = useState(hojeIso)
  const [eventType, setEventType] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [porEvento, setPorEvento] = useState<PorEvento[]>([])
  const [errosFrequentes, setErrosFrequentes] = useState<ErroFrequente[]>([])
  const [mensagens, setMensagens] = useState<MensagemRow[]>([])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        administradora_id: administradoraId,
        de,
        ate,
        page: String(page),
        limit: "25",
      })
      if (eventType) qs.set("event_type", eventType)
      if (status) qs.set("status", status)

      const res = await fetch(`/api/administradora/whatsapp/relatorio?${qs}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar relatório")

      setResumo(data.resumo || null)
      setPorEvento(data.por_evento || [])
      setErrosFrequentes(data.erros_frequentes || [])
      setMensagens(data.mensagens || [])
      setTotalPages(data.total_pages || 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar relatório")
    } finally {
      setLoading(false)
    }
  }, [administradoraId, de, ate, eventType, status, page])

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
              Período selecionado: {formatarPeriodo(de, ate)}
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

        {/* Filtros */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-3">Filtros</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="rel-de" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                De
              </Label>
              <Input
                id="rel-de"
                type="date"
                className={cn(btnSquare, "h-10 w-full")}
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
                className={cn(btnSquare, "h-10 w-full")}
                value={ate}
                onChange={(e) => setAte(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rel-evento" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Evento
              </Label>
              <select
                id="rel-evento"
                className={cn(btnSquare, "h-10 w-full border border-slate-300 bg-white px-3 text-sm")}
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="">Todos os eventos</option>
                <option value="lembrete_d5">Lembrete D-5</option>
                <option value="aviso_d1">Aviso D-1</option>
                <option value="aviso_d0">Aviso D0</option>
                <option value="cobranca_d3">Cobrança D+3</option>
                <option value="cobranca_d7">Cobrança D+7</option>
                <option value="cobranca_d15">Cobrança D+15</option>
                <option value="cobranca_d25">Cobrança D+25</option>
                <option value="saudacao_boas_vindas">Saudação</option>
                <option value="primeiro_boleto_gerado">Primeiro boleto</option>
                <option value="confirmacao_pagamento">Confirmação pagamento</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rel-status" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Status
              </Label>
              <select
                id="rel-status"
                className={cn(btnSquare, "h-10 w-full border border-slate-300 bg-white px-3 text-sm")}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="sent">Enviado</option>
                <option value="delivered">Entregue</option>
                <option value="read">Lido</option>
                <option value="failed">Falhou</option>
                <option value="failed_permanent">Falha permanente</option>
                <option value="queued">Na fila</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
            <Button
              type="button"
              className={cn(btnSquare, "h-10 w-full lg:w-auto bg-[#0F172A] hover:bg-[#1E293B] text-white")}
              disabled={loading}
              onClick={() => aplicarFiltro()}
            >
              Aplicar filtro
            </Button>
          </div>
        </div>
      </div>

      {loading && !resumo ? (
        <div className="rounded-sm border border-slate-200 bg-white shadow-sm flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando relatório…
        </div>
      ) : (
        <>
          {resumo ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Total de envios", value: resumo.total, hint: "No período filtrado" },
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

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 bg-slate-50/80">
                <h3 className="text-sm font-semibold text-slate-800">Por evento</h3>
              </div>
              {porEvento.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-500 text-center">Nenhum envio no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/90">
                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          Evento
                        </th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          Total
                        </th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          OK
                        </th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          Falha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {porEvento.map((e, idx) => (
                        <tr key={e.event_type} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="px-4 py-2.5 text-slate-700">{e.event_label}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">{e.total}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">{e.sucesso}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">{e.falha}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 bg-slate-50/80">
                <h3 className="text-sm font-semibold text-slate-800">Erros mais frequentes</h3>
              </div>
              {errosFrequentes.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-500 text-center">Nenhum erro no período.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {errosFrequentes.map((e) => (
                    <li key={e.mensagem} className="px-5 py-3 flex items-start justify-between gap-3">
                      <span className="text-xs text-slate-700 leading-relaxed">{e.mensagem}</span>
                      <span className="text-xs font-semibold text-slate-800 tabular-nums shrink-0">{e.qtd}x</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 bg-slate-50/80">
            <h3 className="text-sm font-semibold text-slate-800">Detalhamento de envios</h3>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mensagens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      Nenhum envio encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  mensagens.map((m, idx) => (
                    <tr key={m.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 text-slate-600 text-xs whitespace-nowrap tabular-nums">
                        {formatarDataHora(m.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{m.cliente_nome || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{m.event_label}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs tabular-nums">{m.telefone_mascara}</td>
                      <td className="px-4 py-2.5">
                        <StatusEnvioWhatsApp status={m.status} title={m.error_message || undefined} />
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
        </>
      )}
    </div>
  )
}
