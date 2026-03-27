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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Banknote, Loader2, ExternalLink, ChevronRight, FileCheck, CheckCircle2, FileText, CheckSquare, Square, Search, Minus, Plus, Info } from "lucide-react"
import { formatarMoeda, formatarData, formatarDataHora } from "@/utils/formatters"

interface ClienteFatura {
  id: string
  cliente_administradora_id: string
  cliente_nome: string
  cliente_email?: string
  cliente_cpf?: string
  valor_mensal: number
  produto_nome?: string
  dependentes_nomes?: string[]
  dia_vencimento?: string
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
  /** Quando a fatura/boleto foi registrado no sistema (created_at). */
  data_geracao?: string | null
  boleto_url?: string
  invoice_url?: string
}

interface Financeira {
  id: string
  nome: string
  instituicao_financeira: string
  status_integracao: string
}

function obterAnoMes(data?: string | null) {
  if (!data) return ""
  const base = String(data).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return ""
  return base.slice(0, 7)
}

/** Máximo de boletos por chamada à API (requisições menores evitam 502/timeout do gateway). */
const TAMANHO_CHUNK_LOTE_BOLETOS = 5

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
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
  const [erroCarregarClientes, setErroCarregarClientes] = useState<string | null>(null)
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
  const [selecionadosLote, setSelecionadosLote] = useState<Set<string>>(new Set())
  const [modalLoteOpen, setModalLoteOpen] = useState(false)
  const [gerandoLote, setGerandoLote] = useState(false)
  const [resultadoLote, setResultadoLote] = useState<
    Array<{
      success: boolean
      cliente_administradora_id?: string
      cliente_nome?: string
      boleto_url?: string
      error?: string
      http_status?: number
    }>
  | null>(null)
  const [financeiraLote, setFinanceiraLote] = useState("")
  const [vencimentoLote, setVencimentoLote] = useState("")
  const [taxaLote, setTaxaLote] = useState("")
  const [buscaBoletos, setBuscaBoletos] = useState("")
  const [paginaBoletos, setPaginaBoletos] = useState(1)
  const [itensPorPaginaBoletos] = useState(10)
  const [buscaClientes, setBuscaClientes] = useState("")
  const [filtroDiaVencimento, setFiltroDiaVencimento] = useState("todos")
  const [draftDiaVencimento, setDraftDiaVencimento] = useState<Record<string, string>>({})
  const [salvandoDiaCliente, setSalvandoDiaCliente] = useState<Record<string, boolean>>({})
  const [paginaClientes, setPaginaClientes] = useState(1)
  const [itensPorPaginaClientes] = useState(10)
  const [boletosMinimizado, setBoletosMinimizado] = useState(false)
  const [clientesMinimizado, setClientesMinimizado] = useState(false)
  /** Progresso durante geração em lote (chunks sequenciais). */
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

  async function carregarClientesDoGrupo(grupoId: string, options?: { silent?: boolean }) {
    if (!administradoraId) return
    try {
      setLoadingClientes(true)
      setErroCarregarClientes(null)
      setClientes([])
      const res = await fetch(
        `/api/administradora/grupos/${grupoId}/clientes-fatura?administradora_id=${encodeURIComponent(administradoraId)}`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string })?.error || "Erro ao carregar clientes do grupo")
      setClientes(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar clientes do grupo"
      setErroCarregarClientes(msg)
      if (!options?.silent) {
        toast.error(msg)
      }
      setClientes([])
    } finally {
      setLoadingClientes(false)
    }
  }

  async function carregarBoletosDoGrupo(grupoId: string, options?: { silent?: boolean }) {
    if (!administradoraId) return
    try {
      setLoadingBoletos(true)
      const res = await fetch(
        `/api/administradora/fatura/boletos-grupo?grupo_id=${encodeURIComponent(grupoId)}&administradora_id=${encodeURIComponent(administradoraId)}`
      )
      if (res.ok) {
        const list = await res.json()
        setBoletosGrupo(Array.isArray(list) ? list : [])
      } else {
        setBoletosGrupo([])
      }
    } catch (e) {
      if (!options?.silent) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar boletos do grupo")
      }
      setBoletosGrupo([])
    } finally {
      setLoadingBoletos(false)
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
    setBoletosMinimizado(false)
    setClientesMinimizado(false)
    setBuscaBoletos("")
    setBuscaClientes("")
    setPaginaBoletos(1)
    setPaginaClientes(1)
    await carregarBoletosDoGrupo(grupo.id, { silent: true })
    await carregarClientesDoGrupo(grupo.id, { silent: true })
  }

  function abrirModal(cliente: ClienteFatura) {
    setClienteSelecionado(cliente)
    const valorBase = Number(cliente.valor_mensal ?? 0)
    setValor(String(valorBase))
    const dia = String(cliente.dia_vencimento || draftDiaVencimento[cliente.id] || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
    if (dia === "01" || dia === "10") {
      const hoje = new Date()
      const anoAtual = hoje.getFullYear()
      const mesAtual = hoje.getMonth()
      const diaNum = Number(dia)
      const mesRef = hoje.getDate() <= diaNum ? mesAtual : mesAtual + 1
      const data = new Date(anoAtual, mesRef, diaNum)
      setVencimento(data.toISOString().slice(0, 10))
    } else {
      setVencimento("")
    }
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

  async function vincularDiaVencimentoCliente(cliente: ClienteFatura) {
    if (!administradoraId) return
    const dia = String(draftDiaVencimento[cliente.id] || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
    if (dia !== "01" && dia !== "10") {
      toast.error("Selecione um dia de vencimento válido (01 ou 10).")
      return
    }
    try {
      setSalvandoDiaCliente((prev) => ({ ...prev, [cliente.id]: true }))
      const res = await fetch("/api/administradora/fatura/vincular-vencimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          cliente_administradora_id: cliente.cliente_administradora_id,
          dia_vencimento: dia,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao vincular dia de vencimento")

      setClientes((prev) => prev.map((c) => (c.id === cliente.id ? { ...c, dia_vencimento: dia } : c)))
      toast.success(`Dia de vencimento ${dia} vinculado com sucesso.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao vincular dia de vencimento")
    } finally {
      setSalvandoDiaCliente((prev) => ({ ...prev, [cliente.id]: false }))
    }
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
          dia_vencimento: clienteSelecionado.dia_vencimento || draftDiaVencimento[clienteSelecionado.id] || undefined,
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
      const clienteAdministradoraIdAtualizado =
        data.cliente_administradora_id || clienteSelecionado.cliente_administradora_id
      setUltimoBoletoUrl(linkBoleto || null)
      setUltimoInvoiceUrl(data.invoice_url || data.boleto_url || null)
      setFaturaGerada(true)
      if (data.cliente_administradora_id && data.cliente_administradora_id !== clienteSelecionado.cliente_administradora_id) {
        setClientes((prev) =>
          prev.map((c) =>
            c.id === clienteSelecionado.id
              ? { ...c, cliente_administradora_id: data.cliente_administradora_id }
              : c
          )
        )
      }
      // Incluir o boleto recém-gerado na lista sem consultar o banco (link já veio na resposta)
      if (grupoSelecionado && linkBoleto) {
        const novoBoleto = {
          id: data.fatura_id,
          cliente_administradora_id: clienteAdministradoraIdAtualizado,
          cliente_nome: clienteSelecionado.cliente_nome || "Cliente",
          numero_fatura: data.numero_fatura,
          valor_total: data.valor ?? valorNum,
          status: "PENDENTE",
          data_vencimento: data.vencimento || vencimento.trim().slice(0, 10),
          data_pagamento: null,
          data_geracao: new Date().toISOString(),
          boleto_url: linkBoleto,
          invoice_url: data.invoice_url || linkBoleto,
        }
        setBoletosGrupo((prev) => [novoBoleto, ...prev])
      } else if (grupoSelecionado && administradoraId) {
        await carregarBoletosDoGrupo(grupoSelecionado.id, { silent: true })
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

  function normalizarTexto(valor?: string | null) {
    return (valor || "").toLowerCase().trim()
  }

  /**
   * Mês (YYYY-MM) de competência do próximo faturamento, alinhado ao modal individual e à regra do
   * gerar-boleto (duplicata = já existe fatura com vencimento naquele mês).
   * Antes usávamos o "mês atual" em UTC, o que não batia com vencimento em outro mês (ex.: boleto em
   * abril enquanto "hoje" ainda é março → a UI liberava e a API retornava 409).
   */
  function obterAnoMesCompetenciaParaCliente(c: ClienteFatura) {
    const dia = String(c.dia_vencimento || draftDiaVencimento[c.id] || "")
      .replace(/\D/g, "")
      .padStart(2, "0")
      .slice(-2)
    const hoje = new Date()
    if (dia === "01" || dia === "10") {
      const anoAtual = hoje.getFullYear()
      const mesAtual = hoje.getMonth()
      const diaNum = Number(dia)
      const mesRef = hoje.getDate() <= diaNum ? mesAtual : mesAtual + 1
      const data = new Date(anoAtual, mesRef, diaNum)
      const y = data.getFullYear()
      const m = String(data.getMonth() + 1).padStart(2, "0")
      return `${y}-${m}`
    }
    const y = hoje.getFullYear()
    const m = String(hoje.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  }

  /** Com modal de lote aberto e data preenchida, o mês do vencimento do lote é o mesmo critério do gerar-boletos-lote / gerar-boleto. */
  function mesReferenciaFaturamento(c: ClienteFatura) {
    if (modalLoteOpen && vencimentoLote.trim().length >= 10) {
      const m = obterAnoMes(vencimentoLote.trim())
      if (m) return m
    }
    return obterAnoMesCompetenciaParaCliente(c)
  }

  const clienteJaFaturadoNoMesCompetencia = (c: ClienteFatura) => {
    const mesRef = mesReferenciaFaturamento(c)
    return boletosGrupo.some(
      (b) =>
        b.cliente_administradora_id === c.cliente_administradora_id &&
        obterAnoMes(b.data_vencimento) === mesRef
    )
  }

  const termoBuscaBoletos = normalizarTexto(buscaBoletos)
  const boletosGrupoFiltrados = boletosGrupo.filter((b) => {
    if (!termoBuscaBoletos) return true
    const alvo = [
      b.cliente_nome,
      b.numero_fatura,
      b.status,
      b.data_vencimento,
      b.data_geracao,
    ]
      .map((v) => normalizarTexto(v))
      .join(" ")
    return alvo.includes(termoBuscaBoletos)
  })
  const totalPaginasBoletos = Math.max(1, Math.ceil(boletosGrupoFiltrados.length / itensPorPaginaBoletos))
  const boletosGrupoPaginados = boletosGrupoFiltrados.slice(
    (paginaBoletos - 1) * itensPorPaginaBoletos,
    paginaBoletos * itensPorPaginaBoletos
  )

  const termoBuscaClientes = normalizarTexto(buscaClientes)

  /** Dia 01 ou 10 considerando cadastro salvo ou rascunho no seletor (mesmo critério do filtro). */
  function diaVencimentoEfetivo(c: ClienteFatura): string {
    const dia = String(c.dia_vencimento || draftDiaVencimento[c.id] || "")
      .replace(/\D/g, "")
      .padStart(2, "0")
      .slice(-2)
    return dia === "01" || dia === "10" ? dia : ""
  }

  const clientesFiltrados = [...clientes]
    .filter((c) => {
      if (filtroDiaVencimento !== "todos" && diaVencimentoEfetivo(c) !== filtroDiaVencimento) {
        return false
      }
      if (!termoBuscaClientes) return true
      const alvo = [
        c.cliente_nome,
        c.cliente_email,
        c.cliente_cpf,
        c.produto_nome,
        ...(c.dependentes_nomes || []),
      ]
        .map((v) => normalizarTexto(v))
        .join(" ")
      return alvo.includes(termoBuscaClientes)
    })
    .sort((a, b) => {
      const fa = clienteJaFaturadoNoMesCompetencia(a)
      const fb = clienteJaFaturadoNoMesCompetencia(b)
      if (fa !== fb) return fa ? 1 : -1
      const da = diaVencimentoEfetivo(a) !== "" ? 0 : 1
      const db = diaVencimentoEfetivo(b) !== "" ? 0 : 1
      if (da !== db) return da - db
      return (a.cliente_nome || "").localeCompare(b.cliente_nome || "", "pt-BR", { sensitivity: "base" })
    })
  const totalPaginasClientes = Math.max(1, Math.ceil(clientesFiltrados.length / itensPorPaginaClientes))
  const clientesPaginados = clientesFiltrados.slice(
    (paginaClientes - 1) * itensPorPaginaClientes,
    paginaClientes * itensPorPaginaClientes
  )

  /** Elegíveis para lote na visão atual (filtro de dia + busca aplicados). */
  const clientesDisponiveisLoteFiltrados = clientesFiltrados.filter(
    (c) => !clienteJaFaturadoNoMesCompetencia(c)
  )
  const selecionadosParaLote = clientesDisponiveisLoteFiltrados.filter(
    (c) => selecionadosLote.has(c.id) || selecionadosLote.has(c.cliente_administradora_id)
  )

  function toggleSelecaoLote(c: ClienteFatura) {
    const isFaturado = clienteJaFaturadoNoMesCompetencia(c)
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
    setSelecionadosLote(
      new Set(
        clientesDisponiveisLoteFiltrados.flatMap((c) => [c.id, c.cliente_administradora_id])
      )
    )
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

  function montarClientesPayloadLote(clientesLote: ClienteFatura[]) {
    return clientesLote.map((c) => ({
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
    }))
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
    const lista = selecionadosParaLote
    const chunks = chunkArray(lista, TAMANHO_CHUNK_LOTE_BOLETOS)

    async function executarUmChunk(
      clientesChunk: ClienteFatura[]
    ): Promise<Array<{ success: boolean; cliente_administradora_id?: string; cliente_nome?: string; boleto_url?: string; error?: string; http_status?: number }>> {
      const res = await fetch("/api/administradora/fatura/gerar-boletos-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          financeira_id: financeiraLote,
          vencimento: vencimentoLote.trim().slice(0, 10),
          taxa_administracao: taxaNum > 0 ? taxaNum : undefined,
          clientes: montarClientesPayloadLote(clientesChunk),
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
            "Tempo esgotado (504): este sub-lote demorou além do limite. Tente novamente ou reduza o tamanho do sub-lote."
          )
        }
        if (res.status === 502 || res.status === 503) {
          throw new Error(
            "502/503: o gateway encerrou a conexão neste sub-lote. Alguns boletos podem já ter sido gerados — confira o histórico. Continue gerando só para quem faltar."
          )
        }
        throw new Error(
          apiErr ||
            `Falha na geração em lote (HTTP ${res.status}${res.statusText ? ` — ${res.statusText}` : ""}).`
        )
      }
      return (data.results || []) as Array<{
        success: boolean
        cliente_administradora_id?: string
        cliente_nome?: string
        boleto_url?: string
        error?: string
        http_status?: number
      }>
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
      const todosResults: Array<{
        success: boolean
        cliente_administradora_id?: string
        cliente_nome?: string
        boleto_url?: string
        error?: string
        http_status?: number
      }> = []

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
      const sucessos = todosResults.filter((r) => r.success)
      if (sucessos.length > 0) {
        if (grupoSelecionado && administradoraId) {
          await Promise.all([
            carregarBoletosDoGrupo(grupoSelecionado.id, { silent: true }),
            carregarClientesDoGrupo(grupoSelecionado.id, { silent: true }),
          ])
        }
      }
      setSelecionadosLote(new Set())
    } catch (e: unknown) {
      if (!avisoParcialExibido) {
        toast.error(e instanceof Error ? e.message : "Erro ao gerar boletos em lote")
      }
      if (grupoSelecionado && administradoraId) {
        await Promise.all([
          carregarBoletosDoGrupo(grupoSelecionado.id, { silent: true }),
          carregarClientesDoGrupo(grupoSelecionado.id, { silent: true }),
        ])
      }
    } finally {
      setGerandoLote(false)
      setProgressoLote(null)
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

      <div className="px-6 py-6">
        {financeirasAtivas.length === 0 && !loadingGrupos && (
          <Alert variant="warning" className="text-sm py-3">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Cadastre e ative pelo menos uma financeira (menu &quot;Financeira&quot;) para gerar boletos.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
          <div className="xl:col-span-3 2xl:col-span-3">
            <Card className="xl:sticky xl:top-6 rounded-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold tracking-tight">
                  Grupos de beneficiários
                </CardTitle>
                <p className="text-[15px] leading-relaxed text-gray-600 font-normal">
                  Selecione um grupo para carregar clientes e faturas.
                </p>
              </CardHeader>
              <CardContent>
                {loadingGrupos ? (
                  <div className="space-y-2 py-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : grupos.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    Nenhum grupo de beneficiários encontrado.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                    {grupos.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => selecionarGrupo(g)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-md border text-left transition-colors ${
                          grupoSelecionado?.id === g.id
                            ? "border-slate-700 bg-slate-100 hover:bg-slate-100"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className={`block text-[15px] font-semibold leading-snug ${grupoSelecionado?.id === g.id ? "text-slate-900" : "text-gray-800"}`}>
                            {g.nome}
                          </span>
                          <span className={`block text-xs mt-1 ${grupoSelecionado?.id === g.id ? "text-slate-600" : "text-gray-500"}`}>
                            {g.total_clientes != null ? `${g.total_clientes} beneficiário(s)` : ""}
                          </span>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 ${grupoSelecionado?.id === g.id ? "text-slate-600" : "text-gray-400"}`} />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-9 2xl:col-span-9 space-y-6">
            {!grupoSelecionado && (
              <Card className="rounded-md">
                <CardContent className="py-10">
                  <p className="text-sm text-center text-gray-500">
                    Selecione um grupo para carregar os dados de faturamento.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Boletos já gerados do grupo — carrega antes da lista de clientes */}
            {grupoSelecionado && (
              <Card className="rounded-md">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileCheck className="h-5 w-5" />
                      Boletos Gerados
                    </CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setBoletosMinimizado((v) => !v)}
                      className="shrink-0"
                    >
                      {boletosMinimizado ? (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Expandir
                        </>
                      ) : (
                        <>
                          <Minus className="h-4 w-4 mr-1" />
                          Minimizar
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{grupoSelecionado.nome}</p>
                  <p className="text-sm text-gray-500 font-normal">
                    Faturas e boletos gerados na financeira para os clientes deste grupo. Ordenação: mais recente primeiro
                    pela data de geração; registros antigos sem essa data usam o vencimento para ordenar, como antes.
                  </p>
                </CardHeader>
                {!boletosMinimizado && <CardContent>
              {loadingBoletos ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando histórico de boletos...
                  </div>
                  <div className="h-10 rounded-md bg-gray-100 animate-pulse max-w-md" />
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-11 rounded-md bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : boletosGrupo.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  Nenhum boleto gerado ainda para este grupo neste contexto. Após gerar, o histórico aparece aqui.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={buscaBoletos}
                      onChange={(e) => {
                        setBuscaBoletos(e.target.value)
                        setPaginaBoletos(1)
                      }}
                      placeholder="Buscar por cliente, status, nº da fatura ou data de geração..."
                      className="pl-9"
                    />
                  </div>

                  {boletosGrupoFiltrados.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">Nenhum boleto encontrado para a busca informada.</p>
                  ) : (
                    <>
                      <div className="w-full overflow-x-auto rounded-md border border-gray-100">
                        <Table className="w-full min-w-[720px] table-fixed">
                          <TableHeader>
                            <TableRow className="bg-gray-100">
                              <TableHead className="font-semibold w-[26%]">Cliente</TableHead>
                              <TableHead className="font-semibold w-[18%]">Vencimento</TableHead>
                              <TableHead className="font-semibold w-[14%]">Valor</TableHead>
                              <TableHead className="font-semibold w-[18%]">Gerado em</TableHead>
                              <TableHead className="font-semibold w-[12%]">Status</TableHead>
                              <TableHead className="font-semibold w-[12%] text-right">Link</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {boletosGrupoPaginados.map((b) => (
                              <TableRow key={b.id}>
                                <TableCell className="font-medium break-words">{b.cliente_nome || "—"}</TableCell>
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
                                <TableCell className="text-gray-600 text-sm whitespace-nowrap">
                                  {formatarDataHora(b.data_geracao)}
                                </TableCell>
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
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-gray-500">
                          Mostrando {boletosGrupoPaginados.length} de {boletosGrupoFiltrados.length} boleto(s)
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPaginaBoletos((p) => Math.max(1, p - 1))}
                            disabled={paginaBoletos === 1}
                          >
                            Anterior
                          </Button>
                          <span className="text-sm text-gray-600">
                            Página {paginaBoletos} de {totalPaginasBoletos}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPaginaBoletos((p) => Math.min(totalPaginasBoletos, p + 1))}
                            disabled={paginaBoletos >= totalPaginasBoletos}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
                </CardContent>}
              </Card>
            )}

            {/* Clientes: liberado após o carregamento dos boletos (evita ordem errada de competência no lote) */}
            {grupoSelecionado && !loadingBoletos && (
              <Card className="rounded-md">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Banknote className="h-5 w-5" />
                  Clientes do Grupo
                </CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setClientesMinimizado((v) => !v)}
                  className="shrink-0"
                >
                  {clientesMinimizado ? (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Expandir
                    </>
                  ) : (
                    <>
                      <Minus className="h-4 w-4 mr-1" />
                      Minimizar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm font-medium text-gray-800">{grupoSelecionado.nome}</p>
              <p className="text-sm text-gray-500 font-normal">
                Lista apenas titulares. O valor inclui titular e dependentes vinculados. Ao gerar boleto, a taxa de administração é somada.
                Regra mensal: cada cliente pode ser faturado uma vez por mês. O filtro de dia de vencimento restringe a lista (inclui rascunho antes de vincular); &quot;Selecionar todos&quot; marca só os que aparecem nessa lista. A ordem prioriza quem ainda não foi faturado no mês e, entre eles, quem já tem dia 01 ou 10.
              </p>
              {clientesDisponiveisLoteFiltrados.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-sm text-gray-600">
                    {selecionadosParaLote.length} de {clientesDisponiveisLoteFiltrados.length} selecionados
                    {filtroDiaVencimento !== "todos" && (
                      <span className="text-gray-500"> (vencimento dia {filtroDiaVencimento})</span>
                    )}
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
            {!clientesMinimizado && <CardContent>
              {loadingClientes ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando clientes do grupo...
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
                    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-md bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : erroCarregarClientes ? (
                <Alert variant="warning" className="py-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">Falha ao carregar clientes deste grupo.</p>
                    <p className="text-xs text-slate-600 break-words">{erroCarregarClientes}</p>
                    <div className="pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => grupoSelecionado && carregarClientesDoGrupo(grupoSelecionado.id)}
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : clientes.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  Nenhum cliente com vínculo de fatura neste grupo. Vincule clientes ao grupo na
                  página do grupo.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                    <div className="relative max-w-md w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={buscaClientes}
                        onChange={(e) => {
                          setBuscaClientes(e.target.value)
                          setPaginaClientes(1)
                        }}
                        placeholder="Buscar por titular, plano, email, CPF ou dependente..."
                        className="pl-9"
                      />
                    </div>
                    <div className="w-full md:w-48">
                      <Select
                        value={filtroDiaVencimento}
                        onValueChange={(v) => {
                          setFiltroDiaVencimento(v)
                          setPaginaClientes(1)
                        }}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Dia vencimento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os vencimentos</SelectItem>
                          <SelectItem value="01">Dia 01</SelectItem>
                          <SelectItem value="10">Dia 10</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {clientesFiltrados.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">Nenhum cliente encontrado para a busca informada.</p>
                  ) : (
                    <>
                      <div className="w-full rounded-md border border-gray-100">
                        <Table className="w-full table-fixed">
                          <TableHeader>
                            <TableRow className="bg-gray-100">
                              <TableHead className="font-semibold w-[8%]">Lote</TableHead>
                              <TableHead className="font-semibold w-[34%]">Titular / Plano</TableHead>
                              <TableHead className="font-semibold w-[12%]">Dia</TableHead>
                              <TableHead className="font-semibold w-[18%]">Valor</TableHead>
                              <TableHead className="font-semibold w-[28%] text-right">Ação</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clientesPaginados.map((c) => {
                              const isFaturado = clienteJaFaturadoNoMesCompetencia(c)
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
                                      <span className="block text-xs text-gray-500 break-words">Plano: {c.produto_nome}</span>
                                    )}
                                    {c.dependentes_nomes && c.dependentes_nomes.length > 0 && (
                                      <span className="block text-xs text-gray-500 break-words">Dependentes: {c.dependentes_nomes.join(", ")}</span>
                                    )}
                                    {c.cliente_email && !c.produto_nome && (
                                      <span className="block text-xs text-gray-500 break-all">{c.cliente_email}</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{c.dia_vencimento || "—"}</TableCell>
                                  <TableCell>{formatarMoeda(c.valor_mensal || 0)}</TableCell>
                                  <TableCell className="text-right">
                                    {isFaturado ? (
                                      <div className="flex flex-col xl:flex-row items-end justify-end gap-2">
                                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                                          <CheckCircle2 className="h-4 w-4" />
                                      Faturado no mês
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => irParaAbaFinanceiroCliente(c)}
                                          className="border-slate-300 text-slate-800 hover:bg-slate-50"
                                        >
                                          <FileText className="h-4 w-4 mr-1" />
                                          Editar fatura
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col xl:flex-row justify-end items-end gap-2">
                                        {!c.dia_vencimento && (
                                          <>
                                            <Select
                                              value={draftDiaVencimento[c.id] || ""}
                                              onValueChange={(v) =>
                                                setDraftDiaVencimento((prev) => ({ ...prev, [c.id]: v }))
                                              }
                                            >
                                              <SelectTrigger className="h-8 w-24">
                                                <SelectValue placeholder="Dia" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="01">Dia 01</SelectItem>
                                                <SelectItem value="10">Dia 10</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => vincularDiaVencimentoCliente(c)}
                                              disabled={!!salvandoDiaCliente[c.id]}
                                            >
                                              {salvandoDiaCliente[c.id] ? "Salvando..." : "Vincular"}
                                            </Button>
                                          </>
                                        )}
                                        <Button
                                          size="sm"
                                          onClick={() => abrirModal(c)}
                                          disabled={financeirasAtivas.length === 0}
                                          className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                                        >
                                          Gerar boleto
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-gray-500">
                          Mostrando {clientesPaginados.length} de {clientesFiltrados.length} cliente(s)
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPaginaClientes((p) => Math.max(1, p - 1))}
                            disabled={paginaClientes === 1}
                          >
                            Anterior
                          </Button>
                          <span className="text-sm text-gray-600">
                            Página {paginaClientes} de {totalPaginasClientes}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPaginaClientes((p) => Math.min(totalPaginasClientes, p + 1))}
                            disabled={paginaClientes >= totalPaginasClientes}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>}
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] lg:max-w-4xl xl:max-w-5xl rounded-xl shadow-xl border border-gray-200 p-0 max-h-[92vh] overflow-hidden">
          <DialogHeader className="space-y-1 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <DialogTitle className="text-lg font-semibold text-gray-900">Gerar fatura</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Preencha a financeira, valor e vencimento. O total será valor base + taxa de administração.
            </DialogDescription>
          </DialogHeader>
          {clienteSelecionado && (
            <div className="px-6 py-5 overflow-y-auto space-y-5">
              {(() => {
                const diaVinculado = String(clienteSelecionado.dia_vencimento || draftDiaVencimento[clienteSelecionado.id] || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
                const diaSelecionado = String(vencimento || "").slice(8, 10)
                if (!diaVinculado || !diaSelecionado || diaVinculado === diaSelecionado) return null
                return (
                  <Alert variant="warning" className="py-3 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      O vencimento escolhido ({diaSelecionado}) difere do dia vinculado para este cliente ({diaVinculado}).
                    </AlertDescription>
                  </Alert>
                )
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 h-fit">
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
                  <div>
                    <Label className="text-gray-500 text-xs">Dia de vencimento vinculado</Label>
                    <p className="mt-0.5 text-sm font-medium text-gray-800">{clienteSelecionado.dia_vencimento || "Não vinculado"}</p>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4 rounded-lg border border-gray-200 bg-white p-4">
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
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Total da fatura: {formatarMoeda((parseFloat(String(valor).replace(",", ".")) || 0) + (parseFloat(String(taxaAdministracao).replace(",", ".")) || 0))}
                      </p>
                    </div>
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
              </div>

              {faturaGerada && (ultimoBoletoUrl || ultimoInvoiceUrl) && (
                <Alert variant="success" className="py-3">
                  <FileCheck className="h-4 w-4" />
                  <AlertDescription className="flex flex-wrap gap-x-4 gap-y-2 [&_a]:text-slate-800 [&_button]:text-slate-800">
                    <a
                      href={ultimoBoletoUrl || ultimoInvoiceUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Visualizar boleto
                    </a>
                    {grupoSelecionado && (
                      <button
                        type="button"
                        onClick={irParaAbaFinanceiro}
                        className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        Ver na aba Financeiro do beneficiário
                      </button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-white">
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
      <Dialog
        open={modalLoteOpen}
        onOpenChange={(open) => {
          if (!open && gerandoLote) return
          setModalLoteOpen(open)
        }}
      >
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
            {gerandoLote && progressoLote && (
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm space-y-3 overflow-hidden">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-10 w-10 shrink-0 text-slate-800 animate-spin" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">Gerando boletos…</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Etapa {progressoLote.etapa} de {progressoLote.totalEtapas}
                      {progressoLote.totalEtapas > 1
                        ? ` (até ${TAMANHO_CHUNK_LOTE_BOLETOS} por etapa)`
                        : ""}
                    </p>
                    {progressoLote.processados === 0 && (
                      <p className="text-xs text-slate-500 mt-1">Enviando ao servidor…</p>
                    )}
                  </div>
                </div>
                <Progress
                  value={
                    progressoLote.total > 0
                      ? Math.min(100, Math.round((progressoLote.processados / progressoLote.total) * 100))
                      : 0
                  }
                  className={`h-2.5 bg-slate-200 [&>div]:bg-slate-800 ${progressoLote.processados === 0 ? "animate-pulse" : ""}`}
                />
                <div className="grid grid-cols-2 gap-2 text-center sm:text-left">
                  <div className="rounded-md bg-white/80 px-2 py-1.5 border border-slate-100">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Gerados com sucesso</p>
                    <p className="text-lg font-semibold tabular-nums text-emerald-800">
                      {progressoLote.geradosOk}
                      <span className="text-sm font-normal text-slate-500"> / {progressoLote.total}</span>
                    </p>
                  </div>
                  <div className="rounded-md bg-white/80 px-2 py-1.5 border border-slate-100">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Faltam na fila</p>
                    <p className="text-lg font-semibold tabular-nums text-slate-900">
                      {Math.max(0, progressoLote.total - progressoLote.processados)}
                    </p>
                  </div>
                </div>
                {progressoLote.comErro > 0 && (
                  <p className="text-xs text-amber-800 text-center sm:text-left rounded-md bg-amber-50 border border-amber-100 px-2 py-1.5">
                    Falhas até agora: {progressoLote.comErro} (detalhe ao finalizar)
                  </p>
                )}
                <p className="text-xs text-slate-500 text-center sm:text-left">
                  A barra avança após cada etapa concluída.
                </p>
              </div>
            )}
            {resultadoLote && resultadoLote.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-3 max-h-56 overflow-y-auto space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resultado por cliente</p>
                {resultadoLote.map((r, i) => (
                  <div
                    key={`${r.cliente_administradora_id || r.cliente_nome || "x"}-${i}`}
                    className="border-b border-gray-100 last:border-0 pb-2 last:pb-0 text-sm"
                  >
                    <div className="font-medium text-gray-900">
                      {r.cliente_nome || "Cliente sem nome"}
                      {r.cliente_administradora_id && (
                        <span className="block text-xs font-normal text-gray-500 font-mono truncate" title={r.cliente_administradora_id}>
                          ID: {r.cliente_administradora_id}
                        </span>
                      )}
                    </div>
                    {r.success ? (
                      <div className="mt-1 flex items-center gap-2">
                        {r.boleto_url ? (
                          <a
                            href={r.boleto_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                          >
                            <ExternalLink className="h-4 w-4" /> Abrir boleto
                          </a>
                        ) : (
                          <span className="text-green-700 font-medium">Gerado com sucesso</span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-red-700 break-words leading-relaxed">
                        {r.error || "Erro desconhecido"}
                        {typeof r.http_status === "number" && (
                          <span className="block text-[11px] text-red-600/90 mt-0.5">Código HTTP: {r.http_status}</span>
                        )}
                      </p>
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
