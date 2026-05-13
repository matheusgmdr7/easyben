"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  Search,
  ExternalLink,
  FileCheck,
  FileText,
  Banknote,
  Info,
  AlertTriangle,
} from "lucide-react"
import { formatarMoeda, formatarData } from "@/utils/formatters"

type ContagemAuditoria = {
  beneficiariosAtivos: number
  titularesAtivos: number
  dependentesAtivos: number
  titularesNaListaEmissao: number
  titularesComFaturaNoMes: number
  titularesSemFaturaNoMes: number
}

type TitularSemFatura = {
  id: string
  cliente_administradora_id: string
  cliente_nome: string
  cliente_cpf?: string
  cliente_email?: string
  produto_nome?: string
  valor_mensal?: number
  dia_vencimento?: string
  dependentes_nomes?: string[]
  motivo?: string
}

type ResultadoAuditoria = {
  grupo: { id: string; nome: string }
  mes: string
  criterio: string
  contagem: ContagemAuditoria
  titularesSemFaturaNoMes: TitularSemFatura[]
}

type Financeira = {
  id: string
  nome: string
  instituicao_financeira: string
  status_integracao: string
}

type ResultadoLoteItem = {
  success: boolean
  cliente_administradora_id?: string
  cliente_nome?: string
  boleto_url?: string
  error?: string
  http_status?: number
}

const TAMANHO_CHUNK_LOTE_BOLETOS = 5

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

