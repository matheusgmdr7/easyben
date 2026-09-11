"use client"

import { useEffect, useMemo, useState } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarDays, ChevronDown, ChevronUp, FileSpreadsheet, Loader2, Search, X } from "lucide-react"
import { format, parse } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import { cn } from "@/lib/utils"
import type { DiagnosticoExclusao, LinhaRelatorioImplantacao, ModoReferenciaImplantacao } from "@/lib/relatorio-implantacao"

type Corretor = { id: string; nome: string }

const MESES = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
]

const MODOS_REFERENCIA: { value: ModoReferenciaImplantacao; label: string; hint: string }[] = [
  {
    value: "importacao",
    label: "Importação da vida",
    hint: "Vidas inseridas no mês selecionado",
  },
  {
    value: "primeira_fatura",
    label: "1ª fatura gerada",
    hint: "1º boleto gerado no mês, sem fatura anterior",
  },
  {
    value: "pagamento",
    label: "Pagamento da 1ª fatura",
    hint: "1º pagamento no mês, sem pagamento anterior",
  },
]

const LABELS_MOTIVO: Record<string, string> = {
  inativo: "Vida inativa",
  sem_cpf: "Sem CPF válido",
  fora_grupo: "Fora do grupo filtrado",
  sem_vida_titular: "Sem vida titular vinculada",
  cpf_anterior: "CPF já existia antes",
  fatura_anterior: "Já tinha fatura/pagamento anterior",
  titular_nao_novo: "Titular não é novo no mês",
  dependente_sem_cpf: "Dependente sem CPF",
  dependente_cpf_anterior: "Dependente com CPF anterior",
  dependente_fora_grupo: "Dependente fora do grupo",
  dependente_sem_titular: "Dependente sem CPF titular",
  corretor: "Corretora filtrada",
  somente_pago: "Boleto não pago",
  pagamento_fora_periodo: "Pagamento fora do período",
  implantado_filtro: "Filtro de implantação",
  dependente_corretor: "Dependente — corretora",
  dependente_pagamento: "Dependente — pagamento titular",
  dependente_titular_nao_listado: "Dependente — titular fora da lista",
  dependente_implantado_filtro: "Dependente — implantação",
}

const ITENS_POR_PAGINA = 25
const btnSquare = "rounded-sm"

