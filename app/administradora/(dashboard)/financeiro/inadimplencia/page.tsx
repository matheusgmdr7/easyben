"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatarData, formatarMoeda } from "@/utils/formatters"

function mesAtualYm() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`
}

function formatarMesAno(ym: string) {
  const [y, m] = ym.split("-").map((x) => Number(x))
  if (!y || !m || m < 1 || m > 12) return ym
  const txt = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

type FinanceiraOpcao = { id: string; nome: string }

type ResumoMes = {
  mes: string
  faturas_geradas: number
  faturas_em_aberto: number
  faturas_pagas: number
  faturas_canceladas: number
  valor_gerado: number
  valor_em_aberto: number
  valor_pago: number
  percentual_qtd: number
  percentual_valor: number
}

type PorGrupo = {
  grupo_id: string | null
  grupo_nome: string
  faturas_em_aberto: number
  valor_em_aberto: number
  percentual_qtd_da_inadimplencia: number
  percentual_valor_da_inadimplencia: number
}

type FaturaAberta = {
  fatura_id: string
  cliente_nome: string
  valor: number
  status: string
  vencimento: string
  grupo_id: string | null
  grupo_nome: string
}

type ResultadoInadimplencia = {
  mes: string
  financeira: { id: string | null; nome: string }
  criterio: string
  resumo: ResumoMes
  historico: ResumoMes[]
  por_grupo: PorGrupo[]
  faturas_em_aberto: FaturaAberta[]
}

export default function InadimplenciaPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [financeiras, setFinanceiras] = useState<FinanceiraOpcao[]>([])
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [loadingFiltros, setLoadingFiltros] = useState(true)
  const [financeiraId, setFinanceiraId] = useState("")
  const [grupoId, setGrupoId] = useState("")
  const [mes, setMes] = useState(mesAtualYm())
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ResultadoInadimplencia | null>(null)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    ;(async () => {
      try {
        setLoadingFiltros(true)
        const [finRes, gruposData] = await Promise.all([
          fetch(
            `/api/administradora/financeiras?administradora_id=${encodeURIComponent(adm.id)}`,
            { cache: "no-store" }
          ),
          GruposBeneficiariosService.buscarTodos(adm.id),
        ])
        if (finRes.ok) {
          const lista = await finRes.json().catch(() => [])
          const arr = Array.isArray(lista) ? lista : []
          setFinanceiras(
            arr
              .map((f: { id?: string; nome?: string }) => ({
                id: String(f?.id || ""),
                nome: String(f?.nome || "Financeira"),
              }))
              .filter((f: FinanceiraOpcao) => f.id)
          )
        }
        setGrupos(gruposData || [])
      } catch {
        toast.error("Erro ao carregar filtros")
        setFinanceiras([])
        setGrupos([])
      } finally {
        setLoadingFiltros(false)
      }
    })()
  }, [router])

  async function consultar() {
    if (!administradoraId) return
    if (!financeiraId) {
      toast.error("Selecione uma financeira")
      return
    }
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      toast.error("Informe o mês de vencimento (AAAA-MM)")
      return
    }
    try {
      setLoading(true)
      setResultado(null)
      const qs = new URLSearchParams({
        administradora_id: administradoraId,
        mes,
        financeira_id: financeiraId,
        historico_meses: "6",
      })
      if (grupoId) qs.set("grupo_id", grupoId)

      const res = await fetch(`/api/administradora/financeiro/inadimplencia?${qs}`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Erro ao consultar inadimplência")
      }
      setResultado(data as ResultadoInadimplencia)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na consulta")
    } finally {
      setLoading(false)
    }
  }

  const maxPctHistorico = useMemo(() => {
    if (!resultado?.historico?.length) return 1
    return Math.max(1, ...resultado.historico.map((h) => Math.max(h.percentual_qtd, h.percentual_valor)))
  }, [resultado])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Inadimplência</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Índice por financeira e mês de vencimento das faturas — com participação por grupo e histórico recente.
        </p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-6xl">
        <Card className="rounded-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-xs font-medium text-gray-600">Financeira</Label>
                <Select
                  value={financeiraId || undefined}
                  onValueChange={setFinanceiraId}
                  disabled={loadingFiltros}
                >
                  <SelectTrigger className="h-10 border-gray-200 bg-white">
                    <SelectValue
                      placeholder={loadingFiltros ? "Carregando..." : "Selecione a financeira"}
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(60vh,320px)]">
                    {financeiras.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Mês de vencimento</Label>
                <Input
                  type="month"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">
                  Grupo (opcional)
                </Label>
                <Select
                  value={grupoId || "__todos__"}
                  onValueChange={(v) => setGrupoId(v === "__todos__" ? "" : v)}
                  disabled={loadingFiltros}
                >
                  <SelectTrigger className="h-10 border-gray-200 bg-white">
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(60vh,320px)]">
                    <SelectItem value="__todos__">Todos os grupos</SelectItem>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              O cálculo usa todas as faturas cujo <span className="font-medium text-gray-700">vencimento</span>{" "}
              cai no mês escolhido. O grupo é um recorte da inadimplência da financeira (participação %).
            </p>
            <Button
              type="button"
              onClick={() => void consultar()}
              disabled={loading || !financeiraId}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Consultando…
                </>
              ) : (
                "Consultar inadimplência"
              )}
            </Button>
          </CardContent>
        </Card>

        {resultado && (
          <>
            <p className="text-xs text-gray-500 leading-relaxed">{resultado.criterio}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="rounded-md border border-amber-100 bg-amber-50/40">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-amber-900">
                    Índice (qtd.)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-3xl font-semibold text-amber-900 tabular-nums">
                    {resultado.resumo.percentual_qtd}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {resultado.resumo.faturas_em_aberto} em aberto de{" "}
                    {resultado.resumo.faturas_geradas} geradas
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-red-100 bg-red-50/30">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-red-900">
                    Índice (valor)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-3xl font-semibold text-red-900 tabular-nums">
                    {resultado.resumo.percentual_valor}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatarMoeda(resultado.resumo.valor_em_aberto)} de{" "}
                    {formatarMoeda(resultado.resumo.valor_gerado)}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">
                    Faturas geradas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                    {resultado.resumo.faturas_geradas}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pagas: {resultado.resumo.faturas_pagas} · Canceladas:{" "}
                    {resultado.resumo.faturas_canceladas}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Período</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatarMesAno(resultado.mes)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{resultado.financeira.nome}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-md border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Histórico dos últimos meses</CardTitle>
                <p className="text-sm text-gray-500">
                  Mesmo critério — vencimento no mês · {resultado.financeira.nome}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2.5">
                  {resultado.historico.map((h) => (
                    <div key={h.mes} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span
                          className={cn(
                            "font-medium",
                            h.mes === resultado.mes ? "text-slate-900" : "text-slate-600"
                          )}
                        >
                          {formatarMesAno(h.mes)}
                        </span>
                        <span className="tabular-nums text-slate-600">
                          {h.percentual_qtd}% qtd · {h.percentual_valor}% valor
                          <span className="text-slate-400">
                            {" "}
                            ({h.faturas_em_aberto}/{h.faturas_geradas})
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-sm bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-sm transition-all",
                            h.mes === resultado.mes ? "bg-[#0F172A]" : "bg-slate-400"
                          )}
                          style={{ width: `${Math.min(100, (h.percentual_qtd / maxPctHistorico) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-md border border-gray-100">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Mês</TableHead>
                        <TableHead className="font-semibold text-right">Geradas</TableHead>
                        <TableHead className="font-semibold text-right">Em aberto</TableHead>
                        <TableHead className="font-semibold text-right">% qtd</TableHead>
                        <TableHead className="font-semibold text-right">Valor em aberto</TableHead>
                        <TableHead className="font-semibold text-right">% valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultado.historico.map((h) => (
                        <TableRow
                          key={`t-${h.mes}`}
                          className={h.mes === resultado.mes ? "bg-slate-50" : undefined}
                        >
                          <TableCell className="font-medium">{formatarMesAno(h.mes)}</TableCell>
                          <TableCell className="text-right tabular-nums">{h.faturas_geradas}</TableCell>
                          <TableCell className="text-right tabular-nums">{h.faturas_em_aberto}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-amber-900">
                            {h.percentual_qtd}%
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatarMoeda(h.valor_em_aberto)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium text-red-900">
                            {h.percentual_valor}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-md border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Participação por grupo</CardTitle>
                <p className="text-sm text-gray-500">
                  Dentro das faturas em aberto de {formatarMesAno(resultado.mes)} ·{" "}
                  {resultado.financeira.nome}
                </p>
              </CardHeader>
              <CardContent>
                {resultado.por_grupo.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Nenhuma fatura em aberto neste recorte.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-gray-100">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Grupo</TableHead>
                          <TableHead className="font-semibold text-right">Faturas em aberto</TableHead>
                          <TableHead className="font-semibold text-right">% da inadimplência</TableHead>
                          <TableHead className="font-semibold text-right">Valor</TableHead>
                          <TableHead className="font-semibold text-right">% do valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultado.por_grupo.map((g) => (
                          <TableRow key={g.grupo_id || g.grupo_nome}>
                            <TableCell className="font-medium">{g.grupo_nome}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {g.faturas_em_aberto}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-amber-900 font-medium">
                              {g.percentual_qtd_da_inadimplencia}%
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatarMoeda(g.valor_em_aberto)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-red-900 font-medium">
                              {g.percentual_valor_da_inadimplencia}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-md border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Faturas em aberto no mês</CardTitle>
                <p className="text-sm text-gray-500">
                  Até 500 registros · status pendente ou atrasada com vencimento em{" "}
                  {formatarMesAno(resultado.mes)}
                </p>
              </CardHeader>
              <CardContent>
                {resultado.faturas_em_aberto.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Nenhuma fatura em aberto neste filtro.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-gray-100">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Cliente</TableHead>
                          <TableHead className="font-semibold">Grupo</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Vencimento</TableHead>
                          <TableHead className="font-semibold text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultado.faturas_em_aberto.map((f) => (
                          <TableRow key={f.fatura_id}>
                            <TableCell className="font-medium">{f.cliente_nome}</TableCell>
                            <TableCell className="text-sm text-gray-700">{f.grupo_nome}</TableCell>
                            <TableCell className="text-sm capitalize">{f.status}</TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {f.vencimento ? formatarData(f.vencimento) : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              {formatarMoeda(f.valor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
