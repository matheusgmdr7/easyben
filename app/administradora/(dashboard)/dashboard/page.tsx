"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  Minus,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react"
import * as XLSX from "xlsx"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { adicionarAlertaSistema } from "@/services/administradora-alertas-service"

type EtapaSincronizacao =
  | "ocioso"
  | "iniciando"
  | "validando_chaves"
  | "montando_fila"
  | "consultando_asaas"
  | "atualizando_faturas"
  | "recarregando_dashboard"
  | "concluido"
  | "erro"

type ProgressoSincronizacao = {
  etapa: EtapaSincronizacao
  rotulo: string
  detalhe: string
  rodada: number
  maxRodadas: number
  verificadas: number
  atualizadas: number
  alteradas: number
  naoEncontradas: number
  restantes: number
  totalFila: number
  percentual: number
  avisosRecentes: string[]
  /** Offset da fila Asaas para retomar após falha/parada. */
  offsetRetomada: number
  financeiraIdRetomada: string
}

type CheckpointSync = {
  offset: number
  financeiraId: string
  verificadas: number
  atualizadas: number
  alteradas: number
  naoEncontradas: number
  restantes: number
  totalFila: number
  rodada: number
  avisos: string[]
  salvoEm: string
  todoPeriodo: boolean
  ano: string
  mes: string
}

const PROGRESSO_SYNC_INICIAL: ProgressoSincronizacao = {
  etapa: "ocioso",
  rotulo: "",
  detalhe: "",
  rodada: 0,
  maxRodadas: 80,
  verificadas: 0,
  atualizadas: 0,
  alteradas: 0,
  naoEncontradas: 0,
  restantes: 0,
  totalFila: 0,
  percentual: 0,
  avisosRecentes: [],
  offsetRetomada: 0,
  financeiraIdRetomada: "",
}

function chaveCheckpointSync(administradoraId: string) {
  return `administradora_dashboard_sync_checkpoint_${administradoraId}`
}

