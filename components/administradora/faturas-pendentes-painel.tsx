"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ExternalLink, FileDown, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import {
  montarMensagemCobrancaFatura,
  montarUrlWhatsAppCobranca,
  normalizarTelefoneWhatsApp,
} from "@/lib/whatsapp-cobranca"
import {
  COBRANCA_ENVIADA_TTL_MS,
  carregarEnviosRecentes,
  filtrarEnviosAtivos,
  minutosRestantesVisibilidade,
  registrarEnvioCobranca,
  rotuloEnvioRecente,
  type RegistroEnvioCobranca,
} from "@/lib/cobrancas-envio-recente"

export type PendenciaFaturaItem = {
  fatura_id: string
  cliente_administradora_id?: string | null
  cliente_nome: string
  cliente_telefone?: string | null
  vencimento: string
  status: string
  corretora: string
  link_boleto: string | null
  financeira_id?: string | null
  financeira_nome?: string | null
  valor?: number | null
  numero_fatura?: string | null
  boletos_atrasados_total?: number
  segmento_atraso?: "um_boleto_novo" | "um_boleto_antigo" | "dois_ou_mais" | null
  cancelado_inadimplencia?: boolean
}

export type FinanceiraOpcaoPainel = { id: string; nome: string }

export type FiltroPendencias =
  | "todos"
  | "um_boleto_novo"
  | "um_boleto_antigo"
  | "dois_ou_mais"
  | "cancelados_quitacao"

function slugArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48)
}

export function rotuloFiltroPendencias(f: FiltroPendencias) {
  if (f === "um_boleto_novo") return "1 boleto em aberto (novos)"
  if (f === "um_boleto_antigo") return "1 boleto em aberto (antigos)"
  if (f === "dois_ou_mais") return "2 ou mais boletos"
  if (f === "cancelados_quitacao") return "Cancelados — quitação pendente"
  return "Todos do período"
}

function rotuloSegmentoAtraso(item: PendenciaFaturaItem) {
  if (item.segmento_atraso === "dois_ou_mais") return "2+ boletos"
  if (item.segmento_atraso === "um_boleto_novo") return "1 boleto (novo)"
  if (item.segmento_atraso === "um_boleto_antigo") return "1 boleto (antigo)"
  return "—"
}

function eDoisOuMaisSemCanceladoQuitacao(item: PendenciaFaturaItem) {
  return item.segmento_atraso === "dois_ou_mais" && item.cancelado_inadimplencia !== true
}

function rotuloStatus(status: string) {
  const s = String(status || "").toLowerCase()
  if (s === "vencida") return "Vencida"
  if (s === "atrasada") return "Atrasada"
  if (s === "pendente") return "Pendente"
  return status || "—"
}

function corPontoStatus(status: string) {
  const s = String(status || "").toLowerCase()
  if (s === "vencida") return "bg-rose-500"
  if (s === "atrasada") return "bg-amber-500"
  if (s === "pendente") return "bg-sky-500"
  return "bg-slate-400"
}

const btnSquare = "rounded-sm"

type FaturasPendentesPainelProps = {
  pendencias: PendenciaFaturaItem[]
  financeiraId?: string
  financeiras?: FinanceiraOpcaoPainel[]
  periodoLabel: string
  /** Exibe coluna e botão de envio via WhatsApp (wa.me). */
  mostrarEnvioWhatsApp?: boolean
  /** Usado para persistir envios recentes na sessão (página Cobranças). */
  administradoraId?: string
  exportPrefix?: string
}

