"use client"

import { useEffect, useMemo, useState } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type RegistroCancelamento = {
  id: string
  vida_id: string
  tipo_registro: "titular" | "dependente"
  status_fluxo: "solicitado" | "processado_operadora" | "reativado"
  data_solicitacao: string
  data_cancelamento_operadora?: string | null
  data_reativacao?: string | null
  motivo_solicitacao?: string | null
  observacao_processamento?: string | null
  observacao_reativacao?: string | null
  grupo_origem?: { id: string; nome: string } | null
  grupo_destino?: { id: string; nome: string } | null
  vida?: {
    id: string
    nome?: string | null
    cpf?: string | null
    ativo?: boolean | null
    corretor_id?: string | null
    valor_mensal?: number | null
  } | null
}

function formatarDataHora(v?: string | null) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR")
}

function formatarData(v?: string | null) {
  if (!v) return "—"
  const d = new Date(`${v}T00:00:00`)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR")
}

function formatarCpf(v?: string | null) {
  const d = String(v || "").replace(/\D/g, "")
  if (d.length !== 11) return "—"
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

function formatarMoeda(v?: number | string | null) {
  const n = Number(v ?? 0)
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function textoStatus(status: RegistroCancelamento["status_fluxo"]) {
  if (status === "solicitado") return "Solicitado"
  if (status === "processado_operadora") return "Processado"
  return "Reativado"
}

function renderStatusBadge(status: RegistroCancelamento["status_fluxo"]) {
  if (status === "solicitado") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border bg-amber-100 text-amber-800 border-amber-200">
        Solicitado
      </span>
    )
  }
  if (status === "processado_operadora") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border bg-blue-100 text-blue-800 border-blue-200">
        Processado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border bg-emerald-100 text-emerald-800 border-emerald-200">
      Reativado
    </span>
  )
}