function lerCheckpointSync(administradoraId: string): CheckpointSync | null {
  try {
    const raw = localStorage.getItem(chaveCheckpointSync(administradoraId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CheckpointSync
    if (!parsed || typeof parsed.offset !== "number") return null
    return parsed
  } catch {
    return null
  }
}

function salvarCheckpointSync(administradoraId: string, checkpoint: CheckpointSync) {
  localStorage.setItem(chaveCheckpointSync(administradoraId), JSON.stringify(checkpoint))
}

function limparCheckpointSync(administradoraId: string) {
  localStorage.removeItem(chaveCheckpointSync(administradoraId))
}

function percentualSync(verificadas: number, restantes: number, totalFilaHint: number) {
  const total = Math.max(totalFilaHint, verificadas + Math.max(0, restantes))
  if (total <= 0) return 0
  return Math.min(99, Math.round((verificadas / total) * 100))
}

/** Extrai nomes de financeiras com key inválida para um resumo curto na UI. */
function resumirAvisosSync(avisos: string[]): string[] {
  const keysInvalidas: string[] = []
  const outros: string[] = []
  for (const raw of avisos) {
    const msg = String(raw || "").trim()
    if (!msg) continue
    const m = msg.match(/API Key inválida na financeira ["']([^"']+)["']/i)
    if (m?.[1]) {
      if (!keysInvalidas.includes(m[1])) keysInvalidas.push(m[1])
      continue
    }
    if (!outros.includes(msg)) outros.push(msg)
  }
  const resumo: string[] = []
  if (keysInvalidas.length === 1) {
    resumo.push(`API key inválida: ${keysInvalidas[0]}`)
  } else if (keysInvalidas.length > 1) {
    resumo.push(`${keysInvalidas.length} financeiras com API key inválida (${keysInvalidas.join(", ")})`)
  }
  for (const o of outros.slice(0, 2)) resumo.push(o)
  return resumo
}

type PendenciaFatura = {
  fatura_id: string
  cliente_nome: string
  vencimento: string
  status: string
  corretora: string
  link_boleto: string | null
  boletos_atrasados_total?: number
  segmento_atraso?: "um_boleto_novo" | "um_boleto_antigo" | "dois_ou_mais" | null
  cancelado_inadimplencia?: boolean
}

type UltimaSincronizacao = {
  executadoEm: string
  verificadas: number
  atualizadas: number
  alteradas: number
  /** concluida | parcial | interrompida */
  status?: "concluida" | "parcial" | "interrompida"
  periodoLabel?: string
  restantes?: number
}

function chaveUltimaSync(administradoraId: string) {
  return `administradora_dashboard_ultima_sync_${administradoraId}`
}

function lerUltimaSync(administradoraId: string): UltimaSincronizacao | null {
  try {
    const raw = localStorage.getItem(chaveUltimaSync(administradoraId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as UltimaSincronizacao
    if (!parsed?.executadoEm) return null
    return parsed
  } catch {
    return null
  }
}

function formatarLinhaUltimaSync(u: UltimaSincronizacao): string {
  const quando = new Date(u.executadoEm).toLocaleString("pt-BR")
  const status =
    u.status === "parcial"
      ? "parcial"
      : u.status === "interrompida"
        ? "interrompida"
        : u.status === "concluida"
          ? "concluída"
          : null
  const periodo = u.periodoLabel ? ` · ${u.periodoLabel}` : ""
  const statusTxt = status ? ` (${status}${periodo})` : periodo ? ` (${periodo.replace(/^ · /, "")})` : ""
  const restantes =
    u.restantes != null && u.restantes > 0 ? ` · Restantes: ~${u.restantes}` : ""
  return `Última sincronização: ${quando}${statusTxt} · Verificadas: ${u.verificadas} · Atualizadas: ${u.atualizadas} · Status alterados: ${u.alteradas}${restantes}`
}

type FinanceiraOpcao = { id: string; nome: string }

type FiltroPendencias =
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

function rotuloFiltroPendencias(f: FiltroPendencias) {
  if (f === "um_boleto_novo") return "1 boleto em aberto (novos)"
  if (f === "um_boleto_antigo") return "1 boleto em aberto (antigos)"
  if (f === "dois_ou_mais") return "2 ou mais boletos"
  if (f === "cancelados_quitacao") return "Cancelados — quitação pendente"
  return "Todos do período"
}

function rotuloSegmentoAtraso(item: PendenciaFatura) {
  if (item.segmento_atraso === "dois_ou_mais") return "2+ boletos"
  if (item.segmento_atraso === "um_boleto_novo") return "1 boleto (novo)"
  if (item.segmento_atraso === "um_boleto_antigo") return "1 boleto (antigo)"
  return "—"
}

/** 2+ boletos em aberto, exceto cancelados por inadimplência (ficam no filtro dedicado). */
function eDoisOuMaisSemCanceladoQuitacao(item: PendenciaFatura) {
  return item.segmento_atraso === "dois_ou_mais" && item.cancelado_inadimplencia !== true
}

export default function AdministradoraDashboard() {
  const agora = new Date()
  const [administradora, setAdministradora] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [progressoSync, setProgressoSync] = useState<ProgressoSincronizacao>(PROGRESSO_SYNC_INICIAL)
  /** false = respeita mês/ano do seletor; true = todos os períodos. */
  const [syncTodoPeriodo, setSyncTodoPeriodo] = useState(false)
  const [mesRef, setMesRef] = useState<string>(String(agora.getMonth() + 1).padStart(2, "0"))
  const [anoRef, setAnoRef] = useState<string>(String(agora.getFullYear()))
  const [dashboardData, setDashboardData] = useState({
    clientes_ativos: 0,
    clientes_base_mes_anterior: 0,
    clientes_variacao_abs: 0,
    clientes_variacao_percent: 0 as number | null,
    mes_referencia_variacao: { mes: 0, ano: 0 },
    faturas_pendentes: 0,
    valor_em_aberto: 0,
    valor_recebido_mes: 0,
    boletos_gerados: 0,
    boletos_gerados_mes_anterior: 0,
    boletos_variacao_abs: 0,
    boletos_variacao_percent: 0 as number | null,
  })
  const [pendenciasFaturas, setPendenciasFaturas] = useState<PendenciaFatura[]>([])
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<UltimaSincronizacao | null>(null)
  const [paginaPendencias, setPaginaPendencias] = useState(1)
  const [filtroPendencias, setFiltroPendencias] = useState<FiltroPendencias>("todos")
  const [exportandoPdfPendencias, setExportandoPdfPendencias] = useState(false)
  const [exportandoExcelPendencias, setExportandoExcelPendencias] = useState(false)
  const [financeiras, setFinanceiras] = useState<FinanceiraOpcao[]>([])
  const [financeiraId, setFinanceiraId] = useState("")
  /** Período dos cards após o último carregamento com sucesso (evita usar mês/ano do select se o usuário não clicou em Aplicar). */
  const periodoDashboardRef = useRef({
    ano: String(agora.getFullYear()),
    mes: String(agora.getMonth() + 1).padStart(2, "0"),
  })
  /** API indica que não foi possível ler filtrar por gateway (falta coluna gateway_nome, etc.). */
  const [alertaFiltroGateway, setAlertaFiltroGateway] = useState(false)
  const [mostrarValoresFinanceiros, setMostrarValoresFinanceiros] = useState(false)

  async function carregarDashboard(administradoraId: string, ano: string, mes: string, financeiraIdParam?: string) {
    const fin = financeiraIdParam !== undefined ? financeiraIdParam : financeiraId
    const qs = new URLSearchParams({
      administradora_id: administradoraId,
      ano,
      mes,
    })
    if (fin && fin.trim()) qs.set("financeira_id", fin.trim())
    const res = await fetch(`/api/administradora/dashboard?${qs.toString()}`, { cache: "no-store" })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(payload?.error || "Erro ao buscar dashboard")
    const alerta = payload?.alerta as { tipo?: string } | undefined
    setAlertaFiltroGateway(alerta?.tipo === "gateway_nome_indisponivel")
    const c = payload?.cards || {}
    setDashboardData({
      clientes_ativos: Number(c.clientes_ativos ?? 0),
      clientes_base_mes_anterior: Number(c.clientes_base_mes_anterior ?? 0),
      clientes_variacao_abs: Number(c.clientes_variacao_abs ?? 0),
      clientes_variacao_percent:
        c.clientes_variacao_percent != null && c.clientes_variacao_percent !== ""
          ? Number(c.clientes_variacao_percent)
          : null,
      mes_referencia_variacao: c.mes_referencia_variacao || { mes: 0, ano: 0 },
      faturas_pendentes: Number(c.faturas_pendentes ?? 0),
      valor_em_aberto: Number(c.valor_em_aberto ?? 0),
      valor_recebido_mes: Number(c.valor_recebido_mes ?? 0),
      boletos_gerados: Number(c.boletos_gerados ?? 0),
      boletos_gerados_mes_anterior: Number(c.boletos_gerados_mes_anterior ?? 0),
      boletos_variacao_abs: Number(c.boletos_variacao_abs ?? 0),
      boletos_variacao_percent:
        c.boletos_variacao_percent != null && c.boletos_variacao_percent !== ""
          ? Number(c.boletos_variacao_percent)
          : null,
    })
    setPendenciasFaturas(Array.isArray(payload?.pendencias_faturas) ? payload.pendencias_faturas : [])
    setPaginaPendencias(1)
    setFiltroPendencias("todos")
  }

  useEffect(() => {
    setPaginaPendencias(1)
  }, [filtroPendencias])

  useEffect(() => {
    const loadData = async () => {
      try {
        const administradoraLogada = getAdministradoraLogada()
        if (!administradoraLogada) return
        setAdministradora(administradoraLogada)
        let ultima = lerUltimaSync(administradoraLogada.id)
        const ck = lerCheckpointSync(administradoraLogada.id)
        if (ck && (ck.offset > 0 || ck.restantes > 0)) {
          const periodoCk = ck.todoPeriodo
            ? "todo o período"
            : ck.mes && ck.ano
              ? `${String(ck.mes).padStart(2, "0")}/${ck.ano}`
              : undefined
          const ultimaDoCheckpoint: UltimaSincronizacao = {
            executadoEm: ck.salvoEm || new Date().toISOString(),
            verificadas: ck.verificadas,
            atualizadas: ck.atualizadas,
            alteradas: ck.alteradas,
            status: "interrompida",
            periodoLabel: periodoCk,
            restantes: ck.restantes,
          }
          // Checkpoint mais recente sobrescreve o resumo antigo no navegador.
          if (
            !ultima ||
            new Date(ultimaDoCheckpoint.executadoEm).getTime() >= new Date(ultima.executadoEm).getTime()
          ) {
            ultima = ultimaDoCheckpoint
            localStorage.setItem(chaveUltimaSync(administradoraLogada.id), JSON.stringify(ultima))
          }
          setProgressoSync({
            ...PROGRESSO_SYNC_INICIAL,
            etapa: "erro",
            rotulo: "Sincronização interrompida",
            detalhe: `Parou em ${ck.verificadas}/${ck.totalFila || "?"} · faltam ~${ck.restantes}. Retome de onde parou.`,
            rodada: ck.rodada,
            verificadas: ck.verificadas,
            atualizadas: ck.atualizadas,
            alteradas: ck.alteradas,
            naoEncontradas: ck.naoEncontradas,
            restantes: ck.restantes,
            totalFila: ck.totalFila,
            percentual: percentualSync(ck.verificadas, ck.restantes, ck.totalFila),
            avisosRecentes: resumirAvisosSync(ck.avisos || []),
            offsetRetomada: ck.offset,
            financeiraIdRetomada: String(ck.financeiraId || ""),
          })
          if (ck.financeiraId) setFinanceiraId(String(ck.financeiraId))
          setSyncTodoPeriodo(Boolean(ck.todoPeriodo))
          if (!ck.todoPeriodo && ck.ano && ck.mes) {
            setAnoRef(String(ck.ano))
            setMesRef(String(ck.mes).padStart(2, "0"))
          }
        }
        setUltimaSincronizacao(ultima)
        const finRes = await fetch(
          `/api/administradora/financeiras?administradora_id=${encodeURIComponent(administradoraLogada.id)}`,
          { cache: "no-store" }
        )
        if (finRes.ok) {
          const lista = await finRes.json().catch(() => [])
          const arr = Array.isArray(lista) ? lista : []
          setFinanceiras(
            arr.map((f: { id?: string; nome?: string }) => ({
              id: String(f?.id || ""),
              nome: String(f?.nome || "Financeira"),
            })).filter((f: FinanceiraOpcao) => f.id)
          )
        }
        const a0 = String(agora.getFullYear())
        const m0 = String(agora.getMonth() + 1).padStart(2, "0")
        await carregarDashboard(administradoraLogada.id, a0, m0, "")
        periodoDashboardRef.current = { ano: a0, mes: m0 }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const pendenciasFiltradas = useMemo(() => {
    if (filtroPendencias === "todos") return pendenciasFaturas
    return pendenciasFaturas.filter((item) => {
      if (item.status !== "atrasada") return false
      if (filtroPendencias === "um_boleto_novo") return item.segmento_atraso === "um_boleto_novo"
      if (filtroPendencias === "um_boleto_antigo") return item.segmento_atraso === "um_boleto_antigo"
      if (filtroPendencias === "dois_ou_mais") return eDoisOuMaisSemCanceladoQuitacao(item)
      if (filtroPendencias === "cancelados_quitacao") return item.cancelado_inadimplencia === true
      return true
    })
  }, [pendenciasFaturas, filtroPendencias])

  const filtrosPendencias: { id: FiltroPendencias; label: string; count: number }[] = useMemo(() => {
    const atrasadas = pendenciasFaturas.filter((p) => p.status === "atrasada")
    return [
      { id: "todos" as const, label: "Todos do período", count: pendenciasFaturas.length },
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
  }, [pendenciasFaturas])

  async function sincronizarStatusAgora(opcoes?: { retomar?: boolean }) {
    if (!administradora?.id) return
    const maxRodadas = 120
    const retomar = Boolean(opcoes?.retomar)
    const financeiraSync = financeiraId.trim()
    const checkpointAtual = retomar ? lerCheckpointSync(administradora.id) : null
    let todoPeriodoSync = syncTodoPeriodo
    // Respeita o seletor de mês/ano (não só o último "Aplicar período").
    let anoSync = anoRef
    let mesSync = mesRef

    let offset = 0
    let verificadas = 0
    let atualizadas = 0
    let cobrancasNaoEncontradas = 0
    let rodadasBase = 0
    let totalFilaHint = 0
    let restantesAoParar: number | null = null
    const alteracoes: Array<{
      fatura_id: string
      numero_fatura: string | null
      cliente_nome: string | null
      de: string
      para: string
    }> = []
    const avisos: string[] = []
    let alteradasAcumuladasAnterior = 0

    if (retomar && checkpointAtual) {
      if (String(checkpointAtual.financeiraId || "") !== financeiraSync) {
        toast.warning(
          "O ponto de retomada é de outra financeira. Ajuste o filtro ou inicie uma sincronização nova."
        )
        return
      }
      todoPeriodoSync = Boolean(checkpointAtual.todoPeriodo)
      if (!todoPeriodoSync && checkpointAtual.ano && checkpointAtual.mes) {
        anoSync = String(checkpointAtual.ano)
        mesSync = String(checkpointAtual.mes).padStart(2, "0")
      }
      setSyncTodoPeriodo(todoPeriodoSync)
      offset = Math.max(0, Number(checkpointAtual.offset || 0))
      verificadas = Number(checkpointAtual.verificadas || 0)
      atualizadas = Number(checkpointAtual.atualizadas || 0)
      cobrancasNaoEncontradas = Number(checkpointAtual.naoEncontradas || 0)
      rodadasBase = Number(checkpointAtual.rodada || 0)
      totalFilaHint = Number(checkpointAtual.totalFila || 0)
      restantesAoParar = Number(checkpointAtual.restantes || 0)
      alteradasAcumuladasAnterior = Number(checkpointAtual.alteradas || 0)
      for (const a of checkpointAtual.avisos || []) {
        if (a && !avisos.includes(a)) avisos.push(a)
      }
    } else {
      limparCheckpointSync(administradora.id)
    }

    const rotuloPeriodoSync = todoPeriodoSync
      ? "todo o período"
      : `${mesSync}/${anoSync}`

    const gravarUltimaSync = (resumo: UltimaSincronizacao) => {
      setUltimaSincronizacao(resumo)
      localStorage.setItem(chaveUltimaSync(administradora.id), JSON.stringify(resumo))
    }

    const montarResumoSync = (
      status: NonNullable<UltimaSincronizacao["status"]>,
      restantes = 0
    ): UltimaSincronizacao => ({
      executadoEm: new Date().toISOString(),
      verificadas,
      atualizadas,
      alteradas: alteradasAcumuladasAnterior + alteracoes.length,
      status,
      periodoLabel: rotuloPeriodoSync,
      restantes: Math.max(0, restantes),
    })

    const montarCheckpoint = (offsetSalvar: number, restantes: number, rodada: number): CheckpointSync => ({
      offset: offsetSalvar,
      financeiraId: financeiraSync,
      verificadas,
      atualizadas,
      alteradas: alteradasAcumuladasAnterior + alteracoes.length,
      naoEncontradas: cobrancasNaoEncontradas,
      restantes,
      totalFila: totalFilaHint,
      rodada,
      avisos: [...avisos],
      salvoEm: new Date().toISOString(),
      todoPeriodo: todoPeriodoSync,
      ano: anoSync,
      mes: mesSync,
    })

    let rodadas = 0
    // Offset do lote em andamento (para retomar se a requisição falhar no meio).
    let offsetEmAndamento = offset

    try {
      setSincronizando(true)
      setProgressoSync({
        ...PROGRESSO_SYNC_INICIAL,
        etapa: "iniciando",
        rotulo: retomar ? "Retomando sincronização" : "Iniciando sincronização",
        detalhe: retomar
          ? `Continuando do lote ~${rodadasBase || 1} · em aberto (${rotuloPeriodoSync})…`
          : `Varredura de faturas em aberto (${rotuloPeriodoSync}) no Asaas…`,
        maxRodadas,
        percentual: retomar ? percentualSync(verificadas, restantesAoParar ?? 0, totalFilaHint) || 2 : 1,
        verificadas,
        atualizadas,
        alteradas: alteradasAcumuladasAnterior,
        naoEncontradas: cobrancasNaoEncontradas,
        restantes: Math.max(0, restantesAoParar ?? 0),
        totalFila: totalFilaHint,
        avisosRecentes: resumirAvisosSync(avisos),
        offsetRetomada: offset,
        financeiraIdRetomada: financeiraSync,
      })

      while (rodadas < maxRodadas) {
        const loteAtual = rodadasBase + rodadas + 1
        offsetEmAndamento = offset
        setProgressoSync((prev) => ({
          ...prev,
          etapa: "consultando_asaas",
          rotulo: `Consultando gateway · lote ${loteAtual}`,
          detalhe:
            totalFilaHint > 0
              ? `Em aberto (${rotuloPeriodoSync}) · ${verificadas} de ${totalFilaHint}`
              : `Montando fila de faturas em aberto (${rotuloPeriodoSync})…`,
          rodada: loteAtual,
          maxRodadas,
          verificadas,
          atualizadas,
          alteradas: alteradasAcumuladasAnterior + alteracoes.length,
          naoEncontradas: cobrancasNaoEncontradas,
          restantes: Math.max(0, restantesAoParar ?? 0),
          totalFila: totalFilaHint,
          percentual: percentualSync(verificadas, restantesAoParar ?? 0, totalFilaHint) || 2,
          avisosRecentes: resumirAvisosSync(avisos),
          offsetRetomada: offset,
          financeiraIdRetomada: financeiraSync,
        }))

        const body: {
          administradora_id: string
          financeira_id?: string
          offset: number
          modo: string
          limite?: number
          todo_periodo?: boolean
          ano?: number
          mes?: number
          validar_chaves?: boolean
        } = {
          administradora_id: administradora.id,
          offset,
          modo: "reconciliare",
          // Lotes menores reduzem risco de 504 no Netlify.
          limite: 15,
          // Valida keys só no 1º lote da onda (ou 1º após retomar).
          validar_chaves: rodadas === 0,
        }
        if (financeiraSync) body.financeira_id = financeiraSync
        if (todoPeriodoSync) {
          body.todo_periodo = true
        } else {
          body.ano = Number(anoSync)
          body.mes = Number(mesSync)
        }

        const res = await fetch("/api/sincronizar-status-asaas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const raw = await res.text()
        let payload: Record<string, unknown> = {}
        try {
          payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
        } catch {
          if (res.status === 504 || res.status === 408) {
            throw new Error(
              "Tempo limite do servidor neste lote. Use Retomar sincronização — o progresso já foi salvo."
            )
          }
          throw new Error(
            `Resposta inválida do servidor (HTTP ${res.status}). Use Retomar sincronização.`
          )
        }
        if (!res.ok) {
          if (res.status === 504 || res.status === 408) {
            throw new Error(
              "Tempo limite do servidor neste lote. Use Retomar sincronização — o progresso já foi salvo."
            )
          }
          const msg = String(payload?.error || "").trim()
          throw new Error(msg || `Erro na sincronização (HTTP ${res.status})`)
        }

        setProgressoSync((prev) => ({
          ...prev,
          etapa: "atualizando_faturas",
          rotulo: `Atualizando faturas · lote ${loteAtual}`,
          detalhe: "Aplicando status retornado pelo Asaas…",
          avisosRecentes: resumirAvisosSync(avisos),
          offsetRetomada: offset,
          financeiraIdRetomada: financeiraSync,
        }))

        const verificadasLote = Number(payload?.faturas_verificadas || 0)
        const atualizadasLote = Number(payload?.faturas_atualizadas || 0)
        const restantesLote = Number(payload?.faturas_restantes || 0)
        const totalFilaLote = Number(payload?.faturas_total_fila || 0)
        if (totalFilaLote > 0) totalFilaHint = totalFilaLote

        verificadas += verificadasLote
        atualizadas += atualizadasLote
        cobrancasNaoEncontradas += Number(payload?.cobrancas_nao_encontradas || 0)
        if (Array.isArray(payload?.alteracoes_status)) {
          alteracoes.push(
            ...(payload.alteracoes_status as Array<{
              fatura_id: string
              numero_fatura: string | null
              cliente_nome: string | null
              de: string
              para: string
            }>)
          )
        }
        if (Array.isArray(payload?.erros)) {
          for (const e of payload.erros) {
            const msg = String(e || "").trim()
            if (!msg || /sincronização parcial/i.test(msg)) continue
            if (!avisos.includes(msg)) avisos.push(msg)
          }
        }

        const proximo = payload?.proximo_offset
        if (proximo == null || proximo === "") {
          restantesAoParar = 0
          limparCheckpointSync(administradora.id)
          gravarUltimaSync(montarResumoSync("concluida", 0))
          setProgressoSync((prev) => ({
            ...prev,
            etapa: "atualizando_faturas",
            rotulo: "Varredura concluída",
            detalhe: `${verificadas} fatura(s) em aberto verificada(s) · ${rotuloPeriodoSync}`,
            rodada: loteAtual,
            verificadas,
            atualizadas,
            alteradas: alteradasAcumuladasAnterior + alteracoes.length,
            naoEncontradas: cobrancasNaoEncontradas,
            restantes: 0,
            totalFila: totalFilaHint || verificadas,
            percentual: 92,
            avisosRecentes: resumirAvisosSync(avisos),
            offsetRetomada: 0,
            financeiraIdRetomada: financeiraSync,
          }))
          break
        }

        restantesAoParar = restantesLote
        offset = Number(proximo)
        salvarCheckpointSync(administradora.id, montarCheckpoint(offset, restantesLote, loteAtual))
        // Atualiza "Última sincronização" a cada lote — antes só gravava no fim da onda.
        gravarUltimaSync(montarResumoSync("parcial", restantesLote))
        rodadas++

        setProgressoSync({
          etapa: "consultando_asaas",
          rotulo: `Lote ${loteAtual} ok`,
          detalhe: `${verificadas} de ${totalFilaHint || verificadas + restantesLote} · faltam ${restantesLote}`,
          rodada: loteAtual,
          maxRodadas,
          verificadas,
          atualizadas,
          alteradas: alteradasAcumuladasAnterior + alteracoes.length,
          naoEncontradas: cobrancasNaoEncontradas,
          restantes: restantesLote,
          totalFila: totalFilaHint,
          percentual: percentualSync(verificadas, restantesLote, totalFilaHint),
          avisosRecentes: resumirAvisosSync(avisos),
          offsetRetomada: offset,
          financeiraIdRetomada: financeiraSync,
        })
      }

      const alteradasSessao = alteracoes.length
      const alteradas = alteradasAcumuladasAnterior + alteradasSessao
      const incompleta = restantesAoParar != null && restantesAoParar > 0
      if (incompleta) {
        salvarCheckpointSync(
          administradora.id,
          montarCheckpoint(offset, Number(restantesAoParar || 0), rodadasBase + rodadas)
        )
      } else {
        limparCheckpointSync(administradora.id)
      }

      gravarUltimaSync(
        montarResumoSync(incompleta ? "parcial" : "concluida", Number(restantesAoParar || 0))
      )

      setProgressoSync((prev) => ({
        ...prev,
        etapa: "recarregando_dashboard",
        rotulo: "Atualizando dashboard",
        detalhe: "Recarregando cards e pendências…",
        percentual: 96,
        verificadas,
        atualizadas,
        alteradas,
        naoEncontradas: cobrancasNaoEncontradas,
        restantes: Math.max(0, restantesAoParar ?? 0),
        avisosRecentes: resumirAvisosSync(avisos),
        offsetRetomada: incompleta ? offset : 0,
        financeiraIdRetomada: financeiraSync,
      }))

      const pagasCorrigidas = alteracoes.filter((a) => String(a?.para || "") === "paga").length
      toast.success(
        `Sincronização ${incompleta ? "parcial" : "concluída"}: ${atualizadas} atualizada(s), ${alteradas} status alterado(s)` +
          (pagasCorrigidas > 0 ? `, ${pagasCorrigidas} marcada(s) como paga` : "") +
          `, ${verificadas} verificada(s).` +
          (incompleta ? ` Ainda restam ~${restantesAoParar} — use Retomar.` : "")
      )

      if (cobrancasNaoEncontradas > 0) {
        toast.info(
          `${cobrancasNaoEncontradas} cobrança(s) não localizadas no Asaas (outra conta, key inválida ou removidas).`
        )
      }
      const avisoKey = avisos.find((a) => /API Key inválida/i.test(a))
      if (avisoKey) {
        toast.warning(avisoKey)
      } else if (avisos.length > 0) {
        toast.info(`Sincronização com avisos: ${avisos[0]}`)
      }

      if (alteradasSessao > 0) {
        const top = alteracoes.slice(0, 8)
        const linhas = top.map((a) => {
          const nome = String(a?.cliente_nome || a?.numero_fatura || a?.fatura_id || "Fatura")
          return `- ${nome}: ${String(a?.de || "-")} -> ${String(a?.para || "-")}`
        })
        const complemento =
          alteradasSessao > top.length ? `\n... e mais ${alteradasSessao - top.length} alteração(ões).` : ""
        adicionarAlertaSistema({
          titulo: "Relatório de sincronização do gateway",
          mensagem: `Faturas verificadas: ${verificadas}\nAtualizadas: ${atualizadas}\nStatus alterados: ${alteradas}\n\n${linhas.join("\n")}${complemento}`,
          tipo: "info",
        })
      }

      const p = periodoDashboardRef.current
      await carregarDashboard(administradora.id, p.ano, p.mes, financeiraId)

      setProgressoSync((prev) => ({
        ...prev,
        etapa: "concluido",
        rotulo: incompleta ? "Sincronização parcial" : "Sincronização concluída",
        detalhe: incompleta
          ? `Ainda restam ~${restantesAoParar} faturas em aberto (${rotuloPeriodoSync}). Retome de onde parou.`
          : `${verificadas} em aberto (${rotuloPeriodoSync}) · ${atualizadas} atualizadas · ${alteradas} status alterados`,
        percentual: incompleta ? percentualSync(verificadas, Number(restantesAoParar || 0), totalFilaHint) : 100,
        restantes: Math.max(0, restantesAoParar ?? 0),
        avisosRecentes: resumirAvisosSync(avisos),
        offsetRetomada: incompleta ? offset : 0,
        financeiraIdRetomada: financeiraSync,
      }))
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao sincronizar status com o gateway"
      const ck = montarCheckpoint(
        offsetEmAndamento,
        Math.max(0, restantesAoParar ?? 0),
        Math.max(1, rodadasBase + rodadas)
      )
      salvarCheckpointSync(administradora.id, ck)
      if (ck.verificadas > 0 || ck.atualizadas > 0 || ck.offset > 0) {
        gravarUltimaSync(montarResumoSync("interrompida", ck.restantes))
      }
      setProgressoSync((prev) => ({
        ...prev,
        etapa: "erro",
        rotulo: "Falha na sincronização",
        detalhe: msg,
        percentual: prev.percentual > 0 ? prev.percentual : 0,
        verificadas: ck.verificadas,
        atualizadas: ck.atualizadas,
        alteradas: ck.alteradas,
        naoEncontradas: ck.naoEncontradas,
        restantes: ck.restantes,
        totalFila: ck.totalFila,
        avisosRecentes: resumirAvisosSync(avisos),
        offsetRetomada: ck.offset,
        financeiraIdRetomada: financeiraSync,
      }))
      toast.error(msg)
    } finally {
      setSincronizando(false)
    }
  }

  const podeRetomarSync =
    !sincronizando &&
    (progressoSync.etapa === "erro" ||
      (progressoSync.etapa === "concluido" && progressoSync.restantes > 0)) &&
    (progressoSync.offsetRetomada > 0 || progressoSync.restantes > 0)

  async function aplicarFiltroPeriodo() {
    if (!administradora?.id) return
    try {
      setLoading(true)
      await carregarDashboard(administradora.id, anoRef, mesRef, financeiraId)
      periodoDashboardRef.current = { ano: anoRef, mes: mesRef }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aplicar filtro de período")
    } finally {
      setLoading(false)
    }
  }

  async function aoMudarFinanceira(novoId: string) {
    setFinanceiraId(novoId)
    if (!administradora?.id) return
    try {
      setLoading(true)
      const p = periodoDashboardRef.current
      await carregarDashboard(administradora.id, p.ano, p.mes, novoId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aplicar financeira")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8" aria-busy="true" aria-live="polite">
        <div className="rounded-sm border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] md:p-6">
          <div className="flex items-center gap-4">
            <div className="loading-corporate shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Carregando o dashboard</p>
              <p className="mt-1 text-xs text-slate-500">Os cards e a lista aparecem juntos quando a consulta terminar.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-sm border border-slate-200 bg-slate-100/90" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-sm border border-slate-200 bg-slate-100/90" />
      </div>
    )
  }

  const nomesMesCompleto = [
    "",
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ]

  const variacaoClientes = dashboardData.clientes_variacao_abs
  const pctVariacao = dashboardData.clientes_variacao_percent
  const refV = dashboardData.mes_referencia_variacao
  const refMesTituloCompleto =
    refV.mes >= 1 && refV.mes <= 12 ? `${nomesMesCompleto[refV.mes]} de ${refV.ano}` : "mês anterior"
  const baseAnterior = dashboardData.clientes_base_mes_anterior

  function rotuloStatus(status: string) {
    const s = String(status || "").toLowerCase()
    if (s === "pendente") return "Pendente"
    if (s === "atrasada") return "Atrasada"
    if (s === "vencida") return "Vencida"
    return status || "—"
  }

  function corPontoStatus(status: string) {
    const s = String(status || "").toLowerCase()
    if (s === "vencida") return "bg-rose-500"
    if (s === "atrasada") return "bg-amber-500"
    if (s === "pendente") return "bg-sky-500"
    return "bg-slate-400"
  }

  const periodoExportLabel = `${mesRef}/${anoRef}`

  function exportarExcelPendencias() {
    if (pendenciasFiltradas.length === 0) {
      toast.error("Não há registros no filtro atual para exportar")
      return
    }
    try {
      setExportandoExcelPendencias(true)
      const wsData: (string | number)[][] = [
        ["Período", periodoExportLabel],
        ["Filtro", rotuloFiltroPendencias(filtroPendencias)],
        ["Administradora", administradora?.nome_fantasia || administradora?.nome || ""],
        [],
        ["Nº", "Cliente", "Vencimento", "Status", "Boletos em aberto", "Segmento", "Cancelado inadimpl.", "Corretora", "Link boleto"],
        ...pendenciasFiltradas.map((item, i) => [
          i + 1,
          item.cliente_nome,
          item.vencimento ? formatarData(item.vencimento) : "",
          rotuloStatus(item.status),
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
      XLSX.writeFile(wb, `dashboard-pendencias-${periodoExportLabel.replace("/", "-")}-${slugArquivo(rotuloFiltroPendencias(filtroPendencias))}.xlsx`)
      toast.success("Excel exportado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar Excel")
    } finally {
      setExportandoExcelPendencias(false)
    }
  }

  async function exportarPdfPendencias() {
    if (pendenciasFiltradas.length === 0) {
      toast.error("Não há registros no filtro atual para exportar")
      return
    }
    try {
      setExportandoPdfPendencias(true)
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
      const margin = 10
      let y = 15
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text("Dashboard — faturas atrasadas e pendentes", margin, y)
      y += 6
      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      doc.text(`Período: ${periodoExportLabel} · Filtro: ${rotuloFiltroPendencias(filtroPendencias)}`, margin, y)
      y += 5
      doc.text(`Registros: ${pendenciasFiltradas.length}`, margin, y)
      y += 8
      const headers = ["Nº", "Cliente", "Venc.", "Status", "Boletos", "Segmento", "Canc. inad.", "Corretora"]
      const colWidths = [10, 58, 22, 22, 16, 22, 22, 38]
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
          item.cancelado_inadimplencia ? "Sim" : "Não",
          item.corretora || "—",
        ]
        cells.forEach((cell, i) => {
          const w = colWidths[i] - 2
          doc.text(doc.splitTextToSize(cell, w)[0] || cell.slice(0, 30), x, y)
          x += colWidths[i]
        })
        y += rowHeight
      })
      doc.save(`dashboard-pendencias-${periodoExportLabel.replace("/", "-")}-${slugArquivo(rotuloFiltroPendencias(filtroPendencias))}.pdf`)
      toast.success("PDF exportado")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF")
    } finally {
      setExportandoPdfPendencias(false)
    }
  }

  const itensPorPaginaPendencias = 10
  const totalPaginasPendencias = Math.max(1, Math.ceil(pendenciasFiltradas.length / itensPorPaginaPendencias))
  const paginaAtualPendencias = Math.min(paginaPendencias, totalPaginasPendencias)
  const pendenciasPaginadas = pendenciasFiltradas.slice(
    (paginaAtualPendencias - 1) * itensPorPaginaPendencias,
    paginaAtualPendencias * itensPorPaginaPendencias
  )

  const btnSquare = "rounded-sm"

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="relative overflow-hidden rounded-sm border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Visão geral</p>
              <h1 className="mt-1 text-2xl md:text-[1.65rem] font-bold tracking-tight text-slate-900">
                Dashboard executivo
              </h1>
              <p className="mt-1.5 text-sm font-medium text-slate-600">
                {administradora?.nome_fantasia || administradora?.nome || "Administradora"}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-500 max-w-2xl">
                {ultimaSincronizacao
                  ? formatarLinhaUltimaSync(ultimaSincronizacao)
                  : "Última sincronização: ainda não executada neste navegador."}
              </p>
            </div>
            <div className="w-full min-w-0 lg:max-w-[min(100%,36rem)] xl:max-w-[min(100%,44rem)] lg:shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[200px] sm:max-w-[min(100%,16rem)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Período</span>
                    <div className="flex flex-wrap gap-2 items-end">
                      <select
                        value={mesRef}
                        onChange={(e) => setMesRef(e.target.value)}
                        aria-label="Mês"
                        className={`h-10 min-w-0 flex-1 sm:min-w-[9.5rem] sm:flex-initial ${btnSquare} border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]`}
                      >
                        <option value="01">Janeiro</option>
                        <option value="02">Fevereiro</option>
                        <option value="03">Março</option>
                        <option value="04">Abril</option>
                        <option value="05">Maio</option>
                        <option value="06">Junho</option>
                        <option value="07">Julho</option>
                        <option value="08">Agosto</option>
                        <option value="09">Setembro</option>
                        <option value="10">Outubro</option>
                        <option value="11">Novembro</option>
                        <option value="12">Dezembro</option>
                      </select>
                      <input
                        type="number"
                        value={anoRef}
                        onChange={(e) => setAnoRef(e.target.value)}
                        aria-label="Ano"
                        className={`h-10 w-[5.5rem] shrink-0 ${btnSquare} border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]`}
                        min={2000}
                        max={2100}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className={`${btnSquare} h-10 w-full shrink-0 border-slate-300 sm:w-auto sm:min-w-[8.5rem]`}
                    onClick={aplicarFiltroPeriodo}
                    disabled={loading || sincronizando}
                  >
                    Aplicar período
                  </Button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <label htmlFor="dashboard-financeira" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Financeira
                    </label>
                    <select
                      id="dashboard-financeira"
                      value={financeiraId}
                      onChange={(e) => void aoMudarFinanceira(e.target.value)}
                      className={`h-10 w-full min-w-0 ${btnSquare} border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A]`}
                      disabled={loading || sincronizando}
                    >
                      <option value="">Todas as financeiras</option>
                      {financeiras.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-stretch">
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 select-none">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded-sm border-slate-300"
                        checked={syncTodoPeriodo}
                        disabled={sincronizando || loading}
                        onChange={(e) => setSyncTodoPeriodo(e.target.checked)}
                      />
                      <span>
                        Sincronizar <span className="font-medium text-slate-800">todo o período</span>
                        {!syncTodoPeriodo ? (
                          <span className="text-slate-500">
                            {" "}
                            (agora: {mesRef}/{anoRef})
                          </span>
                        ) : null}
                      </span>
                    </label>
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
                      <Button
                        type="button"
                        variant="default"
                        className={`${btnSquare} h-10 w-full shrink-0 sm:min-w-[12rem]`}
                        disabled={sincronizando || loading}
                        onClick={() => void sincronizarStatusAgora()}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 shrink-0 ${sincronizando ? "animate-spin" : ""}`} />
                        {sincronizando
                          ? progressoSync.rodada > 0
                            ? `Sincronizando · lote ${progressoSync.rodada}`
                            : "Sincronizando…"
                          : "Sincronizar com gateway"}
                      </Button>
                      {podeRetomarSync ? (
                        <Button
                          type="button"
                          variant="outline"
                          className={`${btnSquare} h-10 w-full shrink-0 border-slate-300 sm:min-w-[11rem]`}
                          disabled={loading}
                          onClick={() => void sincronizarStatusAgora({ retomar: true })}
                        >
                          Retomar de onde parou
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {(sincronizando ||
                  progressoSync.etapa === "concluido" ||
                  progressoSync.etapa === "erro") &&
                progressoSync.etapa !== "ocioso" ? (
                  <div
                    className={cn(
                      "w-full border-t pt-3",
                      progressoSync.etapa === "erro"
                        ? "border-red-200"
                        : progressoSync.etapa === "concluido"
                          ? "border-emerald-200"
                          : "border-slate-200"
                    )}
                    aria-live="polite"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p
                        className={cn(
                          "min-w-0 truncate text-sm font-medium",
                          progressoSync.etapa === "erro"
                            ? "text-red-800"
                            : progressoSync.etapa === "concluido"
                              ? "text-emerald-800"
                              : "text-slate-800"
                        )}
                      >
                        {progressoSync.rotulo}
                      </p>
                      <p className="shrink-0 text-xs tabular-nums text-slate-500">
                        {progressoSync.totalFila > 0
                          ? `${progressoSync.verificadas}/${progressoSync.totalFila}`
                          : `${progressoSync.percentual}%`}
                      </p>
                    </div>
                    <Progress
                      value={progressoSync.percentual}
                      className={cn(
                        "mt-2 h-1 rounded-none bg-slate-200/80",
                        progressoSync.etapa === "erro"
                          ? "[&>div]:bg-red-600"
                          : progressoSync.etapa === "concluido"
                            ? "[&>div]:bg-emerald-600"
                            : "[&>div]:bg-[#0F172A]"
                      )}
                    />
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                      {progressoSync.detalhe}
                      {progressoSync.atualizadas > 0 ||
                      progressoSync.alteradas > 0 ||
                      progressoSync.naoEncontradas > 0
                        ? ` · ${progressoSync.atualizadas} atualiz. · ${progressoSync.alteradas} status · ${progressoSync.naoEncontradas} sem cobrança`
                        : null}
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                      Fila = faturas em aberto (pendente/atrasada) por vencimento
                      {syncTodoPeriodo
                        ? " em todos os períodos"
                        : ` no mês/ano do seletor (${mesRef}/{anoRef})`}
                      . Não inclui pagas/canceladas nem clientes.
                    </p>
                    {progressoSync.avisosRecentes.length > 0 ? (
                      <p className="mt-1.5 text-[11px] leading-snug text-amber-800/90">
                        {progressoSync.avisosRecentes.join(" · ")}
                      </p>
                    ) : null}
                    {podeRetomarSync ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className={`${btnSquare} h-8`}
                          onClick={() => void sincronizarStatusAgora({ retomar: true })}
                        >
                          Retomar sincronização
                        </Button>
                        <button
                          type="button"
                          className="text-[11px] text-slate-500 underline-offset-2 hover:underline"
                          onClick={() => {
                            if (!administradora?.id) return
                            limparCheckpointSync(administradora.id)
                            setProgressoSync(PROGRESSO_SYNC_INICIAL)
                          }}
                        >
                          Descartar ponto de retomada
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {alertaFiltroGateway && financeiraId.trim() ? (
                  <div className="w-full min-w-0 max-w-full px-0 pt-1">
                    <Alert
                      variant="warning"
                      className="w-full min-w-0 max-w-full border-amber-200 bg-amber-50/95 text-amber-950"
                    >
                      <AlertDescription className="text-xs leading-relaxed break-words sm:text-[13px] [&_code]:rounded [&_code]:bg-white/70 [&_code]:px-1 [&_code]:text-[11px]">
                        <strong className="font-semibold">Filtro por financeira não aplicado.</strong> A tabela{" "}
                        <code>faturas</code> precisa da coluna <code>gateway_nome</code> (preenchida ao gerar boletos).
                        No Supabase, execute o script{" "}
                        <code>scripts/adicionar-coluna-gateway-nome-faturas.sql</code> ou rode o{" "}
                        <code>scripts/adicionar-colunas-boleto-faturas.sql</code> atualizado. Até lá, os totais deste
                        mês incluem <strong>todas</strong> as faturas, não só a financeira escolhida.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 border-l-2 border-slate-300 pl-3">
          Recebido: <span className="font-medium text-slate-700">{mesRef}/{anoRef}</span> · Clientes: evolução vs fim de{" "}
          <span className="font-medium text-slate-700">{refMesTituloCompleto}</span>.
        </p>
        <button
          type="button"
          onClick={() => setMostrarValoresFinanceiros((visivel) => !visivel)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-pressed={mostrarValoresFinanceiros}
          aria-label={mostrarValoresFinanceiros ? "Ocultar valores financeiros" : "Mostrar valores financeiros"}
          title={mostrarValoresFinanceiros ? "Ocultar valores" : "Mostrar valores"}
        >
          {mostrarValoresFinanceiros ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Clientes ativos + evolução */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-sm border border-slate-200/90 bg-white p-5",
            "shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-200",
            "hover:border-slate-300 hover:shadow-md"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Clientes ativos</p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {dashboardData.clientes_ativos.toLocaleString("pt-BR")}
              </p>
              <p
                className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600"
                role="status"
                aria-label={`Fim de ${refMesTituloCompleto}: ${baseAnterior} cadastrados. Variação: ${variacaoClientes >= 0 ? "+" : ""}${variacaoClientes}`}
              >
                <span>
                  Fim de {refMesTituloCompleto}:{" "}
                  <span className="tabular-nums font-medium text-slate-800">
                    {baseAnterior.toLocaleString("pt-BR")}
                  </span>
                </span>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold tabular-nums",
                    variacaoClientes > 0 && "text-emerald-800",
                    variacaoClientes < 0 && "text-rose-800",
                    variacaoClientes === 0 && "text-slate-600"
                  )}
                >
                  {variacaoClientes > 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  ) : variacaoClientes < 0 ? (
                    <ArrowDownRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  ) : (
                    <Minus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  )}
                  {variacaoClientes > 0 ? "+" : ""}
                  {variacaoClientes.toLocaleString("pt-BR")}
                  {pctVariacao != null && baseAnterior > 0 ? (
                    <span className="font-medium text-slate-600">
                      {" "}
                      ({pctVariacao > 0 ? "+" : ""}
                      {pctVariacao.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%)
                    </span>
                  ) : baseAnterior === 0 && dashboardData.clientes_ativos > 0 ? (
                    <span className="font-normal text-slate-500"> (base era 0)</span>
                  ) : null}
                </span>
              </p>
            </div>
            <div
              className={cn(
                btnSquare,
                "flex h-12 w-12 shrink-0 items-center justify-center",
                "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 text-slate-600",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
                "transition-[color,box-shadow] duration-200 group-hover:border-slate-300 group-hover:text-[#0F172A]"
              )}
              aria-hidden
            >
              <Users className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* Faturas pendentes */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-sm border border-slate-200/90 bg-white p-5",
            "shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-200",
            "hover:border-slate-300 hover:shadow-md"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Faturas pendentes</p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {mostrarValoresFinanceiros ? dashboardData.faturas_pendentes.toLocaleString("pt-BR") : "••••"}
              </p>
            </div>
            <div
              className={cn(
                btnSquare,
                "flex h-12 w-12 shrink-0 items-center justify-center",
                "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 text-slate-600",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
                "transition-[color,box-shadow] duration-200 group-hover:border-slate-300 group-hover:text-[#0F172A]"
              )}
              aria-hidden
            >
              <Clock className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500 pt-3 border-t border-slate-100/90">
            Quantidade de faturas com vencimento no mês selecionado que ainda não foram pagas.
          </p>
        </div>

        {/* Valor em aberto */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-sm border border-slate-200/90 bg-white p-5",
            "shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-200",
            "hover:border-slate-300 hover:shadow-md"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Valor em aberto</p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {mostrarValoresFinanceiros ? formatarMoeda(dashboardData.valor_em_aberto || 0) : "R$ ••••••"}
              </p>
            </div>
            <div
              className={cn(
                btnSquare,
                "flex h-12 w-12 shrink-0 items-center justify-center",
                "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 text-slate-600",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
                "transition-[color,box-shadow] duration-200 group-hover:border-slate-300 group-hover:text-[#0F172A]"
              )}
              aria-hidden
            >
              <DollarSign className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500 pt-3 border-t border-slate-100/90">
            Soma das mesmas faturas pendentes do mês selecionado.
          </p>
        </div>

        {/* Recebido este mês */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-sm border border-slate-200/90 bg-white p-5",
            "shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-200",
            "hover:border-slate-300 hover:shadow-md"
          )}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F172A]" aria-hidden />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Recebido este mês</p>
              <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                {mostrarValoresFinanceiros ? formatarMoeda(dashboardData.valor_recebido_mes || 0) : "R$ ••••••"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Boletos gerados:{" "}
                <span className="font-semibold tabular-nums text-slate-800">
                  {dashboardData.boletos_gerados.toLocaleString("pt-BR")}
                </span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span>
                  {refMesTituloCompleto}:{" "}
                  <span className="tabular-nums font-medium text-slate-700">
                    {dashboardData.boletos_gerados_mes_anterior.toLocaleString("pt-BR")}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold tabular-nums",
                    dashboardData.boletos_variacao_abs > 0 && "text-emerald-800",
                    dashboardData.boletos_variacao_abs < 0 && "text-rose-800"
                  )}
                >
                  {dashboardData.boletos_variacao_abs > 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  ) : dashboardData.boletos_variacao_abs < 0 ? (
                    <ArrowDownRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  ) : (
                    <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  {dashboardData.boletos_variacao_abs > 0 ? "+" : ""}
                  {dashboardData.boletos_variacao_abs.toLocaleString("pt-BR")}
                  {dashboardData.boletos_variacao_percent != null ? (
                    <span className="font-medium text-slate-600">
                      {" "}
                      ({dashboardData.boletos_variacao_percent > 0 ? "+" : ""}
                      {dashboardData.boletos_variacao_percent.toLocaleString("pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      })}
                      %)
                    </span>
                  ) : null}
                </span>
              </p>
            </div>
            <div
              className={cn(
                btnSquare,
                "flex h-12 w-12 shrink-0 items-center justify-center",
                "border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 text-slate-600",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
                "transition-[color,box-shadow] duration-200 group-hover:border-slate-300 group-hover:text-[#0F172A]"
              )}
              aria-hidden
            >
              <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500 pt-3 border-t border-slate-100/90">
            Pagamentos do mês, contando cada cobrança uma vez. Os boletos gerados são os do vencimento deste mês.
          </p>
        </div>
      </div>

      <div className="rounded-sm border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
            Faturas atrasadas e pendentes
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
            Faturas com status pendente, vencida ou atrasada e <span className="font-medium text-slate-600">data de vencimento no período</span> selecionado (mês/ano). Corretora conforme vínculo na vida importada.
            {financeiraId ? (
              <span className="block mt-1">
                Filtro de financeira: apenas faturas geradas com a conta Asaas correspondente à opção selecionada no topo.
              </span>
            ) : null}
          </p>
        </div>
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
              disabled={pendenciasFiltradas.length === 0 || exportandoPdfPendencias}
              onClick={() => void exportarPdfPendencias()}
            >
              <FileDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              {exportandoPdfPendencias ? "Exportando…" : "PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`${btnSquare} h-8 border-slate-300 text-xs`}
              disabled={pendenciasFiltradas.length === 0 || exportandoExcelPendencias}
              onClick={exportarExcelPendencias}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              {exportandoExcelPendencias ? "Exportando…" : "Excel"}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Vencimento</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Atraso</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Corretora</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Link do boleto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendenciasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    {filtroPendencias === "todos"
                      ? "Nenhuma fatura pendente ou atrasada neste período."
                      : `Nenhum registro para o filtro "${rotuloFiltroPendencias(filtroPendencias)}".`}
                  </td>
                </tr>
              ) : (
                pendenciasPaginadas.map((item, idx) => (
                  <tr
                    key={item.fatura_id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    <td className="px-4 py-2.5 text-slate-800 font-medium">{item.cliente_nome}</td>
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
                            {item.boletos_atrasados_total != null ? ` (${item.boletos_atrasados_total} total)` : ""}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-slate-500">
            Página <span className="font-medium text-slate-700">{paginaAtualPendencias}</span> de{" "}
            <span className="font-medium text-slate-700">{totalPaginasPendencias}</span>
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
              disabled={paginaAtualPendencias <= 1}
            >
              Anterior
            </Button>
            <span className="text-sm tabular-nums text-slate-600 px-1">
              Página {paginaAtualPendencias} de {totalPaginasPendencias}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={`${btnSquare} border-slate-300`}
              onClick={() => setPaginaPendencias((p) => Math.min(totalPaginasPendencias, p + 1))}
              disabled={paginaAtualPendencias >= totalPaginasPendencias}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
