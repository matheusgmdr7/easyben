"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { Loader2, ExternalLink } from "lucide-react"

function mesAtualYm() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`
}

function formatarMesAno(ym: string) {
  const [y, m] = ym.split("-").map((x) => Number(x))
  if (!y || !m || m < 1 || m > 12) return ym
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

type PorMes = { mes: string; titularesComFaturaAtrasada: number; percentual: number }

type ResultadoInadimplencia = {
  grupo: { id: string; nome: string }
  mes_inicio: string
  mes_fim: string
  criterio: string
  totais: {
    totalVidasAtivas: number
    totalTitularesComVinculoFaturamento: number
    basePercentualTitulares: number
  }
  resumoPeriodo: { titularesDistintosComAtrasada: number; percentual: number }
  porMes: PorMes[]
}

type ClienteMultiAtraso = {
  cliente_administradora_id: string
  cliente_nome: string
  quantidadeFaturasAtrasadas: number
}

type ResultadoMultiAtraso = {
  grupo: { id: string; nome: string }
  criterio: string
  clientes: ClienteMultiAtraso[]
}

export default function InadimplenciaPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(true)
  const [grupoId, setGrupoId] = useState("")
  const [mesInicio, setMesInicio] = useState(mesAtualYm())
  const [mesFim, setMesFim] = useState(mesAtualYm())
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ResultadoInadimplencia | null>(null)
  const [loadingMulti, setLoadingMulti] = useState(false)
  const [multiAtraso, setMultiAtraso] = useState<ResultadoMultiAtraso | null>(null)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    ;(async () => {
      try {
        setLoadingGrupos(true)
        const data = await GruposBeneficiariosService.buscarTodos(adm.id)
        setGrupos(data || [])
      } catch {
        toast.error("Erro ao carregar grupos")
        setGrupos([])
      } finally {
        setLoadingGrupos(false)
      }
    })()
  }, [router])

  async function consultar() {
    if (!administradoraId || !grupoId) {
      toast.error("Selecione um grupo")
      return
    }
    if (!/^\d{4}-\d{2}$/.test(mesInicio) || !/^\d{4}-\d{2}$/.test(mesFim)) {
      toast.error("Informe mês inicial e final (AAAA-MM)")
      return
    }
    if (mesInicio > mesFim) {
      toast.error("Mês inicial não pode ser maior que o mês final")
      return
    }
    try {
      setLoading(true)
      setResultado(null)
      setMultiAtraso(null)
      const qs = new URLSearchParams({
        grupo_id: grupoId,
        administradora_id: administradoraId,
        mes_inicio: mesInicio,
        mes_fim: mesFim,
      })
      const res = await fetch(`/api/administradora/financeiro/inadimplencia-grupo?${qs}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || "Erro ao consultar inadimplência")
      setResultado(data as ResultadoInadimplencia)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na consulta")
    } finally {
      setLoading(false)
    }
  }

  async function consultarMultiAtraso() {
    if (!administradoraId || !grupoId) {
      toast.error("Selecione um grupo")
      return
    }
    try {
      setLoadingMulti(true)
      setMultiAtraso(null)
      const qs = new URLSearchParams({
        grupo_id: grupoId,
        administradora_id: administradoraId,
      })
      const res = await fetch(`/api/administradora/financeiro/clientes-multi-atraso?${qs}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || "Erro na consulta")
      setMultiAtraso(data as ResultadoMultiAtraso)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na consulta")
    } finally {
      setLoadingMulti(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Inadimplência por grupo</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Indicador percentual de titulares com fatura atrasada (por mês de vencimento) e consulta de clientes ativos com
          mais de duas faturas em atraso.
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
                <Label className="text-xs font-medium text-gray-600">Grupo de beneficiários</Label>
                <Select value={grupoId} onValueChange={setGrupoId} disabled={loadingGrupos}>
                  <SelectTrigger className="h-10 border-gray-200 bg-white">
                    <SelectValue placeholder={loadingGrupos ? "Carregando..." : "Selecione o grupo"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(60vh,320px)]">
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Mês inicial</Label>
                <Input type="month" value={mesInicio} onChange={(e) => setMesInicio(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Mês final</Label>
                <Input type="month" value={mesFim} onChange={(e) => setMesFim(e.target.value)} className="h-10" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void consultar()}
                disabled={loading || !grupoId}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Consultando…
                  </>
                ) : (
                  "Consultar indicadores"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void consultarMultiAtraso()}
                disabled={loadingMulti || !grupoId}
              >
                {loadingMulti ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Consultando…
                  </>
                ) : (
                  "Clientes com +2 faturas atrasadas (ativos)"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {resultado && (
          <>
            <p className="text-xs text-gray-500 leading-relaxed">{resultado.criterio}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Vidas ativas (grupo)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-gray-900">{resultado.totais.totalVidasAtivas}</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Titulares (vínculo faturamento)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {resultado.totais.totalTitularesComVinculoFaturamento}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Base do percentual abaixo.</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Titulares inadimplentes (período)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-amber-900">
                    {resultado.resumoPeriodo.titularesDistintosComAtrasada}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Com ≥1 fatura atrasada (vencimento no intervalo).</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">% no período</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-amber-900">{resultado.resumoPeriodo.percentual}%</p>
                  <p className="text-xs text-gray-500 mt-1">Sobre a base de titulares com vínculo.</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-md border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Indicador por mês (vencimento da fatura atrasada)</CardTitle>
                <p className="text-sm text-gray-500">{resultado.grupo.nome}</p>
              </CardHeader>
              <CardContent>
                {resultado.porMes.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">Nenhum mês no intervalo.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-gray-100">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Mês</TableHead>
                          <TableHead className="font-semibold text-right">Titulares com fatura atrasada</TableHead>
                          <TableHead className="font-semibold text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultado.porMes.map((row) => (
                          <TableRow key={row.mes}>
                            <TableCell className="font-medium">{formatarMesAno(row.mes)}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.titularesComFaturaAtrasada}</TableCell>
                            <TableCell className="text-right tabular-nums text-amber-900 font-medium">
                              {row.percentual}%
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

        {multiAtraso && (
          <Card className="rounded-md border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Clientes ativos com mais de 2 faturas atrasadas</CardTitle>
              <p className="text-sm text-gray-500">{multiAtraso.grupo.nome}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{multiAtraso.criterio}</p>
            </CardHeader>
            <CardContent>
              {multiAtraso.clientes.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Nenhum cliente ativo nesta situação para este grupo.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-gray-100">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Cliente</TableHead>
                        <TableHead className="font-semibold text-right">Faturas atrasadas</TableHead>
                        <TableHead className="font-semibold w-[120px]">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {multiAtraso.clientes.map((c) => (
                        <TableRow key={c.cliente_administradora_id}>
                          <TableCell>
                            <span className="font-medium text-gray-900">{c.cliente_nome}</span>
                            <span className="block text-xs font-mono text-gray-500 break-all mt-0.5">
                              {c.cliente_administradora_id}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold text-amber-900">
                            {c.quantidadeFaturasAtrasadas}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                              <Link
                                href={`/administradora/grupos-beneficiarios/${multiAtraso.grupo.id}?aba=financeiro&cliente=${encodeURIComponent(c.cliente_administradora_id)}`}
                                className="inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Financeiro
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