export default function BeneficiariosCanceladosPage() {
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [corretores, setCorretores] = useState<Array<{ id: string; nome: string }>>([])
  const [loading, setLoading] = useState(false)
  const [registros, setRegistros] = useState<RegistroCancelamento[]>([])
  const [status, setStatus] = useState("todos")
  const [grupoFiltro, setGrupoFiltro] = useState("todos")
  const [corretorFiltro, setCorretorFiltro] = useState("todos")
  const [tipoPeriodo, setTipoPeriodo] = useState<"solicitacao" | "processamento">("solicitacao")
  const [periodoInicio, setPeriodoInicio] = useState("")
  const [periodoFim, setPeriodoFim] = useState("")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const [registroProcessar, setRegistroProcessar] = useState<RegistroCancelamento | null>(null)
  const [dataOperadora, setDataOperadora] = useState("")
  const [obsProcessamento, setObsProcessamento] = useState("")
  const [salvandoProcessamento, setSalvandoProcessamento] = useState(false)

  const [registroReativar, setRegistroReativar] = useState<RegistroCancelamento | null>(null)
  const [grupoDestinoId, setGrupoDestinoId] = useState("")
  const [obsReativacao, setObsReativacao] = useState("")
  const [salvandoReativacao, setSalvandoReativacao] = useState(false)
  const [processamentoLoteOpen, setProcessamentoLoteOpen] = useState(false)
  const [reativacaoLoteOpen, setReativacaoLoteOpen] = useState(false)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) return
    setAdministradoraId(adm.id)
    GruposBeneficiariosService.buscarTodos(adm.id).then(setGrupos).catch(() => setGrupos([]))
    fetch(`/api/administradora/corretores?administradora_id=${encodeURIComponent(adm.id)}`)
      .then((r) => r.json())
      .then((d) => setCorretores(Array.isArray(d) ? d.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })) : []))
      .catch(() => setCorretores([]))
  }, [])

  async function carregar() {
    if (!administradoraId) return
    try {
      setLoading(true)
      const params = new URLSearchParams({ administradora_id: administradoraId })
      if (status !== "todos") params.set("status", status)
      if (grupoFiltro !== "todos") params.set("grupo_id", grupoFiltro)
      if (corretorFiltro !== "todos") params.set("corretor_id", corretorFiltro)
      if (tipoPeriodo === "solicitacao") {
        if (periodoInicio) params.set("inicio_solicitacao", periodoInicio)
        if (periodoFim) params.set("fim_solicitacao", periodoFim)
      } else {
        if (periodoInicio) params.set("inicio_processamento", periodoInicio)
        if (periodoFim) params.set("fim_processamento", periodoFim)
      }
      const res = await fetch(`/api/administradora/beneficiarios/cancelamentos?${params.toString()}`)
      const data = await res.json().catch(() => [])
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar cancelamentos")
      setRegistros(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar cancelamentos")
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (administradoraId) {
      carregar()
    }
  }, [administradoraId])

  useEffect(() => {
    setPaginaAtual(1)
  }, [status, grupoFiltro, corretorFiltro, tipoPeriodo, periodoInicio, periodoFim])

  useEffect(() => {
    setSelecionados(new Set())
  }, [registros.length, paginaAtual, status, grupoFiltro, corretorFiltro, tipoPeriodo, periodoInicio, periodoFim])

  const solicitados = useMemo(
    () => registros.filter((r) => r.status_fluxo === "solicitado"),
    [registros]
  )
  const processados = useMemo(
    () => registros.filter((r) => r.status_fluxo !== "solicitado"),
    [registros]
  )

  const totalPaginas = Math.max(1, Math.ceil(registros.length / itensPorPagina))
  const paginaAjustada = Math.min(paginaAtual, totalPaginas)
  const resultadosPaginados = registros.slice(
    (paginaAjustada - 1) * itensPorPagina,
    paginaAjustada * itensPorPagina
  )
  const inicio = registros.length > 0 ? (paginaAjustada - 1) * itensPorPagina + 1 : 0
  const fim = Math.min(paginaAjustada * itensPorPagina, registros.length)
  const selecionadosRegistros = registros.filter((r) => selecionados.has(r.id))
  const selecionadosSolicitados = selecionadosRegistros.filter((r) => r.status_fluxo === "solicitado")
  const selecionadosReativaveis = selecionadosRegistros.filter((r) => r.status_fluxo !== "reativado")

  function nomeCorretorPorId(corretorId?: string | null) {
    const id = String(corretorId || "").trim()
    if (!id) return "—"
    return corretores.find((c) => c.id === id)?.nome || "Corretor não encontrado"
  }

  async function exportarExcel() {
    try {
      if (registros.length === 0) {
        toast.info("Não há registros para exportar.")
        return
      }
      const XLSX = await import("xlsx")
      const headers = [
        "Beneficiário",
        "CPF",
        "Valor mensal",
        "Tipo",
        "Status",
        "Data solicitação",
        "Data operadora",
        "Grupo origem",
        "Grupo destino",
        "Corretor",
        "Motivo solicitação",
        "Obs processamento",
        "Obs reativação",
      ]
      const body = registros.map((r) => [
        r.vida?.nome || "-",
        formatarCpf(r.vida?.cpf),
        formatarMoeda(r.vida?.valor_mensal ?? 0),
        r.tipo_registro === "titular" ? "Titular" : "Dependente",
        textoStatus(r.status_fluxo),
        formatarDataHora(r.data_solicitacao),
        formatarData(r.data_cancelamento_operadora),
        r.grupo_origem?.nome || "-",
        r.grupo_destino?.nome || "-",
        nomeCorretorPorId(r.vida?.corretor_id),
        r.motivo_solicitacao || "-",
        r.observacao_processamento || "-",
        r.observacao_reativacao || "-",
      ])
      const totalBeneficiarios = registros.length
      const totalValorMensal = registros.reduce(
        (acc, r) => acc + (Number(r.vida?.valor_mensal ?? 0) || 0),
        0
      )
      body.push([])
      body.push([
        "Totais",
        "",
        formatarMoeda(totalValorMensal),
        `${totalBeneficiarios} beneficiário(s)`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])

      const ws = XLSX.utils.aoa_to_sheet([headers, ...body])
      ws["!cols"] = [
        { wch: 34 },
        { wch: 16 },
        { wch: 16 },
        { wch: 13 },
        { wch: 14 },
        { wch: 22 },
        { wch: 17 },
        { wch: 28 },
        { wch: 28 },
        { wch: 24 },
        { wch: 34 },
        { wch: 34 },
        { wch: 34 },
      ]

      // Estilo visual (header destacado + zebra). Alguns leitores podem ignorar estilos,
      // mas mantemos para compatibilidade com ambientes que suportam.
      for (let c = 0; c < headers.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c })
        const cell = ws[addr]
        if (!cell) continue
        ;(cell as any).s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { patternType: "solid", fgColor: { rgb: "1E293B" } },
          alignment: { vertical: "center", horizontal: "center" },
        }
      }
      for (let r = 1; r <= body.length; r++) {
        const zebra = r % 2 === 0 ? "F8FAFC" : "FFFFFF"
        for (let c = 0; c < headers.length; c++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (!cell) continue
          ;(cell as any).s = {
            fill: { patternType: "solid", fgColor: { rgb: zebra } },
            alignment: { vertical: "top", horizontal: c === 1 ? "center" : "left", wrapText: true },
          }
        }
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Cancelados")
      XLSX.writeFile(wb, `cancelamentos-beneficiarios-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e: any) {
      toast.error("Erro ao exportar Excel: " + (e?.message || "erro desconhecido"))
    }
  }

  async function exportarPdf() {
    try {
      if (registros.length === 0) {
        toast.info("Não há registros para exportar.")
        return
      }
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margem = 8
      const larguraPagina = 297
      const larguraUtil = larguraPagina - margem * 2
      const colWidths = [54, 19, 20, 22, 30, 22, 40, 40, 28]
      const headers = ["Beneficiário", "Valor mensal", "Tipo", "Status", "Solicitação", "Operadora", "Grupo origem", "Grupo destino", "Corretor"]
      const rowH = 6
      const totalBeneficiarios = registros.length
      const totalValorMensal = registros.reduce(
        (acc, r) => acc + (Number(r.vida?.valor_mensal ?? 0) || 0),
        0
      )
      let y = 12

      doc.setFontSize(12)
      doc.setTextColor(15, 23, 42)
      doc.text("Relatório de Beneficiários Cancelados", margem, y)
      y += 5
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, margem, y)
      doc.text(`Total de beneficiários: ${totalBeneficiarios}`, margem + 95, y)
      doc.text(`Soma valor mensal: ${formatarMoeda(totalValorMensal)}`, margem + 170, y)
      y += 6

      const drawHeader = () => {
        let x = margem
        doc.setFillColor(30, 41, 59)
        doc.rect(margem, y, larguraUtil, rowH, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7)
        headers.forEach((h, i) => {
          doc.text(h, x + 1.5, y + 4.1)
          x += colWidths[i]
        })
        y += rowH
      }

      drawHeader()

      registros.forEach((r, idx) => {
        if (y > 196) {
          doc.addPage()
          y = 10
          drawHeader()
        }

        const zebra = idx % 2 === 0
        if (zebra) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margem, y, larguraUtil, rowH, "F")
        }

        doc.setTextColor(30, 41, 59)
        doc.setFontSize(7)
        const valores = [
          String(r.vida?.nome || "-").slice(0, 36),
          formatarMoeda(r.vida?.valor_mensal ?? 0),
          r.tipo_registro === "titular" ? "Titular" : "Dependente",
          textoStatus(r.status_fluxo),
          formatarDataHora(r.data_solicitacao).slice(0, 16),
          formatarData(r.data_cancelamento_operadora),
          String(r.grupo_origem?.nome || "-").slice(0, 24),
          String(r.grupo_destino?.nome || "-").slice(0, 24),
          nomeCorretorPorId(r.vida?.corretor_id).slice(0, 18),
        ]

        let x = margem
        valores.forEach((v, i) => {
          doc.text(v, x + 1.5, y + 4.1)
          x += colWidths[i]
        })
        y += rowH
      })

      if (y > 192) {
        doc.addPage()
        y = 12
      }
      doc.setDrawColor(203, 213, 225)
      doc.line(margem, y + 1, margem + larguraUtil, y + 1)
      y += 5
      doc.setTextColor(30, 41, 59)
      doc.setFontSize(9)
      doc.text(`Total de beneficiários: ${totalBeneficiarios}`, margem, y)
      doc.text(`Soma do valor mensal: ${formatarMoeda(totalValorMensal)}`, margem + 95, y)

      doc.save(`cancelamentos-beneficiarios-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e: any) {
      toast.error("Erro ao exportar PDF: " + (e?.message || "erro desconhecido"))
    }
  }

  async function processarCancelamento() {
    if (!administradoraId || !registroProcessar?.id || !dataOperadora) {
      toast.error("Informe a data de cancelamento na operadora.")
      return
    }
    try {
      setSalvandoProcessamento(true)
      const res = await fetch("/api/administradora/beneficiarios/cancelamentos/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          cancelamento_id: registroProcessar.id,
          data_cancelamento_operadora: dataOperadora,
          observacao_processamento: obsProcessamento || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao processar cancelamento")
      toast.success("Cancelamento processado com sucesso.")
      setRegistroProcessar(null)
      setDataOperadora("")
      setObsProcessamento("")
      await carregar()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao processar cancelamento")
    } finally {
      setSalvandoProcessamento(false)
    }
  }

  async function processarCancelamentoLote() {
    if (!administradoraId || !dataOperadora || selecionadosSolicitados.length === 0) {
      toast.error("Selecione ao menos um registro solicitado e informe a data da operadora.")
      return
    }
    try {
      setSalvandoProcessamento(true)
      const resultados = await Promise.allSettled(
        selecionadosSolicitados.map((r) =>
          fetch("/api/administradora/beneficiarios/cancelamentos/processar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              administradora_id: administradoraId,
              cancelamento_id: r.id,
              data_cancelamento_operadora: dataOperadora,
              observacao_processamento: obsProcessamento || undefined,
            }),
          }).then(async (res) => {
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error || "Erro no processamento em lote")
            return data
          })
        )
      )
      const sucesso = resultados.filter((r) => r.status === "fulfilled").length
      const erro = resultados.length - sucesso
      toast.success(`${sucesso} registro(s) processado(s)${erro > 0 ? ` | ${erro} com erro` : ""}.`)
      setProcessamentoLoteOpen(false)
      setDataOperadora("")
      setObsProcessamento("")
      setSelecionados(new Set())
      await carregar()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao processar em lote")
    } finally {
      setSalvandoProcessamento(false)
    }
  }

  async function reativarBeneficiario() {
    if (!administradoraId || !registroReativar?.id || !grupoDestinoId) {
      toast.error("Selecione o grupo de destino.")
      return
    }
    try {
      setSalvandoReativacao(true)
      const res = await fetch("/api/administradora/beneficiarios/cancelamentos/reativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          cancelamento_id: registroReativar.id,
          grupo_destino_id: grupoDestinoId,
          observacao_reativacao: obsReativacao || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao reativar beneficiário")
      toast.success("Beneficiário reativado com sucesso.")
      setRegistroReativar(null)
      setGrupoDestinoId("")
      setObsReativacao("")
      await carregar()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao reativar beneficiário")
    } finally {
      setSalvandoReativacao(false)
    }
  }

  async function reativarBeneficiarioLote() {
    if (!administradoraId || !grupoDestinoId || selecionadosReativaveis.length === 0) {
      toast.error("Selecione registros para reativar e grupo de destino.")
      return
    }
    try {
      setSalvandoReativacao(true)
      const resultados = await Promise.allSettled(
        selecionadosReativaveis.map((r) =>
          fetch("/api/administradora/beneficiarios/cancelamentos/reativar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              administradora_id: administradoraId,
              cancelamento_id: r.id,
              grupo_destino_id: grupoDestinoId,
              observacao_reativacao: obsReativacao || undefined,
            }),
          }).then(async (res) => {
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error || "Erro na reativação em lote")
            return data
          })
        )
      )
      const sucesso = resultados.filter((r) => r.status === "fulfilled").length
      const erro = resultados.length - sucesso
      toast.success(`${sucesso} registro(s) reativado(s)${erro > 0 ? ` | ${erro} com erro` : ""}.`)
      setReativacaoLoteOpen(false)
      setGrupoDestinoId("")
      setObsReativacao("")
      setSelecionados(new Set())
      await carregar()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao reativar em lote")
    } finally {
      setSalvandoReativacao(false)
    }
  }

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selecionarTodosPaginados() {
    setSelecionados((prev) => {
      const next = new Set(prev)
      resultadosPaginados.forEach((r) => next.add(r.id))
      return next
    })
  }

  function limparSelecao() {
    setSelecionados(new Set())
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">
          Beneficiários Cancelados
        </h1>
        <p className="text-gray-600 mt-1 font-medium">
          Controle de solicitações, processamento na operadora e reativação.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="solicitado">Solicitado</SelectItem>
              <SelectItem value="processado_operadora">Processado</SelectItem>
              <SelectItem value="reativado">Reativado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {grupos.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={corretorFiltro} onValueChange={setCorretorFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Corretor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os corretores</SelectItem>
              {corretores.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoPeriodo} onValueChange={(v) => setTipoPeriodo(v as "solicitacao" | "processamento")}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solicitacao">Período de solicitação</SelectItem>
              <SelectItem value="processamento">Período de processamento</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
          <Input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
          <Button onClick={carregar} disabled={loading}>
            {loading ? "Carregando..." : "Aplicar filtros"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-amber-800 text-base">Cancelamentos Solicitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900">{solicitados.length}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-800 text-base">Histórico Processado/Reativado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{processados.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Histórico de Cancelamentos</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selecionarTodosPaginados} disabled={resultadosPaginados.length === 0}>
                Selecionar página
              </Button>
              <Button variant="outline" size="sm" onClick={limparSelecao} disabled={selecionados.size === 0}>
                Limpar seleção
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDataOperadora("")
                  setObsProcessamento("")
                  setProcessamentoLoteOpen(true)
                }}
                disabled={selecionadosSolicitados.length === 0}
              >
                Processar selecionados ({selecionadosSolicitados.length})
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setGrupoDestinoId("")
                  setObsReativacao("")
                  setReativacaoLoteOpen(true)
                }}
                disabled={selecionadosReativaveis.length === 0}
              >
                Reativar selecionados ({selecionadosReativaveis.length})
              </Button>
              <Button variant="outline" size="sm" onClick={exportarPdf}>
                Exportar PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportarExcel}>
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : registros.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum registro encontrado para os filtros selecionados.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">Sel.</TableHead>
                    <TableHead>Beneficiário</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Valor mensal</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Solicitado</TableHead>
                    <TableHead>Cancelado na operadora</TableHead>
                    <TableHead>Grupo origem</TableHead>
                    <TableHead>Corretor</TableHead>
                    <TableHead>Grupo destino</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultadosPaginados.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#0F172A]"
                          checked={selecionados.has(r.id)}
                          onChange={() => toggleSelecionado(r.id)}
                        />
                      </TableCell>
                      <TableCell>{r.vida?.nome || "—"}</TableCell>
                      <TableCell>{formatarCpf(r.vida?.cpf)}</TableCell>
                      <TableCell>{formatarMoeda(r.vida?.valor_mensal ?? 0)}</TableCell>
                      <TableCell>{r.tipo_registro === "titular" ? "Titular" : "Dependente"}</TableCell>
                      <TableCell>{renderStatusBadge(r.status_fluxo)}</TableCell>
                      <TableCell>{formatarDataHora(r.data_solicitacao)}</TableCell>
                      <TableCell>{formatarData(r.data_cancelamento_operadora)}</TableCell>
                      <TableCell>{r.grupo_origem?.nome || "—"}</TableCell>
                      <TableCell>{nomeCorretorPorId(r.vida?.corretor_id)}</TableCell>
                      <TableCell>{r.grupo_destino?.nome || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {r.status_fluxo === "solicitado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRegistroProcessar(r)
                                setDataOperadora("")
                                setObsProcessamento("")
                              }}
                            >
                              Processar
                            </Button>
                          )}
                          {r.status_fluxo !== "reativado" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setRegistroReativar(r)
                                setGrupoDestinoId(r.grupo_origem?.id || "")
                                setObsReativacao("")
                              }}
                            >
                              Reativar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Mostrando {inicio} a {fim} de {registros.length}
                  </p>
                  <Select
                    value={String(itensPorPagina)}
                    onValueChange={(v) => {
                      setItensPorPagina(Number(v))
                      setPaginaAtual(1)
                    }}
                  >
                    <SelectTrigger className="h-8 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAjustada <= 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600">
                    Página {paginaAjustada} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAjustada >= totalPaginas}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!registroProcessar} onOpenChange={(open) => !open && setRegistroProcessar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processar cancelamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Beneficiário: <span className="font-medium text-gray-900">{registroProcessar?.vida?.nome || "—"}</span>
            </p>
            <div>
              <Label>Data de cancelamento na operadora *</Label>
              <Input type="date" value={dataOperadora} onChange={(e) => setDataOperadora(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input value={obsProcessamento} onChange={(e) => setObsProcessamento(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistroProcessar(null)} disabled={salvandoProcessamento}>
              Cancelar
            </Button>
            <Button onClick={processarCancelamento} disabled={salvandoProcessamento || !dataOperadora}>
              {salvandoProcessamento ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Confirmar processamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!registroReativar} onOpenChange={(open) => !open && setRegistroReativar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reativar beneficiário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Beneficiário: <span className="font-medium text-gray-900">{registroReativar?.vida?.nome || "—"}</span>
            </p>
            <div>
              <Label>Grupo de destino *</Label>
              <Select value={grupoDestinoId} onValueChange={setGrupoDestinoId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input value={obsReativacao} onChange={(e) => setObsReativacao(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistroReativar(null)} disabled={salvandoReativacao}>
              Cancelar
            </Button>
            <Button onClick={reativarBeneficiario} disabled={salvandoReativacao || !grupoDestinoId}>
              {salvandoReativacao ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reativando...
                </>
              ) : (
                "Confirmar reativação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={processamentoLoteOpen} onOpenChange={setProcessamentoLoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processar cancelamentos selecionados</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Selecionados aptos: <span className="font-medium text-gray-900">{selecionadosSolicitados.length}</span>
            </p>
            <div>
              <Label>Data de cancelamento na operadora *</Label>
              <Input type="date" value={dataOperadora} onChange={(e) => setDataOperadora(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input value={obsProcessamento} onChange={(e) => setObsProcessamento(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessamentoLoteOpen(false)} disabled={salvandoProcessamento}>
              Cancelar
            </Button>
            <Button onClick={processarCancelamentoLote} disabled={salvandoProcessamento || !dataOperadora || selecionadosSolicitados.length === 0}>
              {salvandoProcessamento ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar processamento em lote"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reativacaoLoteOpen} onOpenChange={setReativacaoLoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reativar cancelamentos selecionados</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Selecionados aptos: <span className="font-medium text-gray-900">{selecionadosReativaveis.length}</span>
            </p>
            <div>
              <Label>Grupo de destino *</Label>
              <Select value={grupoDestinoId} onValueChange={setGrupoDestinoId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input value={obsReativacao} onChange={(e) => setObsReativacao(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReativacaoLoteOpen(false)} disabled={salvandoReativacao}>
              Cancelar
            </Button>
            <Button onClick={reativarBeneficiarioLote} disabled={salvandoReativacao || !grupoDestinoId || selecionadosReativaveis.length === 0}>
              {salvandoReativacao ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reativando...
                </>
              ) : (
                "Confirmar reativação em lote"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
