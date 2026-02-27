"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Banknote, Loader2, ExternalLink, Users, ChevronRight, FileCheck, CheckCircle2, FileText, CheckSquare, Square } from "lucide-react"
import { formatarMoeda, formatarData } from "@/utils/formatters"

interface ClienteFatura {
  id: string
  cliente_administradora_id: string
  cliente_nome: string
  cliente_email?: string
  cliente_cpf?: string
  valor_mensal: number
  produto_nome?: string
  dependentes_nomes?: string[]
}

interface BoletoGrupo {
  id: string
  cliente_administradora_id: string
  cliente_nome: string
  numero_fatura?: string
  valor_total: number
  status: string
  data_vencimento: string
  data_pagamento?: string
  boleto_url?: string
  invoice_url?: string
}

interface Financeira {
  id: string
  nome: string
  instituicao_financeira: string
  status_integracao: string
}

export default function FaturaGerarPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoBeneficiarios | null>(null)
  const [clientes, setClientes] = useState<ClienteFatura[]>([])
  const [financeiras, setFinanceiras] = useState<Financeira[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(true)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteFatura | null>(null)
  const [financeiraId, setFinanceiraId] = useState("")
  const [valor, setValor] = useState("")
  const [vencimento, setVencimento] = useState("")
  const [descricao, setDescricao] = useState("")
  const [taxaAdministracao, setTaxaAdministracao] = useState("")
  const [gerando, setGerando] = useState(false)
  const [ultimoBoletoUrl, setUltimoBoletoUrl] = useState<string | null>(null)
  const [ultimoInvoiceUrl, setUltimoInvoiceUrl] = useState<string | null>(null)
  const [faturaGerada, setFaturaGerada] = useState(false)
  const [boletosGrupo, setBoletosGrupo] = useState<BoletoGrupo[]>([])
  const [loadingBoletos, setLoadingBoletos] = useState(false)
  const [faturadosNestaSessao, setFaturadosNestaSessao] = useState<Set<string>>(new Set())
  const [selecionadosLote, setSelecionadosLote] = useState<Set<string>>(new Set())
  const [modalLoteOpen, setModalLoteOpen] = useState(false)
  const [gerandoLote, setGerandoLote] = useState(false)
  const [resultadoLote, setResultadoLote] = useState<Array<{ success: boolean; cliente_nome?: string; boleto_url?: string; error?: string }> | null>(null)
  const [financeiraLote, setFinanceiraLote] = useState("")
  const [vencimentoLote, setVencimentoLote] = useState("")
  const [taxaLote, setTaxaLote] = useState("")

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    carregarGrupos(adm.id)
    carregarFinanceiras(adm.id)
  }, [router])

  async function carregarGrupos(admId: string) {
    try {
      setLoadingGrupos(true)
      const data = await GruposBeneficiariosService.buscarTodos(admId)
      setGrupos(data || [])
    } catch {
      toast.error("Erro ao carregar grupos de beneficiários")
      setGrupos([])
    } finally {
      setLoadingGrupos(false)
    }
  }

  async function carregarClientesDoGrupo(grupoId: string) {
    if (!administradoraId) return
    try {
      setLoadingClientes(true)
      setClientes([])
      const res = await fetch(
        `/api/administradora/grupos/${grupoId}/clientes-fatura?administradora_id=${encodeURIComponent(administradoraId)}`
      )
      if (!res.ok) throw new Error("Erro ao carregar clientes do grupo")
      const data = await res.json()
      setClientes(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Erro ao carregar clientes do grupo")
      setClientes([])
    } finally {
      setLoadingClientes(false)
    }
  }

  async function carregarFinanceiras(admId: string) {
    try {
      const res = await fetch(
        `/api/administradora/financeiras?administradora_id=${encodeURIComponent(admId)}`
      )
      if (!res.ok) throw new Error("Erro ao carregar financeiras")
      const data = await res.json()
      setFinanceiras(Array.isArray(data) ? data : [])
    } catch {
      setFinanceiras([])
    }
  }

  async function selecionarGrupo(grupo: GrupoBeneficiarios) {
    setGrupoSelecionado(grupo)
    setLoadingBoletos(true)
    await carregarClientesDoGrupo(grupo.id)
    if (administradoraId) {
      try {
        const res = await fetch(
          `/api/administradora/fatura/boletos-grupo?grupo_id=${encodeURIComponent(grupo.id)}&administradora_id=${encodeURIComponent(administradoraId)}`
        )
        if (res.ok) {
          const list = await res.json()
          setBoletosGrupo(Array.isArray(list) ? list : [])
        } else setBoletosGrupo([])
      } catch {
        setBoletosGrupo([])
      }
    }
    setLoadingBoletos(false)
  }

  function abrirModal(cliente: ClienteFatura) {
    setClienteSelecionado(cliente)
    const valorBase = Number(cliente.valor_mensal ?? 0)
    setValor(String(valorBase))
    setVencimento("")
    setTaxaAdministracao("")
    setFaturaGerada(false)
    setUltimoBoletoUrl(null)
    setUltimoInvoiceUrl(null)
    // Descrição pré-carregada: Plano (produto) + Titular + quantidade de dependentes
    const partes: string[] = []
    if (cliente.produto_nome) partes.push(`Produto: ${cliente.produto_nome}`)
    partes.push(`Titular: ${cliente.cliente_nome || "—"}`)
    const qtdDeps = cliente.dependentes_nomes?.length ?? 0
    if (qtdDeps > 0) {
      partes.push(`${qtdDeps} dependente(s): ${(cliente.dependentes_nomes ?? []).join(", ")}`)
    }
    setDescricao(partes.join(". "))
    setModalOpen(true)
  }

  async function gerarBoleto() {
    if (!administradoraId || !clienteSelecionado || !financeiraId) {
      toast.error("Selecione a empresa financeira e preencha valor e vencimento")
      return
    }
    const valorNum = parseFloat(String(valor).replace(",", "."))
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Informe um valor válido para o valor base (titular + dependentes)")
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
          cliente_administradora_id: clienteSelecionado.cliente_administradora_id,
          valor: valorNum,
          vencimento: vencimento.trim().slice(0, 10),
          descricao: descricao || undefined,
          cliente_nome: clienteSelecionado.cliente_nome || undefined,
          cliente_email: clienteSelecionado.cliente_email || undefined,
          taxa_administracao: taxaNum > 0 ? taxaNum : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao gerar boleto")
      }
      toast.success("Boleto gerado com sucesso")
      const linkBoleto = data.boleto_url || data.invoice_url || data.payment_link
      setUltimoBoletoUrl(linkBoleto || null)
      setUltimoInvoiceUrl(data.invoice_url || data.boleto_url || null)
      setFaturaGerada(true)
      setFaturadosNestaSessao((prev) => new Set(prev).add(clienteSelecionado.id).add(clienteSelecionado.cliente_administradora_id))
      // Incluir o boleto recém-gerado na lista sem consultar o banco (link já veio na resposta)
      if (grupoSelecionado && linkBoleto) {
        const novoBoleto = {
          id: data.fatura_id,
          cliente_administradora_id: clienteSelecionado.cliente_administradora_id,
          cliente_nome: clienteSelecionado.cliente_nome || "Cliente",
          numero_fatura: data.numero_fatura,
          valor_total: data.valor ?? valorNum,
          status: "PENDENTE",
          data_vencimento: data.vencimento || vencimento.trim().slice(0, 10),
          data_pagamento: null,
          boleto_url: linkBoleto,
          invoice_url: data.invoice_url || linkBoleto,
        }
        setBoletosGrupo((prev) => [novoBoleto, ...prev])
      } else if (grupoSelecionado && administradoraId) {
        const resList = await fetch(
          `/api/administradora/fatura/boletos-grupo?grupo_id=${encodeURIComponent(grupoSelecionado.id)}&administradora_id=${encodeURIComponent(administradoraId)}`
        )
        if (resList.ok) {
          const list = await resList.json()
          setBoletosGrupo(Array.isArray(list) ? list : [])
        }
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar boleto")
    } finally {
      setGerando(false)
    }
  }

  function irParaAbaFinanceiro() {
    if (!grupoSelecionado || !clienteSelecionado) return
    const clienteId = clienteSelecionado.cliente_administradora_id
    const url = `/administradora/grupos-beneficiarios/${grupoSelecionado.id}?aba=financeiro&cliente=${encodeURIComponent(clienteId)}`
    router.push(url)
    setModalOpen(false)
    setClienteSelecionado(null)
  }

  function irParaAbaFinanceiroCliente(c: ClienteFatura) {
    if (!grupoSelecionado) return
    const url = `/administradora/grupos-beneficiarios/${grupoSelecionado.id}?aba=financeiro&cliente=${encodeURIComponent(c.cliente_administradora_id)}`
    router.push(url)
  }

  const clientesDisponiveisLote = clientes.filter(
    (c) =>
      !faturadosNestaSessao.has(c.id) &&
      !faturadosNestaSessao.has(c.cliente_administradora_id) &&
      !boletosGrupo.some((b) => b.cliente_administradora_id === c.cliente_administradora_id)
  )
  const selecionadosParaLote = clientesDisponiveisLote.filter(
    (c) => selecionadosLote.has(c.id) || selecionadosLote.has(c.cliente_administradora_id)
  )

  function toggleSelecaoLote(c: ClienteFatura) {
    const isFaturado =
      faturadosNestaSessao.has(c.id) ||
      faturadosNestaSessao.has(c.cliente_administradora_id) ||
      boletosGrupo.some((b) => b.cliente_administradora_id === c.cliente_administradora_id)
    if (isFaturado) return
    setSelecionadosLote((prev) => {
      const next = new Set(prev)
      const key = c.id
      if (next.has(key) || next.has(c.cliente_administradora_id)) {
        next.delete(key)
        next.delete(c.cliente_administradora_id)
      } else {
        next.add(key)
      }
      return next
    })
  }
  function selecionarTodosLote() {
    setSelecionadosLote(new Set(clientesDisponiveisLote.flatMap((c) => [c.id, c.cliente_administradora_id])))
  }
  function desmarcarTodosLote() {
    setSelecionadosLote(new Set())
  }
  function abrirModalLote() {
    setResultadoLote(null)
    setFinanceiraLote("")
    setVencimentoLote("")
    setTaxaLote("")
    setModalLoteOpen(true)
  }

  async function gerarBoletosLote() {
    if (!administradoraId || selecionadosParaLote.length === 0) {
      toast.error("Selecione pelo menos um cliente")
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
    try {
      setGerandoLote(true)
      setResultadoLote(null)
      const res = await fetch("/api/administradora/fatura/gerar-boletos-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          financeira_id: financeiraLote,
          vencimento: vencimentoLote.trim().slice(0, 10),
          taxa_administracao: taxaNum > 0 ? taxaNum : undefined,
          clientes: selecionadosParaLote.map((c) => ({
            cliente_administradora_id: c.cliente_administradora_id,
            valor: c.valor_mensal ?? 0,
            cliente_nome: c.cliente_nome,
            cliente_email: c.cliente_email,
            descricao: [
              c.produto_nome && `Produto: ${c.produto_nome}`,
              `Titular: ${c.cliente_nome || "—"}`,
              c.dependentes_nomes?.length ? `${c.dependentes_nomes.length} dependente(s): ${c.dependentes_nomes.join(", ")}` : "",
            ]
              .filter(Boolean)
              .join(". "),
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar boletos em lote")
      setResultadoLote(data.results || [])
      const resumo = data.resumo || {}
      toast.success(`${resumo.sucesso ?? 0} boleto(s) gerado(s)${resumo.erro > 0 ? `; ${resumo.erro} com erro.` : "."}`)
      const sucessos = (data.results || []).filter((r: { success: boolean }) => r.success)
      if (sucessos.length > 0) {
        setFaturadosNestaSessao((prev) => {
          const next = new Set(prev)
          sucessos.forEach((r: { cliente_administradora_id: string }) => next.add(r.cliente_administradora_id))
          return next
        })
        if (grupoSelecionado && administradoraId) {
          const resList = await fetch(
            `/api/administradora/fatura/boletos-grupo?grupo_id=${encodeURIComponent(grupoSelecionado.id)}&administradora_id=${encodeURIComponent(administradoraId)}`
          )
          if (resList.ok) {
            const list = await resList.json()
            setBoletosGrupo(Array.isArray(list) ? list : [])
          }
        }
      }
      setSelecionadosLote(new Set())
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar boletos em lote")
    } finally {
      setGerandoLote(false)
    }
  }

  if (!administradoraId) return null

  const financeirasAtivas = financeiras.filter((f) => f.status_integracao === "ativa")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Gerar fatura</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Selecione um grupo de beneficiários e gere boletos para os clientes do grupo usando uma
          financeira cadastrada (como no completar cadastro do admin).
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {financeirasAtivas.length === 0 && !loadingGrupos && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            Cadastre e ative pelo menos uma financeira (menu &quot;Financeira&quot;) para gerar boletos.
          </div>
        )}

        {/* Lista de grupos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Grupos de beneficiários
            </CardTitle>
            <p className="text-sm text-gray-500 font-normal">
              Selecione um grupo para ver os clientes e gerar faturas.
            </p>
          </CardHeader>
          <CardContent>
            {loadingGrupos ? (
              <p className="text-sm text-gray-500 py-6 text-center">Carregando grupos...</p>
            ) : grupos.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                Nenhum grupo de beneficiários encontrado.
              </p>
            ) : (
              <div className="space-y-2">
                {grupos.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => selecionarGrupo(g)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors ${
                      grupoSelecionado?.id === g.id
                        ? "border-[#0F172A] bg-[#0F172A]/5"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-medium text-gray-800">{g.nome}</span>
                    <span className="text-sm text-gray-500">
                      {g.total_clientes != null ? `${g.total_clientes} beneficiário(s)` : ""}
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Boletos já gerados do grupo */}
        {grupoSelecionado && (boletosGrupo.length > 0 || loadingBoletos) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileCheck className="h-5 w-5" />
                Boletos já gerados — {grupoSelecionado.nome}
              </CardTitle>
              <p className="text-sm text-gray-500 font-normal">
                Faturas/boletos já gerados na financeira para os clientes deste grupo. Pago, em aberto e vencimentos.
              </p>
            </CardHeader>
            <CardContent>
              {loadingBoletos ? (
                <p className="text-sm text-gray-500 py-4 text-center">Carregando boletos...</p>
              ) : boletosGrupo.length === 0 ? null : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold">Cliente</TableHead>
                      <TableHead className="font-semibold">Vencimento</TableHead>
                      <TableHead className="font-semibold">Valor</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold w-28 text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boletosGrupo.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.cliente_nome || "—"}</TableCell>
                        <TableCell className="text-gray-600">
                          {b.data_vencimento
                            ? formatarData(b.data_vencimento)
                            : "—"}
                          {b.data_pagamento && (
                            <span className="block text-xs text-green-600">
                              Pago em {formatarData(b.data_pagamento)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatarMoeda(b.valor_total)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                              b.status === "paga"
                                ? "bg-green-100 text-green-800"
                                : b.status === "atrasada"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {b.status === "paga" ? "Pago" : b.status === "atrasada" ? "Atrasada" : "Em aberto"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {(b.boleto_url || b.invoice_url) ? (
                            <a
                              href={b.boleto_url || b.invoice_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Boleto
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Clientes do grupo selecionado */}
        {grupoSelecionado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="h-5 w-5" />
                Clientes do grupo: {grupoSelecionado.nome}
              </CardTitle>
              <p className="text-sm text-gray-500 font-normal">
                Lista apenas titulares. O valor já inclui titular e dependentes vinculados. Ao gerar o boleto, a taxa de administração é somada ao valor. Selecione vários e use &quot;Gerar em lote&quot; para mesma financeira, vencimento e taxa.
              </p>
              {clientesDisponiveisLote.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-sm text-gray-600">
                    {selecionadosParaLote.length} de {clientesDisponiveisLote.length} selecionados
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={selecionarTodosLote}>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Selecionar todos
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={desmarcarTodosLote}>
                    <Square className="h-4 w-4 mr-1" />
                    Desmarcar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={abrirModalLote}
                    disabled={selecionadosParaLote.length === 0 || financeirasAtivas.length === 0}
                    className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                  >
                    <Banknote className="h-4 w-4 mr-1" />
                    Gerar em lote ({selecionadosParaLote.length})
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loadingClientes ? (
                <p className="text-sm text-gray-500 py-8 text-center">Carregando clientes...</p>
              ) : clientes.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  Nenhum cliente com vínculo de fatura neste grupo. Vincule clientes ao grupo na
                  página do grupo.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-semibold w-10">Lote</TableHead>
                      <TableHead className="font-semibold">Titular / Plano</TableHead>
                      <TableHead className="font-semibold">Valor (titular + dependentes)</TableHead>
                      <TableHead className="font-semibold w-48 text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientes.map((c) => {
                      const isFaturado = faturadosNestaSessao.has(c.id) || faturadosNestaSessao.has(c.cliente_administradora_id) || boletosGrupo.some((b) => b.cliente_administradora_id === c.cliente_administradora_id)
                      const isSelecionado = selecionadosLote.has(c.id) || selecionadosLote.has(c.cliente_administradora_id)
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="w-10">
                            {!isFaturado ? (
                              <button
                                type="button"
                                onClick={() => toggleSelecaoLote(c)}
                                className="p-1 rounded hover:bg-gray-100"
                                aria-label={isSelecionado ? "Desmarcar" : "Selecionar para lote"}
                              >
                                {isSelecionado ? <CheckSquare className="h-5 w-5 text-[#0F172A]" /> : <Square className="h-5 w-5 text-gray-400" />}
                              </button>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <span>{c.cliente_nome || "—"}</span>
                            {c.produto_nome && (
                              <span className="block text-xs text-gray-500">Plano: {c.produto_nome}</span>
                            )}
                            {c.dependentes_nomes && c.dependentes_nomes.length > 0 && (
                              <span className="block text-xs text-gray-500">Dependentes: {c.dependentes_nomes.join(", ")}</span>
                            )}
                            {c.cliente_email && !c.produto_nome && (
                              <span className="block text-xs text-gray-500">{c.cliente_email}</span>
                            )}
                          </TableCell>
                          <TableCell>{formatarMoeda(c.valor_mensal || 0)}</TableCell>
                          <TableCell className="text-right">
                            {isFaturado ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Faturado
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => irParaAbaFinanceiroCliente(c)}
                                  className="border-green-200 text-green-800 hover:bg-green-50"
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Editar fatura
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => abrirModal(c)}
                                disabled={financeirasAtivas.length === 0}
                                className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                              >
                                Gerar boleto
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl rounded-xl shadow-xl border border-gray-200">
          <DialogHeader className="space-y-1 pb-2 border-b border-gray-100">
            <DialogTitle className="text-lg font-semibold text-gray-900">Gerar fatura</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Preencha a financeira, valor e vencimento. O total será valor base + taxa de administração.
            </DialogDescription>
          </DialogHeader>
          {clienteSelecionado && (
            <div className="space-y-5 py-3">
              <div className="rounded-lg bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Beneficiário</p>
                <div>
                  <Label className="text-gray-500 text-xs">Titular</Label>
                  <p className="mt-0.5 font-semibold text-gray-900">{clienteSelecionado.cliente_nome || "—"}</p>
                </div>
                {clienteSelecionado.produto_nome && (
                  <div>
                    <Label className="text-gray-500 text-xs">Plano</Label>
                    <p className="mt-0.5 text-gray-700">{clienteSelecionado.produto_nome}</p>
                  </div>
                )}
                {(clienteSelecionado.dependentes_nomes?.length ?? 0) > 0 && (
                  <div>
                    <Label className="text-gray-500 text-xs">Dependentes vinculados</Label>
                    <p className="mt-0.5 text-sm text-gray-700">
                      {clienteSelecionado.dependentes_nomes!.length} dependente(s): {clienteSelecionado.dependentes_nomes!.join(", ")}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dados da fatura</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Financeira *</Label>
                    <Select value={financeiraId} onValueChange={setFinanceiraId}>
                      <SelectTrigger className="mt-1.5 h-10">
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
                    <Label className="text-sm">Vencimento *</Label>
                    <Input
                      type="date"
                      value={vencimento}
                      onChange={(e) => setVencimento(e.target.value)}
                      className="mt-1.5 h-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Valor base (R$) *</Label>
                    <Input
                      type="text"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="0,00"
                      className="mt-1.5 h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Taxa de administração (R$)</Label>
                    <Input
                      type="text"
                      value={taxaAdministracao}
                      onChange={(e) => setTaxaAdministracao(e.target.value)}
                      placeholder="0,00"
                      className="mt-1.5 h-10"
                    />
                  </div>
                </div>
                {(valor || taxaAdministracao) && (
                  <p className="text-sm font-semibold text-gray-900 py-1">
                    Total da fatura: {formatarMoeda((parseFloat(String(valor).replace(",", ".")) || 0) + (parseFloat(String(taxaAdministracao).replace(",", ".")) || 0))}
                  </p>
                )}
                <div>
                  <Label className="text-sm">Descrição (opcional)</Label>
                  <Input
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Produto, titular e dependentes"
                    className="mt-1.5 h-10"
                  />
                </div>
              </div>

              {faturaGerada && (ultimoBoletoUrl || ultimoInvoiceUrl) && (
                <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 flex flex-wrap gap-3">
                  <a
                    href={ultimoBoletoUrl || ultimoInvoiceUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-green-800 hover:underline font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visualizar boleto
                  </a>
                  {grupoSelecionado && (
                    <button
                      type="button"
                      onClick={irParaAbaFinanceiro}
                      className="inline-flex items-center gap-1.5 text-sm text-green-800 hover:underline font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      Ver na aba Financeiro do beneficiário
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={gerando}>
              Cancelar
            </Button>
            <Button
              onClick={gerarBoleto}
              disabled={gerando || !financeiraId}
              className="bg-[#0F172A] hover:bg-[#1E293B]"
            >
              {gerando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar boleto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gerar em lote */}
      <Dialog open={modalLoteOpen} onOpenChange={setModalLoteOpen}>
        <DialogContent className="sm:max-w-xl md:max-w-2xl rounded-xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1 pb-2 border-b border-gray-100">
            <DialogTitle className="text-lg font-semibold text-gray-900">Gerar faturas em lote</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Mesma financeira, vencimento e taxa de administração para todos. Cada cliente recebe boleto com seu valor e descrição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="rounded-lg bg-gray-50 p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Clientes selecionados ({selecionadosParaLote.length})
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                {selecionadosParaLote.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span>{c.cliente_nome || "—"}</span>
                    <span className="font-medium">{formatarMoeda(c.valor_mensal || 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Financeira *</Label>
                <Select value={financeiraLote} onValueChange={setFinanceiraLote}>
                  <SelectTrigger className="mt-1.5 h-10">
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
                <Label className="text-sm">Vencimento *</Label>
                <Input
                  type="date"
                  value={vencimentoLote}
                  onChange={(e) => setVencimentoLote(e.target.value)}
                  className="mt-1.5 h-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Taxa de administração (R$) — mesma para todos</Label>
              <Input
                type="text"
                value={taxaLote}
                onChange={(e) => setTaxaLote(e.target.value)}
                placeholder="0,00"
                className="mt-1.5 h-10"
              />
            </div>
            {resultadoLote && resultadoLote.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-3 max-h-48 overflow-y-auto space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resultado</p>
                {resultadoLote.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{r.cliente_nome || "—"}</span>
                    {r.success ? (
                      r.boleto_url ? (
                        <a href={r.boleto_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline shrink-0">
                          <ExternalLink className="h-4 w-4" /> Boleto
                        </a>
                      ) : (
                        <span className="text-green-700 font-medium shrink-0">OK</span>
                      )
                    ) : (
                      <span className="text-red-600 shrink-0">{r.error || "Erro"}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalLoteOpen(false)} disabled={gerandoLote}>
              {resultadoLote ? "Fechar" : "Cancelar"}
            </Button>
            {(!resultadoLote || resultadoLote.length === 0) && (
              <Button
                onClick={gerarBoletosLote}
                disabled={gerandoLote || !financeiraLote || !vencimentoLote.trim()}
                className="bg-[#0F172A] hover:bg-[#1E293B]"
              >
                {gerandoLote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando {selecionadosParaLote.length} boleto(s)...
                  </>
                ) : (
                  `Gerar ${selecionadosParaLote.length} boleto(s)`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
