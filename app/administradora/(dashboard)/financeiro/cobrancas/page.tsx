"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  FaturasPendentesPainel,
  type PendenciaFaturaItem,
} from "@/components/administradora/faturas-pendentes-painel"

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
    setPendencias(Array.isArray(payload?.pendencias_faturas) ? payload.pendencias_faturas : [])
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
        const finPayload = await finRes.json().catch(() => ({}))
        if (finRes.ok && Array.isArray(finPayload?.financeiras)) {
          setFinanceiras(
            finPayload.financeiras.map((f: { id: string; nome: string }) => ({
              id: String(f.id),
              nome: String(f.nome || "Financeira"),
            }))
          )
        }

        const ano = String(agora.getFullYear())
        const mes = String(agora.getMonth() + 1).padStart(2, "0")
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
        <p className="text-sm text-gray-500 mt-0.5 max-w-3xl">
          Envio de faturas em aberto por WhatsApp com mensagem e link do boleto. Use o WhatsApp Business ou Web
          logado com o número da empresa para concluir o envio ao cliente.
        </p>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-[min(100%,80rem)]">
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
          mostrarEnvioWhatsApp
          exportPrefix="cobrancas"
        />
      </div>
    </div>
  )
}