export default function RelatorioImplantacaoPage() {
  const agora = new Date()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [linhas, setLinhas] = useState<LinhaRelatorioImplantacao[]>([])
  const [totais, setTotais] = useState({
    total: 0,
    pagos: 0,
    aguardandoImplantacao: 0,
    excluidos: 0,
  })
  const [diagnostico, setDiagnostico] = useState<DiagnosticoExclusao | null>(null)
  const [modoReferencia, setModoReferencia] = useState<ModoReferenciaImplantacao>("importacao")
  const [relatorioGerado, setRelatorioGerado] = useState(false)
  const [diagnosticoAberto, setDiagnosticoAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)

  const [mesRef, setMesRef] = useState(String(agora.getMonth() + 1).padStart(2, "0"))
  const [anoRef, setAnoRef] = useState(String(agora.getFullYear()))
  const [periodoRange, setPeriodoRange] = useState<DateRange | undefined>()
  const [grupoId, setGrupoId] = useState("todos")
  const [corretorId, setCorretorId] = useState("todos")
  const [somentePrimeiro, setSomentePrimeiro] = useState(false)
  const [incluirDependentesInclusao, setIncluirDependentesInclusao] = useState(false)

  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [calendarioAberto, setCalendarioAberto] = useState(false)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (adm?.id) {
      setAdministradoraId(adm.id)
      void carregarFiltros(adm.id)
    }
  }, [])

  useEffect(() => {
    setPaginaAtual(1)
  }, [linhas.length])

  useEffect(() => {
    setPeriodoRange(undefined)
  }, [mesRef, anoRef])

  const mesCalendario = useMemo(
    () => parse(`${anoRef}-${mesRef}-01`, "yyyy-MM-dd", new Date()),
    [anoRef, mesRef]
  )

  const modoAtual = MODOS_REFERENCIA.find((m) => m.value === modoReferencia)

  function labelPeriodoSelecionado(range: DateRange | undefined): string {
    if (!range?.from) return "Todo o mês"
    const inicio = format(range.from, "dd/MM/yyyy", { locale: ptBR })
    if (!range.to) return `${inicio} — …`
    const fim = format(range.to, "dd/MM/yyyy", { locale: ptBR })
    return inicio === fim ? inicio : `${inicio} — ${fim}`
  }

  function selecionarPeriodo(range: DateRange | undefined) {
    setPeriodoRange(range)
    if (range?.from) {
      setAnoRef(String(range.from.getFullYear()))
      setMesRef(String(range.from.getMonth() + 1).padStart(2, "0"))
    }
  }

  async function carregarFiltros(admId: string) {
    try {
      const [gruposData, corretoresRes] = await Promise.all([
        GruposBeneficiariosService.buscarTodos(admId),
        fetch(`/api/administradora/corretores?administradora_id=${encodeURIComponent(admId)}`),
      ])
      setGrupos(gruposData || [])
      if (corretoresRes.ok) {
        const data = await corretoresRes.json()
        setCorretores(Array.isArray(data) ? data : [])
      }
    } catch {
      setGrupos([])
      setCorretores([])
    }
  }

  async function gerarRelatorio() {
    if (!administradoraId) return
    try {
      setLoading(true)
      const url = new URL("/api/administradora/relatorios/implantacao", window.location.origin)
      url.searchParams.set("administradora_id", administradoraId)
      url.searchParams.set("ano", anoRef)
      url.searchParams.set("mes", mesRef)
      url.searchParams.set("modo_referencia", modoReferencia)
      if (periodoRange?.from) {
        url.searchParams.set("data_inicio", format(periodoRange.from, "yyyy-MM-dd"))
        url.searchParams.set(
          "data_fim",
          format(periodoRange.to ?? periodoRange.from, "yyyy-MM-dd")
        )
      }
      if (grupoId !== "todos") url.searchParams.set("grupo_id", grupoId)
      if (corretorId !== "todos") url.searchParams.set("corretor_id", corretorId)
      url.searchParams.set("somente_primeiro_boleto", somentePrimeiro ? "1" : "0")
      url.searchParams.set("incluir_dependentes_inclusao", incluirDependentesInclusao ? "1" : "0")

      const res = await fetch(url.toString(), { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao gerar relatório")

      setLinhas(data.linhas || [])
      setTotais({
        total: data.total_registros || 0,
        pagos: data.total_pagos || 0,
        aguardandoImplantacao: data.total_aguardando_implantacao || 0,
        excluidos: data.diagnostico?.total_excluidos || 0,
      })
      setDiagnostico(data.diagnostico || null)
      setModoReferencia(data.modo_referencia || modoReferencia)
      setRelatorioGerado(true)
      setDiagnosticoAberto(Boolean(data.diagnostico?.total_excluidos))
      toast.success(`${data.total_registros || 0} beneficiário(s) no período`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar relatório")
    } finally {
      setLoading(false)
    }
  }

  function formatarCpf(cpf: string | null) {
    const d = String(cpf || "").replace(/\D/g, "")
    if (d.length !== 11) return cpf || "—"
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }

  async function exportarExcel() {
    if (linhas.length === 0) {
      toast.error("Não há dados para exportar")
      return
    }
    try {
      setExportandoExcel(true)
      const XLSX = await import("xlsx")
      const rows = linhas.map((item, idx) => ({
        Qtd: idx + 1,
        Tipo: item.tipo_beneficiario === "dependente" ? "Dependente" : "Titular",
        Cliente: item.cliente_nome,
        Titular: item.titular_nome || "—",
        CPF: formatarCpf(item.cpf),
        Telefone: item.telefone || "—",
        Grupo: item.grupo_nome || "—",
        Corretora: item.corretora || "—",
        "Data pagamento": item.pagamento_data ? formatarData(item.pagamento_data) : "—",
        Valor: item.valor != null ? Number(item.valor) : "",
        "Nº fatura": item.numero_fatura || "—",
        Boleto: item.pago ? "Pago" : "Em aberto",
        Implantado: item.implantado ? "Sim" : "Aguardando",
        Carteirinha: item.numero_carteirinha || "—",
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Implantacao")
      const sufixoPeriodo = periodoRange?.from
        ? `-${format(periodoRange.from, "yyyy-MM-dd")}${
            periodoRange.to ? `_a_${format(periodoRange.to, "yyyy-MM-dd")}` : ""
          }`
        : ""
      XLSX.writeFile(wb, `relatorio-implantacao-${anoRef}-${mesRef}${sufixoPeriodo}.xlsx`)
      toast.success("Excel exportado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar")
    } finally {
      setExportandoExcel(false)
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(linhas.length / ITENS_POR_PAGINA))
  const paginaSegura = Math.min(paginaAtual, totalPaginas)
  const linhasPaginadas = useMemo(() => {
    const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA
    return linhas.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [linhas, paginaSegura])

  const motivosOrdenados = useMemo(() => {
    if (!diagnostico?.motivos) return []
    return Object.entries(diagnostico.motivos)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
  }, [diagnostico])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Relatório de Implantação</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Novos beneficiários no período — pagamento e implantação em visão resumida.
        </p>
      </div>

      <div className="px-6 py-6 space-y-5 max-w-[min(100%,80rem)]">
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-[10px] uppercase tracking-wide text-slate-500">
                Referência do período
              </Label>
              <Select
                value={modoReferencia}
                onValueChange={(v) => setModoReferencia(v as ModoReferenciaImplantacao)}
              >
                <SelectTrigger className={cn(btnSquare, "h-10")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODOS_REFERENCIA.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modoAtual ? (
                <p className="text-xs text-slate-500">{modoAtual.hint}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-slate-500">Mês</Label>
              <Select value={mesRef} onValueChange={setMesRef}>
                <SelectTrigger className={cn(btnSquare, "h-10")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-slate-500">Ano</Label>
              <Input
                type="number"
                className={cn(btnSquare, "h-10")}
                value={anoRef}
                min={2000}
                max={2100}
                onChange={(e) => setAnoRef(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[10px] uppercase tracking-wide text-slate-500">
                Pagamento entre (opcional)
              </Label>
              <Popover open={calendarioAberto} onOpenChange={setCalendarioAberto}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      btnSquare,
                      "h-10 w-full justify-start px-3 font-normal",
                      !periodoRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                    {labelPeriodoSelecionado(periodoRange)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={periodoRange}
                    onSelect={(range) => {
                      selecionarPeriodo(range)
                      if (range?.from && range?.to) setCalendarioAberto(false)
                    }}
                    defaultMonth={mesCalendario}
                    month={mesCalendario}
                    onMonthChange={(data) => {
                      setAnoRef(String(data.getFullYear()))
                      setMesRef(String(data.getMonth() + 1).padStart(2, "0"))
                    }}
                    locale={ptBR}
                    numberOfMonths={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {periodoRange?.from ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                  onClick={() => setPeriodoRange(undefined)}
                >
                  <X className="h-3 w-3" />
                  Limpar
                </button>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-slate-500">Grupo</Label>
              <Select value={grupoId} onValueChange={setGrupoId}>
                <SelectTrigger className={cn(btnSquare, "h-10")}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {grupos.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-slate-500">Corretora</Label>
              <Select value={corretorId} onValueChange={setCorretorId}>
                <SelectTrigger className={cn(btnSquare, "h-10")}>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="somente-primeiro"
                  checked={somentePrimeiro}
                  onCheckedChange={setSomentePrimeiro}
                />
                <Label htmlFor="somente-primeiro" className="text-sm text-slate-700 cursor-pointer">
                  Só com boleto pago
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="incluir-deps"
                  checked={incluirDependentesInclusao}
                  onCheckedChange={setIncluirDependentesInclusao}
                />
                <Label htmlFor="incluir-deps" className="text-sm text-slate-700 cursor-pointer">
                  Dependentes de titular antigo
                </Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className={cn(btnSquare, "h-10 bg-[#0F172A] hover:bg-[#1E293B] text-white")}
                disabled={loading}
                onClick={() => void gerarRelatorio()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Gerar
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(btnSquare, "h-10 border-slate-300")}
                disabled={linhas.length === 0 || exportandoExcel}
                onClick={() => void exportarExcel()}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        {relatorioGerado ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Beneficiários", value: totais.total },
                { label: "Boletos pagos", value: totais.pagos },
                { label: "Aguard. implantação", value: totais.aguardandoImplantacao },
                { label: "Excluídos", value: totais.excluidos, muted: true },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p
                    className={cn(
                      "text-2xl font-semibold tabular-nums",
                      card.muted ? "text-slate-500" : "text-slate-800"
                    )}
                  >
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {diagnostico && motivosOrdenados.length > 0 ? (
              <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50/80"
                  onClick={() => setDiagnosticoAberto((v) => !v)}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">Por que clientes foram excluídos?</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {diagnostico.vidas_bruto} vidas no mês · {diagnostico.titulares_candidatos} titulares
                      candidatos · {diagnostico.total_excluidos} exclusões
                    </p>
                  </div>
                  {diagnosticoAberto ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {diagnosticoAberto ? (
                  <div className="border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2">
                    {motivosOrdenados.map(([motivo, qtd]) => (
                      <span
                        key={motivo}
                        className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                      >
                        <span className="font-semibold tabular-nums">{qtd}</span>
                        {LABELS_MOTIVO[motivo] || motivo}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  {["Beneficiário", "Tipo", "Boleto", "Implantação", "Carteirinha"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      {loading
                        ? "Carregando…"
                        : "Nenhum registro. Ajuste os filtros e clique em Gerar."}
                    </td>
                  </tr>
                ) : (
                  linhasPaginadas.map((item, idx) => (
                    <tr key={item.fatura_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800">{item.cliente_nome}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.tipo_beneficiario === "dependente" && item.titular_nome
                            ? `Titular: ${item.titular_nome}`
                            : formatarCpf(item.cpf)}
                          {item.pagamento_data ? ` · Pago ${formatarData(item.pagamento_data)}` : ""}
                          {item.valor != null ? ` · ${formatarMoeda(Number(item.valor))}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {item.tipo_beneficiario === "dependente" ? "Dependente" : "Titular"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            item.pago ? "text-green-700" : "text-amber-700"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              item.pago ? "bg-green-600" : "bg-amber-500"
                            )}
                          />
                          {item.pago ? "Pago" : "Em aberto"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "text-xs",
                            item.implantado ? "text-slate-500" : "text-slate-800 font-medium"
                          )}
                        >
                          {item.implantado ? "Implantado" : "Aguardando"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">
                        {item.numero_carteirinha || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {linhas.length > 0 ? (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3">
              <p className="text-xs text-slate-500">
                Página {paginaSegura} de {totalPaginas} · {linhas.length} registro
                {linhas.length !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(btnSquare, "border-slate-300")}
                  disabled={paginaSegura <= 1}
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(btnSquare, "border-slate-300")}
                  disabled={paginaSegura >= totalPaginas}
                  onClick={() => setPaginaAtual((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
