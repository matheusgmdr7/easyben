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
import { FileSpreadsheet, Loader2, Search } from "lucide-react"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import { cn } from "@/lib/utils"
import type { LinhaRelatorioImplantacao } from "@/lib/relatorio-implantacao"

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

const ITENS_POR_PAGINA = 20
const btnSquare = "rounded-sm"

export default function RelatorioImplantacaoPage() {
  const agora = new Date()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [linhas, setLinhas] = useState<LinhaRelatorioImplantacao[]>([])
  const [totais, setTotais] = useState({ total: 0, primeiro: 0, aguardando: 0 })
  const [periodo, setPeriodo] = useState<{ inicio: string; fim: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)

  const [mesRef, setMesRef] = useState(String(agora.getMonth() + 1).padStart(2, "0"))
  const [anoRef, setAnoRef] = useState(String(agora.getFullYear()))
  const [diaRef, setDiaRef] = useState("")
  const [grupoId, setGrupoId] = useState("todos")
  const [corretorId, setCorretorId] = useState("todos")
  const [somentePrimeiro, setSomentePrimeiro] = useState(true)
  const [implantadoFiltro, setImplantadoFiltro] = useState("nao")

  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])

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
      if (diaRef.trim()) url.searchParams.set("dia", diaRef.trim())
      if (grupoId !== "todos") url.searchParams.set("grupo_id", grupoId)
      if (corretorId !== "todos") url.searchParams.set("corretor_id", corretorId)
      url.searchParams.set("somente_primeiro_boleto", somentePrimeiro ? "1" : "0")
      url.searchParams.set("implantado", implantadoFiltro)

      const res = await fetch(url.toString(), { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao gerar relatório")

      setLinhas(data.linhas || [])
      setTotais({
        total: data.total_registros || 0,
        primeiro: data.total_primeiro_boleto || 0,
        aguardando: data.total_aguardando_implantacao || 0,
      })
      setPeriodo(data.periodo || null)
      toast.success(`${data.total_registros || 0} registro(s) encontrado(s)`)
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
        Cliente: item.cliente_nome,
        CPF: formatarCpf(item.cpf),
        Telefone: item.telefone || "—",
        Grupo: item.grupo_nome || "—",
        Corretora: item.corretora || "—",
        "Data pagamento": item.pagamento_data ? formatarData(item.pagamento_data) : "—",
        Valor: item.valor != null ? Number(item.valor) : "",
        Vencimento: item.vencimento ? formatarData(item.vencimento) : "—",
        "Nº fatura": item.numero_fatura || "—",
        "Primeiro boleto": item.primeiro_boleto ? "Sim" : "Não",
        Implantado: item.implantado ? "Sim" : "Aguardando",
        Carteirinha: item.numero_carteirinha || "—",
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Implantacao")
      const sufixoDia = diaRef.trim() ? `-${diaRef.padStart(2, "0")}` : ""
      XLSX.writeFile(wb, `relatorio-implantacao-${anoRef}-${mesRef}${sufixoDia}.xlsx`)
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

  const periodoLabel = periodo
    ? periodo.inicio === periodo.fim
      ? formatarData(periodo.inicio)
      : `${formatarData(periodo.inicio)} — ${formatarData(periodo.fim)}`
    : `${mesRef}/${anoRef}${diaRef ? ` (dia ${diaRef})` : ""}`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Relatório de Implantação</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Clientes com boleto pago — ideal para identificar quem pagou o primeiro boleto e pode ser
          incluído no plano.
        </p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-[min(100%,90rem)]">
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-slate-500">
                Dia (opcional)
              </Label>
              <Input
                type="number"
                className={cn(btnSquare, "h-10")}
                placeholder="Todo o mês"
                min={1}
                max={31}
                value={diaRef}
                onChange={(e) => setDiaRef(e.target.value)}
              />
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
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-slate-500">Implantação</Label>
              <Select value={implantadoFiltro} onValueChange={setImplantadoFiltro}>
                <SelectTrigger className={cn(btnSquare, "h-10")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="nao">Aguardando implantação</SelectItem>
                  <SelectItem value="sim">Já implantados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="somente-primeiro"
                checked={somentePrimeiro}
                onCheckedChange={setSomentePrimeiro}
              />
              <Label htmlFor="somente-primeiro" className="text-sm text-slate-700 cursor-pointer">
                Apenas primeiro boleto pago
              </Label>
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
                Gerar relatório
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

        {totais.total > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-sm border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Registros</p>
              <p className="text-2xl font-semibold text-slate-800 tabular-nums">{totais.total}</p>
              <p className="text-xs text-slate-500">{periodoLabel}</p>
            </div>
            <div className="rounded-sm border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Primeiro boleto</p>
              <p className="text-2xl font-semibold text-slate-800 tabular-nums">{totais.primeiro}</p>
            </div>
            <div className="rounded-sm border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Aguardando implantação</p>
              <p className="text-2xl font-semibold text-slate-800 tabular-nums">{totais.aguardando}</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  {[
                    "Cliente",
                    "CPF",
                    "Telefone",
                    "Grupo",
                    "Corretora",
                    "Pagamento",
                    "Valor",
                    "1º boleto",
                    "Implantação",
                    "Carteirinha",
                  ].map((h) => (
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
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      {loading
                        ? "Carregando…"
                        : "Nenhum registro. Ajuste os filtros e clique em Gerar relatório."}
                    </td>
                  </tr>
                ) : (
                  linhasPaginadas.map((item, idx) => (
                    <tr key={item.fatura_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{item.cliente_nome}</td>
                      <td className="px-4 py-2.5 text-slate-600 tabular-nums">{formatarCpf(item.cpf)}</td>
                      <td className="px-4 py-2.5 text-slate-600 tabular-nums text-xs">
                        {item.telefone || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{item.grupo_nome || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{item.corretora || "—"}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-700">
                        {item.pagamento_data ? formatarData(item.pagamento_data) : "—"}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-800">
                        {item.valor != null ? formatarMoeda(Number(item.valor)) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "text-xs",
                            item.primeiro_boleto ? "text-slate-800 font-medium" : "text-slate-400"
                          )}
                        >
                          {item.primeiro_boleto ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs",
                            item.implantado ? "text-slate-600" : "text-slate-800 font-medium"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              item.implantado ? "bg-slate-400" : "bg-slate-800"
                            )}
                          />
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
                Página {paginaSegura} de {totalPaginas} — {linhas.length} registro
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