function mesAtualYm() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`
}

function formatarMesAno(ym: string) {
  const [y, m] = ym.split("-").map((x) => Number(x))
  if (!y || !m || m < 1 || m > 12) return ym
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

function rotuloVencimentoNoMesAuditoria(mesYm: string, dia?: string | null) {
  const d = String(dia ?? "")
    .replace(/\D/g, "")
    .padStart(2, "0")
    .slice(-2)
  if (!d || d === "00") {
    return { principal: "—", secundario: "Sem dia de vencimento vinculado" }
  }
  const [y, m] = mesYm.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) {
    return { principal: `Dia ${d}`, secundario: "" }
  }
  if (d === "01" || d === "10") {
    const iso = `${mesYm}-${d}`
    return {
      principal: formatarData(iso),
      secundario: `Dia ${d} no mês auditado`,
    }
  }
  return {
    principal: `Dia ${d}`,
    secundario: "Na geração de boleto use dia 01 ou 10",
  }
}

function titularPodeGerarFatura(row: TitularSemFatura) {
  return !String(row.cliente_administradora_id || "").startsWith("vida:")
}

function vencimentoPadraoMesAuditoria(mesYm: string, dia?: string | null) {
  const d = String(dia ?? "")
    .replace(/\D/g, "")
    .padStart(2, "0")
    .slice(-2)
  if (d === "01" || d === "10") return `${mesYm}-${d}`
  return ""
}

function montarDescricaoTitular(t: TitularSemFatura) {
  const partes: string[] = []
  if (t.produto_nome) partes.push(`Produto: ${t.produto_nome}`)
  partes.push(`Titular: ${t.cliente_nome || "—"}`)
  const qtd = t.dependentes_nomes?.length ?? 0
  if (qtd > 0) {
    partes.push(`${qtd} dependente(s): ${(t.dependentes_nomes ?? []).join(", ")}`)
  }
  return partes.join(". ")
}

function montarPayloadLote(titulares: TitularSemFatura[]) {
  return titulares.map((c) => ({
    cliente_administradora_id: c.cliente_administradora_id,
    valor: c.valor_mensal ?? 0,
    cliente_nome: c.cliente_nome,
    cliente_email: c.cliente_email,
    descricao: montarDescricaoTitular(c),
  }))
}

export default function AuditoriaFaturasPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(true)
  const [grupoId, setGrupoId] = useState<string>("")
  const [mes, setMes] = useState(mesAtualYm())
  const [busca, setBusca] = useState("")
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ResultadoAuditoria | null>(null)

  const [paginaTitulares, setPaginaTitulares] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const [financeiras, setFinanceiras] = useState<Financeira[]>([])

  const [modalGerarAberto, setModalGerarAberto] = useState(false)
  const [titularModal, setTitularModal] = useState<TitularSemFatura | null>(null)
  const [financeiraId, setFinanceiraId] = useState("")
  const [valor, setValor] = useState("")
  const [vencimento, setVencimento] = useState("")
  const [taxaAdministracao, setTaxaAdministracao] = useState("")
  const [descricao, setDescricao] = useState("")
  const [gerando, setGerando] = useState(false)
  const [faturaGerada, setFaturaGerada] = useState(false)
  const [ultimoBoletoUrl, setUltimoBoletoUrl] = useState<string | null>(null)
  const [ultimoInvoiceUrl, setUltimoInvoiceUrl] = useState<string | null>(null)

  const [modalLoteAberto, setModalLoteAberto] = useState(false)
  const [financeiraLote, setFinanceiraLote] = useState("")
  const [vencimentoLote, setVencimentoLote] = useState("")
  const [taxaLote, setTaxaLote] = useState("")
  const [gerandoLote, setGerandoLote] = useState(false)
  const [resultadoLote, setResultadoLote] = useState<ResultadoLoteItem[] | null>(null)
  const [progressoLote, setProgressoLote] = useState<{
    total: number
    processados: number
    geradosOk: number
    comErro: number
    etapa: number
    totalEtapas: number
  } | null>(null)

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

  useEffect(() => {
    if (!administradoraId) return
    ;(async () => {
      try {
        const res = await fetch(
          `/api/administradora/financeiras?administradora_id=${encodeURIComponent(administradoraId)}`
        )
        if (!res.ok) throw new Error("Erro ao carregar financeiras")
        const data = await res.json()
        setFinanceiras(Array.isArray(data) ? data : [])
      } catch {
        setFinanceiras([])
      }
    })()
  }, [administradoraId])

  useEffect(() => {
    setPaginaTitulares(1)
  }, [busca, grupoId, mes, itensPorPagina])

  const auditar = useCallback(async () => {
    if (!administradoraId || !grupoId) {
      toast.error("Selecione um grupo")
      return
    }
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      toast.error("Informe o mês no formato AAAA-MM")
      return
    }
    try {
      setLoading(true)
      setResultado(null)
      const res = await fetch(
        `/api/administradora/auditoria/faturas-grupo?grupo_id=${encodeURIComponent(grupoId)}&administradora_id=${encodeURIComponent(administradoraId)}&mes=${encodeURIComponent(mes)}`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string })?.error || "Erro na auditoria")
      const novo = data as ResultadoAuditoria
      setResultado(novo)
      setSelecionados((prev) => {
        const ids = new Set(novo.titularesSemFaturaNoMes.map((t) => t.cliente_administradora_id))
        return new Set([...prev].filter((id) => ids.has(id)))
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na auditoria")
    } finally {
      setLoading(false)
    }
  }, [administradoraId, grupoId, mes])

  const filtrados = useMemo(() => {
    const lista = resultado?.titularesSemFaturaNoMes || []
    const t = busca.trim().toLowerCase()
    if (!t) return lista
    return lista.filter((row) => {
      const alvo = [
        row.cliente_nome,
        row.cliente_cpf,
        row.cliente_administradora_id,
        row.produto_nome,
        row.motivo,
        row.dia_vencimento,
        String(row.valor_mensal ?? ""),
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ")
      return alvo.includes(t)
    })
  }, [resultado, busca])

  const financeirasAtivas = useMemo(
    () => financeiras.filter((f) => f.status_integracao === "ativa"),
    [financeiras]
  )

  const totalPaginasTitulares = Math.max(1, Math.ceil(filtrados.length / itensPorPagina))
  const paginaTitularesClamp = Math.min(paginaTitulares, totalPaginasTitulares)
  const titularesPagina = useMemo(
    () =>
      filtrados.slice(
        (paginaTitularesClamp - 1) * itensPorPagina,
        paginaTitularesClamp * itensPorPagina
      ),
    [filtrados, paginaTitularesClamp, itensPorPagina]
  )

  const titularesSelecionadosLista = useMemo(
    () => filtrados.filter((r) => titularPodeGerarFatura(r) && selecionados.has(r.cliente_administradora_id)),
    [filtrados, selecionados]
  )

  const idsElegiveisFiltrados = useMemo(
    () => filtrados.filter(titularPodeGerarFatura).map((r) => r.cliente_administradora_id),
    [filtrados]
  )

  const idsElegiveisNaPagina = useMemo(
    () => titularesPagina.filter(titularPodeGerarFatura).map((r) => r.cliente_administradora_id),
    [titularesPagina]
  )

  const todosElegiveisPaginaSelecionados =
    idsElegiveisNaPagina.length > 0 && idsElegiveisNaPagina.every((id) => selecionados.has(id))
  const algumElegivelPaginaSelecionado = idsElegiveisNaPagina.some((id) => selecionados.has(id))

  function alternarSelecionado(clienteAdmId: string, checked: boolean) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (checked) next.add(clienteAdmId)
      else next.delete(clienteAdmId)
      return next
    })
  }

  function alternarCabecalhoPagina(checked: boolean) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      for (const id of idsElegiveisNaPagina) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function selecionarTodosBusca() {
    setSelecionados(new Set(idsElegiveisFiltrados))
  }

  function limparSelecao() {
    setSelecionados(new Set())
  }

  function abrirModalGerarUm(row: TitularSemFatura) {
    if (!titularPodeGerarFatura(row) || !resultado) return
    setTitularModal(row)
    setValor(String(Number(row.valor_mensal ?? 0)))
    setVencimento(vencimentoPadraoMesAuditoria(resultado.mes, row.dia_vencimento))
    setTaxaAdministracao("")
    setDescricao(montarDescricaoTitular(row))
    setFinanceiraId("")
    setFaturaGerada(false)
    setUltimoBoletoUrl(null)
    setUltimoInvoiceUrl(null)
    setModalGerarAberto(true)
  }

  function fecharModalGerarUm(open: boolean) {
    if (!open) {
      setModalGerarAberto(false)
      setTitularModal(null)
    }
  }

  function abrirModalLote() {
    if (titularesSelecionadosLista.length === 0) {
      toast.error("Selecione pelo menos um titular")
      return
    }
    setResultadoLote(null)
    setFinanceiraLote("")
    setVencimentoLote("")
    setTaxaLote("")
    setModalLoteAberto(true)
  }

  async function executarGerarBoleto() {
    if (!administradoraId || !titularModal || !financeiraId) {
      toast.error("Selecione a financeira e preencha valor e vencimento")
      return
    }
    const valorNum = parseFloat(String(valor).replace(",", "."))
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Informe um valor válido")
      return
    }
    if (!vencimento.trim()) {
      toast.error("Informe a data de vencimento")
      return
    }
    const taxaNum = parseFloat(String(taxaAdministracao).replace(",", ".")) || 0
    if (taxaNum < 0) {
      toast.error("Taxa de administração não pode ser negativa")
      return
    }
    try {
      setGerando(true)
      const res = await fetch("/api/administradora/fatura/gerar-boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          financeira_id: financeiraId,
          cliente_administradora_id: titularModal.cliente_administradora_id,
          valor: valorNum,
          vencimento: vencimento.trim().slice(0, 10),
          dia_vencimento: titularModal.dia_vencimento || undefined,
          descricao: descricao || undefined,
          cliente_nome: titularModal.cliente_nome || undefined,
          cliente_email: titularModal.cliente_email || undefined,
          taxa_administracao: taxaNum > 0 ? taxaNum : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Erro ao gerar boleto")
      }
      toast.success("Boleto gerado com sucesso")
      const linkBoleto = data.boleto_url || data.invoice_url || data.payment_link
      setUltimoBoletoUrl(linkBoleto || null)
      setUltimoInvoiceUrl(data.invoice_url || data.boleto_url || null)
      setFaturaGerada(true)
      await auditar()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar boleto")
    } finally {
      setGerando(false)
    }
  }

  async function executarGerarLote() {
    if (!administradoraId || titularesSelecionadosLista.length === 0) {
      toast.error("Selecione pelo menos um titular")
      return
    }
    if (!financeiraLote) {
      toast.error("Selecione a financeira")
      return
    }
    if (!vencimentoLote.trim()) {
      toast.error("Informe a data de vencimento")
      return
    }
    const taxaNum = parseFloat(String(taxaLote).replace(",", ".")) || 0
    if (taxaNum < 0) {
      toast.error("Taxa de administração não pode ser negativa")
      return
    }
    const lista = titularesSelecionadosLista
    const chunks = chunkArray(lista, TAMANHO_CHUNK_LOTE_BOLETOS)

    async function executarUmChunk(
      clientesChunk: TitularSemFatura[]
    ): Promise<ResultadoLoteItem[]> {
      const res = await fetch("/api/administradora/fatura/gerar-boletos-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          financeira_id: financeiraLote,
          vencimento: vencimentoLote.trim().slice(0, 10),
          taxa_administracao: taxaNum > 0 ? taxaNum : undefined,
          clientes: montarPayloadLote(clientesChunk),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const apiErr =
          typeof (data as { error?: string }).error === "string" && (data as { error: string }).error.trim()
            ? (data as { error: string }).error.trim()
            : ""
        if (res.status === 504) {
          throw new Error(
            "Tempo esgotado (504): este sub-lote demorou além do limite. Tente novamente ou reduza a seleção."
          )
        }
        if (res.status === 502 || res.status === 503) {
          throw new Error(
            "502/503: o gateway encerrou a conexão neste sub-lote. Alguns boletos podem já ter sido gerados — confira o resultado abaixo."
          )
        }
        throw new Error(
          apiErr ||
            `Falha na geração em lote (HTTP ${res.status}${res.statusText ? ` — ${res.statusText}` : ""}).`
        )
      }
      return (data.results || []) as ResultadoLoteItem[]
    }

    let avisoParcialExibido = false
    try {
      setGerandoLote(true)
      setResultadoLote(null)
      setProgressoLote({
        total: lista.length,
        processados: 0,
        geradosOk: 0,
        comErro: 0,
        etapa: 1,
        totalEtapas: chunks.length,
      })
      const todosResults: ResultadoLoteItem[] = []

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        setProgressoLote((prev) =>
          prev
            ? { ...prev, etapa: i + 1 }
            : {
                total: lista.length,
                processados: 0,
                geradosOk: 0,
                comErro: 0,
                etapa: i + 1,
                totalEtapas: chunks.length,
              }
        )
        try {
          const part = await executarUmChunk(chunk)
          todosResults.push(...part)
          const ok = part.filter((r) => r.success).length
          const fail = part.length - ok
          setProgressoLote((prev) =>
            prev
              ? {
                  ...prev,
                  processados: prev.processados + part.length,
                  geradosOk: prev.geradosOk + ok,
                  comErro: prev.comErro + fail,
                }
              : null
          )
        } catch (chunkErr) {
          if (todosResults.length > 0) {
            setResultadoLote(todosResults)
            toast.warning("Lote interrompido após uma ou mais etapas concluídas.", {
              description: chunkErr instanceof Error ? chunkErr.message : String(chunkErr),
              duration: 12000,
            })
            avisoParcialExibido = true
          }
          throw chunkErr
        }
      }

      setResultadoLote(todosResults)
      const nOk = todosResults.filter((r) => r.success).length
      const nErr = todosResults.filter((r) => !r.success).length
      if (nErr > 0) {
        toast.warning(`${nOk} boleto(s) gerado(s); ${nErr} falha(s). Veja o detalhe por cliente abaixo.`)
      } else {
        toast.success(`${nOk} boleto(s) gerado(s).`)
      }
      setSelecionados(new Set())
      await auditar()
    } catch (e: unknown) {
      if (!avisoParcialExibido) {
        toast.error(e instanceof Error ? e.message : "Erro ao gerar boletos em lote")
      }
      await auditar()
    } finally {
      setGerandoLote(false)
      setProgressoLote(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Auditar faturas</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Escolha o grupo e o mês para ver titulares elegíveis à emissão que ainda não possuem fatura com vencimento naquele mês.
          Gere boleto individual ou em lote aqui mesmo, sem ir para Fatura &gt; Gerar.
        </p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-7xl">
        {financeirasAtivas.length === 0 && administradoraId && (
          <Alert variant="warning" className="text-sm py-3">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Cadastre e ative pelo menos uma financeira para gerar boletos a partir desta página.
            </AlertDescription>
          </Alert>
        )}

        <Card className="rounded-md border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
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
                <Label className="text-xs font-medium text-gray-600">Mês (referência de vencimento)</Label>
                <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-10" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void auditar()}
                disabled={loading || !grupoId}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Auditando…
                  </>
                ) : (
                  "Auditar"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/administradora/fatura/gerar">Ir para Gerar fatura</Link>
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
                  <CardTitle className="text-xs font-medium text-gray-500">Beneficiários ativos (grupo)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-gray-900">{resultado.contagem.beneficiariosAtivos}</p>
                  <p className="text-xs text-gray-500 mt-1">Vidas importadas ativas; se não houver, usa titulares da lista de emissão.</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Titulares ativos</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-gray-900">{resultado.contagem.titularesAtivos}</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Dependentes ativos</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-gray-900">{resultado.contagem.dependentesAtivos}</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-gray-200 bg-white">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-xs font-medium text-gray-500">Titulares sem fatura no mês</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-2xl font-semibold text-gray-900">{resultado.contagem.titularesSemFaturaNoMes}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatarMesAno(resultado.mes)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-md border border-gray-200">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">
                  Titulares sem fatura — {resultado.grupo.nome}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Com fatura no mês: {resultado.contagem.titularesComFaturaNoMes} de{" "}
                  {resultado.contagem.titularesNaListaEmissao} na lista de emissão.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
                  <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Filtrar por nome, CPF, ID ou plano..."
                      className="pl-9 h-10"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-600 whitespace-nowrap">Por página</Label>
                      <Select
                        value={String(itensPorPagina)}
                        onValueChange={(v) => setItensPorPagina(Number(v))}
                      >
                        <SelectTrigger className="h-9 w-[88px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {idsElegiveisFiltrados.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-100 bg-gray-50/80 px-3 py-2">
                    <span className="text-sm text-gray-700">
                      <strong>{titularesSelecionadosLista.length}</strong> de {idsElegiveisFiltrados.length} selecionado(s)
                      {busca.trim() ? " (após busca)" : ""}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={selecionarTodosBusca}>
                      Selecionar todos da busca
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={limparSelecao}>
                      Limpar seleção
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={abrirModalLote}
                      disabled={titularesSelecionadosLista.length === 0 || financeirasAtivas.length === 0}
                      className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                    >
                      <Banknote className="h-4 w-4 mr-1 inline" />
                      Gerar em lote ({titularesSelecionadosLista.length})
                    </Button>
                  </div>
                )}

                {filtrados.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    {resultado.titularesSemFaturaNoMes.length === 0
                      ? "Nenhum titular da lista de emissão ficou sem fatura neste mês."
                      : "Nenhum resultado para a busca."}
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-md border border-gray-100">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-10 font-semibold">
                              <Checkbox
                                checked={
                                  todosElegiveisPaginaSelecionados
                                    ? true
                                    : algumElegivelPaginaSelecionado
                                      ? "indeterminate"
                                      : false
                                }
                                onCheckedChange={(v) => alternarCabecalhoPagina(v === true)}
                                disabled={idsElegiveisNaPagina.length === 0}
                                aria-label="Selecionar titulares elegíveis nesta página"
                              />
                            </TableHead>
                            <TableHead className="font-semibold">Titular</TableHead>
                            <TableHead className="font-semibold">CPF</TableHead>
                            <TableHead className="font-semibold">Plano</TableHead>
                            <TableHead className="font-semibold">Vencimento (mês auditado)</TableHead>
                            <TableHead className="font-semibold text-right">Valor mensal</TableHead>
                            <TableHead className="font-semibold">Cliente ADM</TableHead>
                            <TableHead className="font-semibold">Observação</TableHead>
                            <TableHead className="font-semibold w-[120px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {titularesPagina.map((row) => {
                            const ven = rotuloVencimentoNoMesAuditoria(resultado.mes, row.dia_vencimento)
                            const pode = titularPodeGerarFatura(row)
                            const marcado = selecionados.has(row.cliente_administradora_id)
                            return (
                              <TableRow key={`${row.id}-${row.cliente_administradora_id}`}>
                                <TableCell className="w-10 align-middle">
                                  {pode ? (
                                    <Checkbox
                                      checked={marcado}
                                      onCheckedChange={(v) => alternarSelecionado(row.cliente_administradora_id, v === true)}
                                      aria-label={`Selecionar ${row.cliente_nome || "titular"}`}
                                    />
                                  ) : (
                                    <span className="text-gray-300 text-xs">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{row.cliente_nome || "—"}</TableCell>
                                <TableCell className="text-gray-600 text-sm">{row.cliente_cpf || "—"}</TableCell>
                                <TableCell className="text-gray-600 text-sm">{row.produto_nome || "—"}</TableCell>
                                <TableCell className="text-sm">
                                  <span className="font-medium text-gray-900">{ven.principal}</span>
                                  {ven.secundario ? (
                                    <span className="block text-xs text-gray-500 mt-0.5">{ven.secundario}</span>
                                  ) : null}
                                </TableCell>
                                <TableCell className="text-right text-sm tabular-nums">
                                  {formatarMoeda(Number(row.valor_mensal ?? 0))}
                                </TableCell>
                                <TableCell className="text-gray-600 text-xs font-mono break-all max-w-[180px]">
                                  {row.cliente_administradora_id}
                                </TableCell>
                                <TableCell className="text-sm text-amber-800">{row.motivo || "—"}</TableCell>
                                <TableCell>
                                  {pode ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => abrirModalGerarUm(row)}
                                      disabled={financeirasAtivas.length === 0}
                                    >
                                      Gerar fatura
                                    </Button>
                                  ) : (
                                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" disabled title={row.motivo}>
                                      Gerar fatura
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                      <p className="text-sm text-gray-500">
                        Mostrando {titularesPagina.length} de {filtrados.length} titular(es) · Página{" "}
                        {paginaTitularesClamp} de {totalPaginasTitulares}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPaginaTitulares((p) => Math.max(1, p - 1))}
                          disabled={paginaTitularesClamp <= 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPaginaTitulares((p) => Math.min(totalPaginasTitulares, p + 1))}
                          disabled={paginaTitularesClamp >= totalPaginasTitulares}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={modalGerarAberto} onOpenChange={fecharModalGerarUm}>
        <DialogContent className="w-[95vw] max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar fatura</DialogTitle>
            <DialogDescription>
              Mês da auditoria: {formatarMesAno(resultado?.mes || "")}. Preencha financeira, valor e vencimento.
            </DialogDescription>
          </DialogHeader>
          {titularModal && resultado && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
                <p>
                  <span className="text-gray-500">Titular:</span>{" "}
                  <span className="font-medium text-gray-900">{titularModal.cliente_nome}</span>
                </p>
                {titularModal.produto_nome && (
                  <p>
                    <span className="text-gray-500">Plano:</span> {titularModal.produto_nome}
                  </p>
                )}
                <p>
                  <span className="text-gray-500">Dia vencimento:</span> {titularModal.dia_vencimento || "—"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Financeira *</Label>
                  <Select value={financeiraId} onValueChange={setFinanceiraId}>
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {financeirasAtivas.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vencimento *</Label>
                  <Input
                    type="date"
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                    className="mt-1 h-10"
                  />
                </div>
                <div>
                  <Label>Valor base (R$) *</Label>
                  <Input
                    type="text"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="mt-1 h-10"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label>Taxa de administração (R$)</Label>
                  <Input
                    type="text"
                    value={taxaAdministracao}
                    onChange={(e) => setTaxaAdministracao(e.target.value)}
                    className="mt-1 h-10"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1 h-10" />
              </div>

              {faturaGerada && (ultimoBoletoUrl || ultimoInvoiceUrl) && (
                <Alert variant="success" className="py-3">
                  <FileCheck className="h-4 w-4" />
                  <AlertDescription className="flex flex-wrap gap-x-4 gap-y-2">
                    <a
                      href={ultimoBoletoUrl || ultimoInvoiceUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Visualizar boleto
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `/administradora/grupos-beneficiarios/${resultado.grupo.id}?aba=financeiro&cliente=${encodeURIComponent(titularModal.cliente_administradora_id)}`
                        router.push(url)
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Ver na aba Financeiro
                    </button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => fecharModalGerarUm(false)} disabled={gerando}>
              Fechar
            </Button>
            <Button onClick={() => void executarGerarBoleto()} disabled={gerando || !financeiraId} className="bg-[#0F172A] hover:bg-[#1E293B]">
              {gerando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando…
                </>
              ) : (
                "Gerar boleto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalLoteAberto}
        onOpenChange={(open) => {
          if (!open && gerandoLote) return
          setModalLoteAberto(open)
          if (!open) {
            setResultadoLote(null)
            setProgressoLote(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar faturas em lote</DialogTitle>
            <DialogDescription>
              Mesma financeira, vencimento e taxa para todos. Cada titular usa seu valor e descrição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-gray-50 p-3 max-h-40 overflow-y-auto border border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Selecionados ({titularesSelecionadosLista.length})
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                {titularesSelecionadosLista.map((c) => (
                  <li key={c.cliente_administradora_id} className="flex justify-between gap-2">
                    <span>{c.cliente_nome || "—"}</span>
                    <span className="font-medium tabular-nums">{formatarMoeda(c.valor_mensal || 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Financeira *</Label>
                <Select value={financeiraLote} onValueChange={setFinanceiraLote}>
                  <SelectTrigger className="mt-1 h-10">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {financeirasAtivas.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={vencimentoLote}
                  onChange={(e) => setVencimentoLote(e.target.value)}
                  className="mt-1 h-10"
                />
              </div>
            </div>
            <div>
              <Label>Taxa de administração (R$) — mesma para todos</Label>
              <Input
                type="text"
                value={taxaLote}
                onChange={(e) => setTaxaLote(e.target.value)}
                placeholder="0,00"
                className="mt-1 h-10"
              />
            </div>

            {gerandoLote && progressoLote && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-8 w-8 shrink-0 animate-spin text-slate-800" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Gerando boletos…</p>
                    <p className="text-xs text-slate-600">
                      Etapa {progressoLote.etapa} de {progressoLote.totalEtapas}
                    </p>
                  </div>
                </div>
                <Progress
                  value={
                    progressoLote.total > 0
                      ? Math.min(100, Math.round((progressoLote.processados / progressoLote.total) * 100))
                      : 0
                  }
                  className="h-2"
                />
              </div>
            )}

            {resultadoLote && resultadoLote.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-3 max-h-52 overflow-y-auto space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resultado por cliente</p>
                {resultadoLote.map((r, i) => (
                  <div
                    key={`${r.cliente_administradora_id || r.cliente_nome || "x"}-${i}`}
                    className="border-b border-gray-100 last:border-0 pb-2 last:pb-0 text-sm"
                  >
                    <div className="font-medium text-gray-900">{r.cliente_nome || "Cliente"}</div>
                    {r.success ? (
                      r.boleto_url ? (
                        <a
                          href={r.boleto_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Abrir boleto
                        </a>
                      ) : (
                        <span className="text-green-700 text-xs">Gerado</span>
                      )
                    ) : (
                      <p className="text-xs text-red-700 mt-1">{r.error || "Erro"}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalLoteAberto(false)} disabled={gerandoLote}>
              {resultadoLote?.length ? "Fechar" : "Cancelar"}
            </Button>
            {(!resultadoLote || resultadoLote.length === 0) && (
              <Button
                onClick={() => void executarGerarLote()}
                disabled={gerandoLote || !financeiraLote || !vencimentoLote.trim()}
                className="bg-[#0F172A] hover:bg-[#1E293B]"
              >
                {gerandoLote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando…
                  </>
                ) : (
                  `Gerar ${titularesSelecionadosLista.length} boleto(s)`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