export function FaturasPendentesPainel({
  pendencias,
  financeiraId,
  financeiras = [],
  periodoLabel,
  mostrarEnvioWhatsApp = false,
  administradoraId,
  exportPrefix = "faturas-pendentes",
}: FaturasPendentesPainelProps) {
  const [paginaPendencias, setPaginaPendencias] = useState(1)
  const [filtroPendencias, setFiltroPendencias] = useState<FiltroPendencias>("todos")
  const [filtroFinanceiraPainel, setFiltroFinanceiraPainel] = useState("")
  const [exportandoPdf, setExportandoPdf] = useState(false)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [agoraUi, setAgoraUi] = useState(() => Date.now())
  const [enviosRecentes, setEnviosRecentes] = useState<RegistroEnvioCobranca[]>([])

  const ttlMinutos = Math.round(COBRANCA_ENVIADA_TTL_MS / 60_000)
  const enviosPorFaturaId = useMemo(
    () => new Map(enviosRecentes.map((e) => [e.fatura_id, e])),
    [enviosRecentes]
  )

  const mostrarFiltroFinanceira = !financeiraId?.trim() && financeiras.length > 1
  const mostrarColunaFinanceira = mostrarEnvioWhatsApp || mostrarFiltroFinanceira

  useEffect(() => {
    setPaginaPendencias(1)
  }, [filtroPendencias, filtroFinanceiraPainel, pendencias.length])

  useEffect(() => {
    if (financeiraId?.trim()) setFiltroFinanceiraPainel("")
  }, [financeiraId])

  useEffect(() => {
    if (!mostrarEnvioWhatsApp || !administradoraId?.trim()) {
      setEnviosRecentes([])
      return
    }
    setEnviosRecentes(carregarEnviosRecentes(administradoraId))
  }, [administradoraId, mostrarEnvioWhatsApp])

  useEffect(() => {
    if (!mostrarEnvioWhatsApp || enviosRecentes.length === 0) return
    const id = window.setInterval(() => {
      setAgoraUi(Date.now())
      setEnviosRecentes((atual) => {
        const filtrado = filtrarEnviosAtivos(atual)
        return filtrado.length === atual.length ? atual : filtrado
      })
    }, 30_000)
    return () => window.clearInterval(id)
  }, [enviosRecentes.length, mostrarEnvioWhatsApp])

  const marcarEnvioRecente = useCallback(
    (item: PendenciaFaturaItem) => {
      if (!administradoraId?.trim()) return
      setEnviosRecentes((atual) =>
        registrarEnvioCobranca(administradoraId, {
          fatura_id: item.fatura_id,
          cliente_nome: item.cliente_nome,
        }, atual)
      )
    },
    [administradoraId]
  )

  const pendenciasPorFinanceira = useMemo(() => {
    if (!filtroFinanceiraPainel.trim()) return pendencias
    const alvo = filtroFinanceiraPainel.trim()
    if (alvo === "__sem_financeira__") {
      return pendencias.filter((item) => !String(item.financeira_nome || "").trim())
    }
    return pendencias.filter((item) => {
      const id = String(item.financeira_id || "").trim()
      if (id && id === alvo) return true
      const fin = financeiras.find((f) => f.id === alvo)
      if (!fin) return false
      const nomeItem = String(item.financeira_nome || "").trim().toLowerCase()
      const nomeFin = String(fin.nome || "").trim().toLowerCase()
      return !!nomeItem && !!nomeFin && (nomeItem === nomeFin || nomeItem.includes(nomeFin))
    })
  }, [pendencias, filtroFinanceiraPainel, financeiras])

  const pendenciasFiltradas = useMemo(() => {
    const base = pendenciasPorFinanceira
    if (filtroPendencias === "todos") return base
    return base.filter((item) => {
      if (item.status !== "atrasada") return false
      if (filtroPendencias === "um_boleto_novo") return item.segmento_atraso === "um_boleto_novo"
      if (filtroPendencias === "um_boleto_antigo") return item.segmento_atraso === "um_boleto_antigo"
      if (filtroPendencias === "dois_ou_mais") return eDoisOuMaisSemCanceladoQuitacao(item)
      if (filtroPendencias === "cancelados_quitacao") return item.cancelado_inadimplencia === true
      return true
    })
  }, [pendenciasPorFinanceira, filtroPendencias])

  const filtrosFinanceiraPainel = useMemo(() => {
    if (!mostrarFiltroFinanceira) return []
    const contagem = new Map<string, number>()
    for (const fin of financeiras) contagem.set(fin.id, 0)
    let semFinanceira = 0
    for (const item of pendencias) {
      const id = String(item.financeira_id || "").trim()
      if (id && contagem.has(id)) {
        contagem.set(id, (contagem.get(id) || 0) + 1)
        continue
      }
      const nome = String(item.financeira_nome || "").trim().toLowerCase()
      const fin = financeiras.find((f) => String(f.nome || "").trim().toLowerCase() === nome)
      if (fin) {
        contagem.set(fin.id, (contagem.get(fin.id) || 0) + 1)
      } else if (!nome) {
        semFinanceira += 1
      }
    }
    const tabs: { id: string; label: string; count: number }[] = [
      { id: "", label: "Todas as financeiras", count: pendencias.length },
      ...financeiras.map((f) => ({
        id: f.id,
        label: f.nome,
        count: contagem.get(f.id) || 0,
      })),
    ]
    if (semFinanceira > 0) {
      tabs.push({ id: "__sem_financeira__", label: "Sem financeira", count: semFinanceira })
    }
    return tabs
  }, [financeiras, mostrarFiltroFinanceira, pendencias])

  const filtrosPendencias: { id: FiltroPendencias; label: string; count: number }[] = useMemo(() => {
    const atrasadas = pendenciasPorFinanceira.filter((p) => p.status === "atrasada")
    return [
      { id: "todos" as const, label: "Todos do período", count: pendenciasPorFinanceira.length },
      {
        id: "um_boleto_novo" as const,
        label: "1 boleto em aberto (novos)",
        count: atrasadas.filter((p) => p.segmento_atraso === "um_boleto_novo").length,
      },
      {
        id: "um_boleto_antigo" as const,
        label: "1 boleto em aberto (antigos)",
        count: atrasadas.filter((p) => p.segmento_atraso === "um_boleto_antigo").length,
      },
      {
        id: "dois_ou_mais" as const,
        label: "2+ boletos em aberto",
        count: atrasadas.filter((p) => eDoisOuMaisSemCanceladoQuitacao(p)).length,
      },
      {
        id: "cancelados_quitacao" as const,
        label: "Cancelados — quitação",
        count: atrasadas.filter((p) => p.cancelado_inadimplencia).length,
      },
    ]
  }, [pendenciasPorFinanceira])

  const itensPorPagina = 10
  const totalPaginas = Math.max(1, Math.ceil(pendenciasFiltradas.length / itensPorPagina))
  const paginaAtual = Math.min(paginaPendencias, totalPaginas)
  const pendenciasPaginadas = pendenciasFiltradas.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  )

  function enviarWhatsApp(item: PendenciaFaturaItem) {
    if (!item.link_boleto) {
      toast.error("Esta fatura não possui link de boleto.")
      return
    }
    const tel = normalizarTelefoneWhatsApp(item.cliente_telefone)
    if (!tel) {
      toast.error("Telefone do cliente não cadastrado ou inválido. Atualize o cadastro do titular.")
      return
    }
    const financeiraNome =
      String(item.financeira_nome || "").trim() ||
      (financeiraId ? financeiras.find((f) => f.id === financeiraId)?.nome : null) ||
      null
    const mensagem = montarMensagemCobrancaFatura({
      clienteNome: item.cliente_nome,
      vencimento: item.vencimento,
      valor: item.valor,
      numeroFatura: item.numero_fatura,
      linkBoleto: item.link_boleto,
      financeiraNome,
    })
    const url = montarUrlWhatsAppCobranca(item.cliente_telefone, mensagem)
    if (!url) {
      toast.error("Não foi possível montar o link do WhatsApp.")
      return
    }
    window.open(url, "_blank", "noopener,noreferrer")
    marcarEnvioRecente(item)
    toast.success(`Envio registrado para ${item.cliente_nome}. Visível na lista por ${ttlMinutos} min.`)
  }

  function exportarExcel() {
    if (pendenciasFiltradas.length === 0) {
      toast.error("Não há registros no filtro atual para exportar")
      return
    }
    try {
      setExportandoExcel(true)
      const headers = [
        "Nº",
        "Cliente",
        "Telefone",
        ...(mostrarColunaFinanceira ? ["Financeira"] : []),
        "Vencimento",
        "Status",
        "Valor",
        "Boletos em aberto",
        "Segmento",
        "Cancelado inadimpl.",
        "Corretora",
        "Link boleto",
      ]
      const wsData: (string | number)[][] = [
        ["Período", periodoLabel],
        ["Filtro", rotuloFiltroPendencias(filtroPendencias)],
        [],
        headers,
        ...pendenciasFiltradas.map((item, i) => [
          i + 1,
          item.cliente_nome,
          item.cliente_telefone || "",
          ...(mostrarColunaFinanceira ? [item.financeira_nome || ""] : []),
          item.vencimento ? formatarData(item.vencimento) : "",
          rotuloStatus(item.status),
          item.valor != null ? formatarMoeda(Number(item.valor)) : "",
          item.boletos_atrasados_total ?? "",
          item.status === "atrasada" ? rotuloSegmentoAtraso(item) : "",
          item.cancelado_inadimplencia ? "Sim" : "Não",
          item.corretora || "",
          item.link_boleto || "",
        ]),
      ]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Pendencias")
      XLSX.writeFile(
        wb,
        `${exportPrefix}-${periodoLabel.replace("/", "-")}-${slugArquivo(rotuloFiltroPendencias(filtroPendencias))}.xlsx`
      )
      toast.success("Excel exportado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar Excel")
    } finally {
      setExportandoExcel(false)
    }
  }

  async function exportarPdf() {
    if (pendenciasFiltradas.length === 0) {
      toast.error("Não há registros no filtro atual para exportar")
      return
    }
    try {
      setExportandoPdf(true)
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margin = 10
      let y = 15
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text("Faturas atrasadas e pendentes", margin, y)
      y += 6
      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      doc.text(`Período: ${periodoLabel} · Filtro: ${rotuloFiltroPendencias(filtroPendencias)}`, margin, y)
      y += 8
      const headers = ["Nº", "Cliente", "Venc.", "Status", "Boletos", "Segmento", "Corretora"]
      const colWidths = [10, 58, 22, 22, 16, 28, 38]
      doc.setFont(undefined, "bold")
      let x = margin
      headers.forEach((h, i) => {
        doc.text(h, x, y)
        x += colWidths[i]
      })
      y += 5
      doc.setFont(undefined, "normal")
      const rowHeight = 6
      const totalWidth = colWidths.reduce((a, b) => a + b, 0)
      pendenciasFiltradas.forEach((item, index) => {
        if (y > 185) {
          doc.addPage("landscape", "a4")
          y = 15
        }
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, y - 4, totalWidth, rowHeight, "F")
        }
        x = margin
        const cells = [
          String(index + 1),
          item.cliente_nome,
          item.vencimento ? formatarData(item.vencimento) : "—",
          rotuloStatus(item.status),
          item.boletos_atrasados_total != null ? String(item.boletos_atrasados_total) : "—",
          item.status === "atrasada" ? rotuloSegmentoAtraso(item) : "—",
          item.corretora || "—",
        ]
        cells.forEach((cell, i) => {
          doc.text(doc.splitTextToSize(cell, colWidths[i] - 2)[0] || cell.slice(0, 30), x, y)
          x += colWidths[i]
        })
        y += rowHeight
      })
      doc.save(
        `${exportPrefix}-${periodoLabel.replace("/", "-")}-${slugArquivo(rotuloFiltroPendencias(filtroPendencias))}.pdf`
      )
      toast.success("PDF exportado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF")
    } finally {
      setExportandoPdf(false)
    }
  }

  const colSpanBase = (mostrarEnvioWhatsApp ? 7 : 6) + (mostrarColunaFinanceira ? 1 : 0)

  return (
    <div className="rounded-sm border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
          Faturas atrasadas e pendentes
        </h2>
        <p className="text-xs text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
          Faturas com status pendente, vencida ou atrasada e{" "}
          <span className="font-medium text-slate-600">data de vencimento no período</span> selecionado (mês/ano).
          Corretora conforme vínculo na vida importada.
          {financeiraId ? (
            <span className="block mt-1">
              Filtro de financeira: apenas faturas geradas com a conta Asaas correspondente à opção selecionada.
            </span>
          ) : null}
          {mostrarEnvioWhatsApp ? (
            <span className="block mt-2 text-slate-600">
              O botão <span className="font-medium">Enviar fatura</span> abre o WhatsApp com mensagem e link do boleto
              prontos. Envie pelo número comercial logado no navegador ou no app (WhatsApp Web / Business).
            </span>
          ) : null}
        </p>
      </div>
      {mostrarEnvioWhatsApp && enviosRecentes.length > 0 ? (
        <div className="border-b border-emerald-200 bg-emerald-50/90 px-5 py-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-emerald-900">
                Faturas enviadas recentemente ({enviosRecentes.length})
              </p>
              <p className="text-[11px] text-emerald-800/90 mt-0.5">
                Após clicar em Enviar fatura, o registro permanece visível por até {ttlMinutos} minutos nesta
                sessão.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {enviosRecentes.map((envio) => (
                  <li
                    key={envio.fatura_id}
                    className="inline-flex items-center gap-1 rounded-sm border border-emerald-200 bg-white px-2 py-1 text-[11px] text-emerald-900"
                  >
                    <span className="font-medium truncate max-w-[12rem]">{envio.cliente_nome}</span>
                    <span className="text-emerald-700 tabular-nums">
                      · {rotuloEnvioRecente(envio.enviado_em, agoraUi)}
                      {minutosRestantesVisibilidade(envio.enviado_em, agoraUi) > 0
                        ? ` (mais ${minutosRestantesVisibilidade(envio.enviado_em, agoraUi)} min)`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
      {mostrarFiltroFinanceira ? (
        <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Separar por financeira
          </p>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por financeira">
            {filtrosFinanceiraPainel.map((f) => (
              <button
                key={f.id || "todas"}
                type="button"
                role="tab"
                aria-selected={filtroFinanceiraPainel === f.id}
                onClick={() => setFiltroFinanceiraPainel(f.id)}
                className={cn(
                  "h-8 rounded-sm border px-2.5 text-xs font-medium transition-colors",
                  filtroFinanceiraPainel === f.id
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    filtroFinanceiraPainel === f.id ? "text-emerald-100" : "text-slate-400"
                  )}
                >
                  ({f.count})
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="border-b border-slate-200 bg-white px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar listagem">
          {filtrosPendencias.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtroPendencias === f.id}
              onClick={() => setFiltroPendencias(f.id)}
              className={cn(
                "h-8 rounded-sm border px-2.5 text-xs font-medium transition-colors",
                filtroPendencias === f.id
                  ? "border-slate-800 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "ml-1.5 tabular-nums",
                  filtroPendencias === f.id ? "text-slate-300" : "text-slate-400"
                )}
              >
                ({f.count})
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`${btnSquare} h-8 border-slate-300 text-xs`}
            disabled={pendenciasFiltradas.length === 0 || exportandoPdf}
            onClick={() => void exportarPdf()}
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            {exportandoPdf ? "Exportando…" : "PDF"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`${btnSquare} h-8 border-slate-300 text-xs`}
            disabled={pendenciasFiltradas.length === 0 || exportandoExcel}
            onClick={exportarExcel}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            {exportandoExcel ? "Exportando…" : "Excel"}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Nome
              </th>
              {mostrarColunaFinanceira ? (
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Financeira
                </th>
              ) : null}
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Vencimento
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Atraso
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Corretora
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Boleto
              </th>
              {mostrarEnvioWhatsApp ? (
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Cobrança
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendenciasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={colSpanBase} className="px-4 py-10 text-center text-sm text-slate-500">
                  {filtroPendencias === "todos"
                    ? "Nenhuma fatura pendente ou atrasada neste período."
                    : `Nenhum registro para o filtro "${rotuloFiltroPendencias(filtroPendencias)}".`}
                </td>
              </tr>
            ) : (
              pendenciasPaginadas.map((item, idx) => {
                const podeWhatsApp =
                  mostrarEnvioWhatsApp &&
                  !!item.link_boleto &&
                  !!normalizarTelefoneWhatsApp(item.cliente_telefone)
                const envioRecente = enviosPorFaturaId.get(item.fatura_id)
                return (
                  <tr
                    key={item.fatura_id}
                    className={cn(
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                      envioRecente && "bg-emerald-50/70 ring-1 ring-inset ring-emerald-200/80"
                    )}
                  >
                    <td className="px-4 py-2.5 text-slate-800 font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{item.cliente_nome}</span>
                        {envioRecente ? (
                          <span className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
                            {rotuloEnvioRecente(envioRecente.enviado_em, agoraUi)}
                          </span>
                        ) : null}
                      </div>
                      {mostrarEnvioWhatsApp && item.cliente_telefone ? (
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5">{item.cliente_telefone}</div>
                      ) : null}
                    </td>
                    {mostrarColunaFinanceira ? (
                      <td className="px-4 py-2.5 text-xs text-slate-700 max-w-[10rem]">
                        {item.financeira_nome || "—"}
                      </td>
                    ) : null}
                    <td className="px-4 py-2.5 tabular-nums text-slate-700">
                      {item.vencimento ? formatarData(item.vencimento) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <span
                          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", corPontoStatus(item.status))}
                          aria-hidden
                        />
                        {rotuloStatus(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {item.status === "atrasada" && item.segmento_atraso ? (
                        <div className="space-y-0.5">
                          <span className="tabular-nums text-slate-700">
                            {item.segmento_atraso === "dois_ou_mais"
                              ? "2+ boletos"
                              : item.segmento_atraso === "um_boleto_novo"
                                ? "1 boleto (novo)"
                                : item.segmento_atraso === "um_boleto_antigo"
                                  ? "1 boleto (antigo)"
                                  : "1 boleto"}
                            {item.boletos_atrasados_total != null
                              ? ` (${item.boletos_atrasados_total} total)`
                              : ""}
                          </span>
                          {item.cancelado_inadimplencia && (
                            <span className="block text-[11px] text-amber-800">Quitação pendente</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{item.corretora || "—"}</td>
                    <td className="px-4 py-2.5">
                      {item.link_boleto ? (
                        <a
                          href={item.link_boleto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          Abrir
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    {mostrarEnvioWhatsApp ? (
                      <td className="px-4 py-2.5">
                        <Button
                          type="button"
                          size="sm"
                          className={cn(
                            "h-8 text-xs font-medium border-0 shadow-none",
                            envioRecente
                              ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                              : "bg-emerald-600 text-white hover:bg-emerald-700",
                            !podeWhatsApp && "opacity-50"
                          )}
                          disabled={!podeWhatsApp}
                          title={
                            !item.link_boleto
                              ? "Sem link de boleto"
                              : !normalizarTelefoneWhatsApp(item.cliente_telefone)
                                ? "Telefone do cliente inválido ou ausente"
                                : envioRecente
                                  ? `${rotuloEnvioRecente(envioRecente.enviado_em, agoraUi)} — clique para reenviar`
                                  : "Abrir WhatsApp com mensagem e boleto"
                          }
                          onClick={() => enviarWhatsApp(item)}
                        >
                          {envioRecente ? "Reenviar" : "Enviar fatura"}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-500">
          Página <span className="font-medium text-slate-700">{paginaAtual}</span> de{" "}
          <span className="font-medium text-slate-700">{totalPaginas}</span>
          {" — "}
          <span className="tabular-nums">{pendenciasPaginadas.length}</span> de{" "}
          <span className="tabular-nums">{pendenciasFiltradas.length}</span> fatura
          {pendenciasFiltradas.length !== 1 ? "s" : ""} nesta tabela
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={`${btnSquare} border-slate-300`}
            onClick={() => setPaginaPendencias((p) => Math.max(1, p - 1))}
            disabled={paginaAtual <= 1}
          >
            Anterior
          </Button>
          <span className="text-sm tabular-nums text-slate-600 px-1">
            Página {paginaAtual} de {totalPaginas}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={`${btnSquare} border-slate-300`}
            onClick={() => setPaginaPendencias((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual >= totalPaginas}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
