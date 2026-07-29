"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  FaturasPendentesPainel,
  type PendenciaFaturaItem,
} from "@/components/administradora/faturas-pendentes-painel"
import { WhatsAppCobrancasConfig } from "@/components/administradora/whatsapp-cobrancas-config"
import { WhatsAppMensagensHistorico } from "@/components/administradora/whatsapp-mensagens-historico"

type FinanceiraOpcao = { id: string; nome: string }

const btnSquare = "rounded-sm"

export default function CobrancasFinanceiroPage() {
  const agora = new Date()
  const [administradora, setAdministradora] = useState<{
    id: string
    nome?: string
    nome_fantasia?: string
    telefone?: string
    tenant_id?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [mesRef, setMesRef] = useState(String(agora.getMonth() + 1).padStart(2, "0"))
  const [anoRef, setAnoRef] = useState(String(agora.getFullYear()))
  const [pendencias, setPendencias] = useState<PendenciaFaturaItem[]>([])
  const [financeiras, setFinanceiras] = useState<FinanceiraOpcao[]>([])
  const [financeiraId, setFinanceiraId] = useState("")
  const [alertaFiltroGateway, setAlertaFiltroGateway] = useState(false)
  const [whatsappAutomaticoAtivo, setWhatsappAutomaticoAtivo] = useState(false)
  const [statusWhatsAppPorFatura, setStatusWhatsAppPorFatura] = useState<
    Record<string, { status: string; event_type?: string; created_at?: string }>
  >({})

  async function carregarStatusWhatsApp(administradoraId: string, faturaIds: string[]) {
    if (faturaIds.length === 0) {
      setStatusWhatsAppPorFatura({})
      return
    }
    try {
      const res = await fetch("/api/administradora/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ administradora_id: administradoraId, fatura_ids: faturaIds }),
      })
      const data = await res.json()
      if (res.ok && data.por_fatura) {
        setStatusWhatsAppPorFatura(data.por_fatura)
      }
    } catch {
      /* opcional */
    }
  }

  async function carregarSettingsWhatsApp(administradoraId: string) {
    try {
      const res = await fetch(
        `/api/administradora/whatsapp/settings?administradora_id=${encodeURIComponent(administradoraId)}`,
        { cache: "no-store" }
      )
      const data = await res.json()
      if (res.ok) {
        setWhatsappAutomaticoAtivo(Boolean(data.settings?.whatsapp_automatico_ativo))
      }
    } catch {
      /* opcional */
    }
  }

  async function carregarPendencias(administradoraId: string, ano: string, mes: string, finId?: string) {
    const fin = finId !== undefined ? finId : financeiraId
    const qs = new URLSearchParams({
      administradora_id: administradoraId,
      ano,
      mes,
    })
    if (fin?.trim()) qs.set("financeira_id", fin.trim())

    const res = await fetch(`/api/administradora/dashboard?${qs.toString()}`, { cache: "no-store" })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(payload?.error || "Erro ao carregar cobranças")

    const alerta = payload?.alerta as { tipo?: string } | undefined
    setAlertaFiltroGateway(alerta?.tipo === "gateway_nome_indisponivel")
    const lista = Array.isArray(payload?.pendencias_faturas) ? payload.pendencias_faturas : []
    setPendencias(lista)
    void carregarStatusWhatsApp(
      administradoraId,
      lista.map((p: PendenciaFaturaItem) => p.fatura_id).filter(Boolean)
    )
  }

  useEffect(() => {
    const load = async () => {
      try {
        const adm = getAdministradoraLogada()
        if (!adm?.id) return
        setAdministradora(adm)

        const finRes = await fetch(
          `/api/administradora/financeiras?administradora_id=${encodeURIComponent(adm.id)}`,
          { cache: "no-store" }
        )
        const finPayload = await finRes.json().catch(() => [])
        const listaFin = Array.isArray(finPayload)
          ? finPayload
          : Array.isArray(finPayload?.financeiras)
            ? finPayload.financeiras
            : []
        if (finRes.ok) {
          setFinanceiras(
            listaFin
              .map((f: { id?: string; nome?: string }) => ({
                id: String(f.id || ""),
                nome: String(f.nome || "Financeira"),
              }))
              .filter((f: FinanceiraOpcao) => f.id)
          )
        }

        const ano = String(agora.getFullYear())
        const mes = String(agora.getMonth() + 1).padStart(2, "0")
        await carregarSettingsWhatsApp(adm.id)
        await carregarPendencias(adm.id, ano, mes, "")
      } catch (e) {
        console.error(e)
        toast.error(e instanceof Error ? e.message : "Erro ao carregar página")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function aplicarFiltro() {
    if (!administradora?.id) return
    try {
      setLoading(true)
      await carregarPendencias(administradora.id, anoRef, mesRef, financeiraId)
      toast.success("Filtros aplicados")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aplicar filtros")
    } finally {
      setLoading(false)
    }
  }

  const periodoLabel = `${mesRef}/${anoRef}`

  if (loading && pendencias.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando cobranças…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Cobranças</h1>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-[min(100%,80rem)]">
        <Tabs defaultValue="pendencias" className="space-y-4">
          <TabsList className={cn(btnSquare, "bg-white border border-slate-200 p-1 h-auto flex-wrap")}>
            <TabsTrigger value="pendencias" className={cn(btnSquare, "text-sm px-4 py-2")}>
              Faturas pendentes
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className={cn(btnSquare, "text-sm px-4 py-2")}>
              WhatsApp automático
            </TabsTrigger>
            <TabsTrigger value="historico" className={cn(btnSquare, "text-sm px-4 py-2")}>
              Histórico de envios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendencias" className="space-y-6 mt-0">
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Período</span>
              <div className="flex flex-wrap gap-2 items-end">
                <select
                  value={mesRef}
                  onChange={(e) => setMesRef(e.target.value)}
                  aria-label="Mês"
                  className={`h-10 min-w-[9.5rem] ${btnSquare} border border-slate-300 bg-white px-3 text-sm`}
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
                  className={`h-10 w-[5.5rem] ${btnSquare} border border-slate-300 bg-white px-3 text-sm`}
                  min={2000}
                  max={2100}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 min-w-[12rem] flex-1 max-w-md">
              <label htmlFor="cobrancas-financeira" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Financeira
              </label>
              <select
                id="cobrancas-financeira"
                value={financeiraId}
                onChange={(e) => setFinanceiraId(e.target.value)}
                className={`h-10 w-full ${btnSquare} border border-slate-300 bg-white px-3 text-sm`}
                disabled={loading}
              >
                <option value="">Todas as financeiras</option>
                {financeiras.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              className={cn(btnSquare, "h-10 bg-[#0F172A] hover:bg-[#1E293B] text-white")}
              onClick={() => void aplicarFiltro()}
              disabled={loading}
            >
              Aplicar filtro
            </Button>
          </div>
          {alertaFiltroGateway && financeiraId.trim() ? (
            <Alert variant="warning" className="mt-3 border-amber-200 bg-amber-50/95">
              <AlertDescription className="text-xs">
                Filtro por financeira indisponível no banco. Os totais podem incluir todas as faturas do período.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <FaturasPendentesPainel
          pendencias={pendencias}
          financeiraId={financeiraId}
          financeiras={financeiras}
          periodoLabel={periodoLabel}
          administradoraId={administradora?.id}
          mostrarEnvioWhatsApp
          whatsappModoTwilio
          statusWhatsAppPorFatura={statusWhatsAppPorFatura}
          exportPrefix="cobrancas"
        />
          </TabsContent>

          {administradora?.id ? (
            <>
              <TabsContent value="whatsapp" className="mt-0">
                <WhatsAppCobrancasConfig administradoraId={administradora.id} />
              </TabsContent>
              <TabsContent value="historico" className="mt-0">
                <WhatsAppMensagensHistorico administradoraId={administradora.id} />
              </TabsContent>
            </>
          ) : null}
        </Tabs>

        {whatsappAutomaticoAtivo ? (
          <p className="text-xs text-emerald-700">
            WhatsApp automático ativo — lembretes serão enviados conforme configuração na aba WhatsApp.
          </p>
        ) : null}
      </div>
    </div>
  )
}
