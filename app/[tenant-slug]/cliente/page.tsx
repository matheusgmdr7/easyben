"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { RecursoGuard } from "@/components/tenant/recurso-guard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, ExternalLink, Info, Loader2, LogOut, Receipt, UserRound, Wallet } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatarCPF, formatarData, formatarMoeda } from "@/utils/formatters"

/** Suporte via WhatsApp (Easyben) — número sem formatação para wa.me */
const WHATSAPP_SUPORTE_HREF =
  "https://wa.me/551151231925?text=" +
  encodeURIComponent("Olá! Preciso de ajuda no portal do cliente.")

interface ClienteDashboardPageProps {
  params: { "tenant-slug": string }
}

type CarteirinhaBeneficiario = {
  cpf: string
  nome: string | null
  tipo: string
  numero_carteirinha: string | null
  numero_carteirinha_odonto: string | null
  plano: string | null
  operadora: string | null
  valor_mensal: number | null
  cpf_login: boolean
}

type ResultadoCliente = {
  tenant?: { nome?: string; nome_marca?: string; slug?: string }
  beneficiarios_carteirinha?: CarteirinhaBeneficiario[]
  cliente?: {
    cpf?: string
    nome?: string
    tipo?: string
    produto?: string | null
    plano?: string | null
    numero_carteirinha?: string | null
    numero_carteirinha_odonto?: string | null
    grupo_nome?: string | null
    operadora?: string | null
    numero_contrato?: string | null
    data_vigencia?: string | null
    valor_mensal?: number | null
    status?: string | null
  }
  faturas?: any[]
}

function formatarCpfParcial(valor: string): string {
  const d = String(valor || "").replace(/\D/g, "").slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** Início do dia no fuso local (evita drift UTC em comparação com vencimento YYYY-MM-DD). */
function inicioDiaLocal(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function parseDataVencimentoISO(valor: string | null | undefined): Date | null {
  const s = String(valor || "").trim().slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const day = Number(m[3])
  const dt = new Date(y, mo, day)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function statusFaturaQuitada(status: string | null | undefined): boolean {
  const s = String(status || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
  return /(pago|recebid|liquid|quitad)/.test(s)
}

function statusFaturaContabilizaAtraso(status: string | null | undefined): boolean {
  const s = String(status || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
  return /(pendente|atrasad)/.test(s)
}

/**
 * Dias em atraso apenas para status pendente/atrasado e vencimento anterior a hoje (fuso local).
 * Usa número vindo da API quando existir (`dias_em_atraso`, `dias_atraso`, `days_overdue`, `dias_em_aberto`).
 */
function diasEmAtrasoFatura(f: Record<string, unknown>): number | null {
  const status = f.status
  if (statusFaturaQuitada(status as string)) return null
  if (!statusFaturaContabilizaAtraso(status as string)) return null

  const apiRaw =
    f.dias_em_atraso ?? f.dias_atraso ?? f.days_overdue ?? f.dias_em_aberto ?? f.atraso_dias
  if (apiRaw != null && apiRaw !== "") {
    const n = Number(apiRaw)
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }

  const v = f.data_vencimento ?? f.vencimento
  const due = parseDataVencimentoISO(v != null ? String(v) : "")
  if (!due) return null

  const diff = inicioDiaLocal(new Date()) - inicioDiaLocal(due)
  const dias = Math.floor(diff / 86_400_000)
  if (dias <= 0) return null
  return dias
}

function badgeClassesFaturaStatus(status: string | null | undefined): string {
  const s = String(status || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
  if (/(pago|recebid|liquid|quitad)/.test(s)) {
    return "border-emerald-200/90 bg-emerald-50 text-emerald-900"
  }
  if (/(pendente|aberto|aguard|process)/.test(s)) {
    return "border-amber-200/90 bg-amber-50 text-amber-950"
  }
  if (/(vencid|atrasad|overdue|inadimpl|atraso)/.test(s)) {
    return "border-red-200/90 bg-red-50 text-red-900"
  }
  if (/(cancel|estorn|invalid)/.test(s)) {
    return "border-slate-200 bg-slate-100 text-slate-700"
  }
  return "border-slate-200/80 bg-white text-slate-700"
}

export default function ClienteDashboardPage({ params }: ClienteDashboardPageProps) {
  const routeParams = useParams()
  const tenantSlug =
    String(routeParams?.["tenant-slug"] || params?.["tenant-slug"] || "")
      .trim()
      .toLowerCase()
  const [cpf, setCpf] = useState("")
  const [loading, setLoading] = useState(false)
  const [autenticado, setAutenticado] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCliente | null>(null)

  const cpfDigitos = useMemo(() => String(cpf || "").replace(/\D/g, ""), [cpf])

  async function consultarCliente(cpfParaConsulta?: string) {
    if (!tenantSlug) {
      toast.error("Plataforma não identificada na URL.")
      return false
    }
    const cpfBase = cpfParaConsulta ? String(cpfParaConsulta).replace(/\D/g, "") : cpfDigitos
    if (cpfBase.length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.")
      return false
    }

    try {
      setLoading(true)
      const res = await fetch(
        `/api/public/cliente-dashboard?tenant_slug=${encodeURIComponent(tenantSlug)}&cpf=${encodeURIComponent(cpfBase)}`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Não foi possível consultar este CPF.")
      setResultado(data)
      setAutenticado(true)
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`cliente_dashboard_cpf_${tenantSlug}`, cpfBase)
      }
      return true
    } catch (e: any) {
      setResultado(null)
      setAutenticado(false)
      toast.error(e?.message || "Erro ao consultar cliente.")
      return false
    } finally {
      setLoading(false)
    }
  }

  async function handleLoginCliente(e: React.FormEvent) {
    e.preventDefault()
    if (cpfDigitos.length !== 11) {
      toast.error("Informe um CPF válido com 11 dígitos.")
      return
    }
    await consultarCliente(cpfDigitos)
  }

  function handleSair() {
    setAutenticado(false)
    setResultado(null)
    setCpf("")
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`cliente_dashboard_cpf_${tenantSlug}`)
    }
  }

  const cliente = resultado?.cliente
  const faturas = Array.isArray(resultado?.faturas) ? resultado!.faturas! : []

  const cartoesBeneficiarios = useMemo((): CarteirinhaBeneficiario[] => {
    const arr = resultado?.beneficiarios_carteirinha
    if (Array.isArray(arr) && arr.length > 0) return arr
    if (!cliente) return []
    return [
      {
        cpf: String(cliente.cpf || "").replace(/\D/g, ""),
        nome: cliente.nome ?? null,
        tipo: String(cliente.tipo || "titular"),
        numero_carteirinha: cliente.numero_carteirinha ?? null,
        numero_carteirinha_odonto: cliente.numero_carteirinha_odonto ?? null,
        plano: cliente.plano ?? cliente.produto ?? null,
        operadora: cliente.operadora ?? null,
        valor_mensal: cliente.valor_mensal ?? null,
        cpf_login: true,
      },
    ]
  }, [resultado?.beneficiarios_carteirinha, cliente])

  return (
    <RecursoGuard codigoRecurso="portal_cliente_cpf" showError={true}>
      {!autenticado ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A]">Área do Cliente</h1>
              <p className="text-gray-600 mt-2">Faça login com seu CPF para acessar seus boletos</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <form onSubmit={handleLoginCliente} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(formatarCpfParcial(e.target.value))}
                    placeholder="000.000.000-00"
                    className="h-10 border-gray-300 focus:ring-[#0F172A] focus:border-[#0F172A]"
                    maxLength={14}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 min-h-12 w-full touch-manipulation bg-[#0F172A] text-[15px] font-bold text-white hover:bg-[#1E293B] sm:h-10 sm:min-h-10"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-slate-100/90 via-slate-50 to-white py-4 sm:py-8">
          <div className="container max-w-5xl px-3 sm:px-4 md:px-6 space-y-5 sm:space-y-6">
            {resultado && cliente && (
              <>
                <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden bg-gradient-to-r from-[#0F172A] via-[#1e293b] to-[#0f172a] px-4 py-4 sm:px-6 sm:py-5">
                      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" aria-hidden />
                      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Portal do cliente</p>
                          <h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">
                            Olá, {cliente.nome?.split(" ")[0] || "Cliente"}
                          </h2>
                          <p className="mt-0.5 text-sm text-white/75">
                            {resultado.tenant?.nome_marca || resultado.tenant?.nome || "Sua área exclusiva"}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleSair}
                          className="h-11 min-h-11 w-full touch-manipulation border border-white/15 bg-white/10 text-white hover:bg-white/20 sm:h-9 sm:min-h-0 sm:w-auto"
                        >
                          <LogOut className="h-3.5 w-3.5 mr-1.5" />
                          Sair
                        </Button>
                      </div>
                    </div>

                    <div className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Nome completo</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-900 break-words">{cliente.nome || "—"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">CPF</p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                            {formatarCPF(cliente.cpf || "") || "—"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                          <div className="mt-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full capitalize",
                                String(cliente.status || "").toLowerCase() === "ativo" &&
                                  "border-emerald-200/80 bg-emerald-50 text-emerald-900"
                              )}
                            >
                              {cliente.status || "—"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.05)]">
                  <CardContent className="min-w-0 p-3 sm:p-6">
                    <Tabs defaultValue="plano" className="w-full min-w-0">
                      <TabsList className="mb-4 grid h-auto w-full min-w-0 grid-cols-3 gap-1 rounded-xl bg-slate-100/90 p-1 sm:mb-6 sm:gap-1.5 sm:p-1.5">
                        <TabsTrigger
                          value="plano"
                          className="min-h-12 touch-manipulation rounded-lg px-1.5 py-2 text-center text-[10px] font-semibold leading-tight data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-sm sm:min-h-11 sm:px-3 sm:text-sm"
                        >
                          <span className="sm:hidden">Plano</span>
                          <span className="hidden sm:inline">Informações do plano</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="financeiro"
                          className="min-h-12 touch-manipulation rounded-lg px-1.5 py-2 text-center text-[10px] font-semibold leading-tight data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-sm sm:min-h-11 sm:px-3 sm:text-sm"
                        >
                          Financeiro
                        </TabsTrigger>
                        <TabsTrigger
                          value="suporte"
                          className="min-h-12 touch-manipulation rounded-lg px-1.5 py-2 text-center text-[10px] font-semibold leading-tight data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-sm sm:min-h-11 sm:px-3 sm:text-sm"
                        >
                          Suporte
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="plano" className="mt-0 min-w-0 space-y-5 outline-none">
                        <div className="space-y-4">
                          {cartoesBeneficiarios.map((ben, idx) => {
                            const tipoLower = String(ben.tipo || "").toLowerCase()
                            const rotuloTipo =
                              tipoLower === "titular"
                                ? "Beneficiário titular"
                                : tipoLower === "dependente"
                                  ? "Dependente"
                                  : ben.tipo || "Beneficiário"
                            return (
                              <div
                                key={`${ben.cpf}-${idx}`}
                                className={cn(
                                  "relative w-full max-w-full min-w-0 overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10",
                                  ben.cpf_login && "ring-2 ring-sky-400/40"
                                )}
                              >
                                <div
                                  className="absolute inset-0 bg-gradient-to-br from-[#0c1929] via-[#0F172A] to-[#172554]"
                                  aria-hidden
                                />
                                <div
                                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
                                  aria-hidden
                                />
                                <div className="relative w-full min-w-0 px-3 pb-5 pt-4 text-white sm:px-8 sm:pb-8 sm:pt-7">
                                  {/* Mobile: coluna com operadora em destaque; Desktop (sm+): linha como antes */}
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                    <div className="min-w-0 shrink-0">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                                        {rotuloTipo}
                                      </p>
                                    </div>
                                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                                      {ben.cpf_login ? (
                                        <span className="w-fit rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                          Seu acesso
                                        </span>
                                      ) : null}
                                      <div
                                        className={cn(
                                          "min-w-0 max-w-full text-left",
                                          "rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5",
                                          "sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-right sm:max-w-[min(100%,18rem)]"
                                        )}
                                      >
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                                          Operadora
                                        </p>
                                        <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-white sm:text-xs">
                                          {ben.operadora ||
                                            resultado?.tenant?.nome_marca ||
                                            resultado?.tenant?.nome ||
                                            "—"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <h3 className="mt-4 break-words text-lg font-bold leading-snug tracking-tight sm:mt-5 sm:text-xl md:text-2xl">
                                    {ben.nome || "Beneficiário"}
                                  </h3>
                                  <p className="mt-1 font-mono text-sm text-white/85 tabular-nums">
                                    {formatarCPF(ben.cpf || "") || "—"}
                                  </p>
                                  <p className="mt-2 text-[10px] leading-relaxed text-white/40">
                                    Vigência{" "}
                                    <span className="tabular-nums text-white/65">
                                      {cliente?.data_vigencia
                                        ? formatarData(String(cliente.data_vigencia).slice(0, 10))
                                        : "—"}
                                    </span>
                                  </p>

                                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4 sm:mt-5 sm:space-y-4 sm:pt-5">
                                    <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 p-3 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:p-5">
                                      <div
                                        className="pointer-events-none absolute -right-8 top-0 h-20 w-20 rounded-full bg-sky-400/10 blur-2xl"
                                        aria-hidden
                                      />
                                      <p className="relative text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        Nº da carteirinha (saúde)
                                      </p>
                                      <p className="relative mt-2 break-words text-lg font-bold leading-tight text-slate-900 [overflow-wrap:anywhere] sm:mt-3 sm:text-xl md:text-2xl">
                                        {ben.numero_carteirinha?.trim() ? ben.numero_carteirinha.trim() : "—"}
                                      </p>
                                    </div>
                                    <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 p-3 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:p-5">
                                      <div
                                        className="pointer-events-none absolute -right-8 top-0 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl"
                                        aria-hidden
                                      />
                                      <p className="relative text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        Nº da carteirinha (odonto)
                                      </p>
                                      <p className="relative mt-2 break-words text-lg font-bold leading-tight text-slate-900 [overflow-wrap:anywhere] sm:mt-3 sm:text-xl md:text-2xl">
                                        {ben.numero_carteirinha_odonto?.trim() ? ben.numero_carteirinha_odonto.trim() : "—"}
                                      </p>
                                    </div>
                                    <div className="flex min-w-0 gap-2.5 rounded-lg border border-white/15 bg-white/[0.07] px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3">
                                      <div
                                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-white/55"
                                        aria-hidden
                                      >
                                        <Info className="h-3.5 w-3.5" strokeWidth={1.6} />
                                      </div>
                                      <p className="min-w-0 flex-1 hyphens-auto text-[10px] leading-snug text-white/80 [overflow-wrap:anywhere] sm:text-[11px]">
                                        Uso apenas para consulta: trata-se de uma carteirinha provisória neste portal. O documento
                                        oficial é emitido pela operadora. Para solicitar a carteirinha permanente, acesse o site ou o
                                        aplicativo da sua operadora de saúde.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex min-w-0 flex-col gap-0 rounded-xl bg-black/20 px-3 py-3 ring-1 ring-white/10 sm:mt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-4">
                                    <div className="min-w-0 flex-1 pb-3 sm:pb-0">
                                      <p className="text-[10px] uppercase tracking-wide text-white/45">Plano</p>
                                      <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-white">
                                        {ben.plano || "—"}
                                      </p>
                                    </div>
                                    <div className="min-w-0 border-t border-white/10 pt-3 text-left sm:border-0 sm:pt-0 sm:text-right">
                                      <p className="text-[10px] uppercase tracking-wide text-white/45">Mensalidade</p>
                                      <p className="mt-0.5 text-base font-bold tabular-nums text-white sm:text-sm">
                                        {ben.valor_mensal != null
                                          ? formatarMoeda(Number(ben.valor_mensal))
                                          : "—"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </TabsContent>

                      <TabsContent value="financeiro" className="mt-0 min-w-0 space-y-5 outline-none">
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200/85 bg-gradient-to-br from-slate-50 via-white to-sky-50/35 px-4 py-4 sm:px-5 sm:py-5">
                          <div
                            className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-sky-400/15 blur-2xl"
                            aria-hidden
                          />
                          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] text-white shadow-md shadow-slate-900/15">
                                <Wallet className="h-5 w-5" aria-hidden />
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Faturas e boletos</h3>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                                  Consulte valores, vencimentos e acesse o boleto quando disponível.
                                </p>
                              </div>
                            </div>
                            {faturas.length > 0 ? (
                              <p className="text-xs font-medium tabular-nums text-slate-500 sm:text-right">
                                {faturas.length} {faturas.length === 1 ? "fatura" : "faturas"}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {faturas.length > 0 ? (
                          <>
                            <div className="space-y-3 md:hidden">
                              {faturas.map((f: any, i: number) => {
                                const valorF = Number(f.valor_total ?? f.valor ?? 0)
                                const vencF = f.data_vencimento ?? f.vencimento
                                const boletoUrl =
                                  f.boleto_link ??
                                  f.asaas_boleto_url ??
                                  f.boleto_url ??
                                  f.asaas_invoice_url ??
                                  f.invoice_url
                                const diasAtraso = diasEmAtrasoFatura(f)
                                return (
                                  <div
                                    key={f.id || `${i}`}
                                    className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_16px_rgba(15,23,42,0.04)] transition-[box-shadow,transform] duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)] active:scale-[0.99]"
                                  >
                                    <div
                                      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400/50 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                      aria-hidden
                                    />
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                          <Receipt className="h-5 w-5" aria-hidden />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            Fatura
                                          </p>
                                          <p className="truncate text-sm font-bold tracking-tight text-slate-900">
                                            {f.numero_fatura || "—"}
                                          </p>
                                        </div>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                                          badgeClassesFaturaStatus(f.status)
                                        )}
                                      >
                                        {f.status || "—"}
                                      </Badge>
                                    </div>
                                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50/90 px-2.5 py-3 ring-1 ring-slate-100/80 sm:gap-3 sm:px-3">
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                          Valor
                                        </p>
                                        <p className="mt-0.5 text-xs font-bold tabular-nums text-slate-900 sm:text-sm">
                                          {formatarMoeda(valorF)}
                                        </p>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                          Venc.
                                        </p>
                                        <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-900 sm:text-sm">
                                          {vencF ? formatarData(String(vencF).slice(0, 10)) : "—"}
                                        </p>
                                      </div>
                                      <div className="min-w-0 text-right sm:text-left">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                          Atraso
                                        </p>
                                        <p
                                          className={cn(
                                            "mt-0.5 text-xs font-bold tabular-nums sm:text-sm",
                                            diasAtraso != null ? "text-red-700" : "font-semibold text-slate-500"
                                          )}
                                        >
                                          {diasAtraso != null
                                            ? `${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"}`
                                            : "—"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                      {boletoUrl ? (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-10 min-h-10 flex-1 touch-manipulation rounded-xl border-slate-200 font-semibold hover:bg-slate-50 sm:h-9 sm:min-h-0"
                                            asChild
                                          >
                                            <a href={boletoUrl} target="_blank" rel="noopener noreferrer">
                                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                              Visualizar
                                            </a>
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-10 min-h-10 flex-1 touch-manipulation rounded-xl border-slate-200 font-semibold hover:bg-slate-50 sm:h-9 sm:min-h-0"
                                            asChild
                                          >
                                            <a
                                              href={boletoUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download={`boleto-${f.numero_fatura || f.id || i}.pdf`}
                                            >
                                              <Download className="h-3.5 w-3.5 mr-1.5" />
                                              Baixar
                                            </a>
                                          </Button>
                                        </>
                                      ) : (
                                        <span className="flex w-full items-center justify-center rounded-xl bg-slate-50 py-2.5 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
                                          Boleto indisponível
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            <div className="hidden min-w-0 md:block">
                              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_20px_rgba(15,23,42,0.04)]">
                                <div className="overflow-x-auto">
                                  <Table className="min-w-[42rem]">
                                    <TableHeader>
                                      <TableRow className="border-b border-slate-200/90 hover:bg-transparent">
                                        <TableHead className="h-11 bg-slate-50/95 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                          Nº fatura
                                        </TableHead>
                                        <TableHead className="h-11 bg-slate-50/95 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                          Valor
                                        </TableHead>
                                        <TableHead className="h-11 bg-slate-50/95 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                          Vencimento
                                        </TableHead>
                                        <TableHead className="h-11 bg-slate-50/95 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                          Status
                                        </TableHead>
                                        <TableHead className="h-11 bg-slate-50/95 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                          Dias em atraso
                                        </TableHead>
                                        <TableHead className="h-11 bg-slate-50/95 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                          Boleto
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {faturas.map((f: any, i: number) => {
                                        const valorF = Number(f.valor_total ?? f.valor ?? 0)
                                        const vencF = f.data_vencimento ?? f.vencimento
                                        const boletoUrl =
                                          f.boleto_link ??
                                          f.asaas_boleto_url ??
                                          f.boleto_url ??
                                          f.asaas_invoice_url ??
                                          f.invoice_url
                                        const diasAtraso = diasEmAtrasoFatura(f)
                                        return (
                                          <TableRow
                                            key={f.id || `${i}`}
                                            className="border-b border-slate-100/90 transition-colors hover:bg-sky-50/40"
                                          >
                                            <TableCell className="py-3.5 font-semibold text-slate-900">
                                              {f.numero_fatura || "—"}
                                            </TableCell>
                                            <TableCell className="py-3.5 font-semibold tabular-nums text-slate-900">
                                              {formatarMoeda(valorF)}
                                            </TableCell>
                                            <TableCell className="py-3.5 tabular-nums text-slate-700">
                                              {vencF ? formatarData(String(vencF).slice(0, 10)) : "—"}
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                                                  badgeClassesFaturaStatus(f.status)
                                                )}
                                              >
                                                {f.status || "—"}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="py-3.5 text-center tabular-nums">
                                              {diasAtraso != null ? (
                                                <span className="font-semibold text-red-700">
                                                  {diasAtraso} {diasAtraso === 1 ? "dia" : "dias"}
                                                </span>
                                              ) : (
                                                <span className="text-slate-400">—</span>
                                              )}
                                            </TableCell>
                                            <TableCell className="py-3.5 text-right">
                                              {boletoUrl ? (
                                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 rounded-lg border-slate-200 font-semibold"
                                                    asChild
                                                  >
                                                    <a href={boletoUrl} target="_blank" rel="noopener noreferrer">
                                                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                                      Ver
                                                    </a>
                                                  </Button>
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 rounded-lg border-slate-200 font-semibold"
                                                    asChild
                                                  >
                                                    <a
                                                      href={boletoUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      download={`boleto-${f.numero_fatura || f.id || i}.pdf`}
                                                    >
                                                      <Download className="h-3.5 w-3.5 mr-1" />
                                                      Baixar
                                                    </a>
                                                  </Button>
                                                </div>
                                              ) : (
                                                <span className="text-xs font-medium text-slate-400">Indisponível</span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/50 px-6 py-12 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                              <Wallet className="h-6 w-6 text-slate-400" aria-hidden />
                            </div>
                            <p className="mt-4 text-sm font-semibold text-slate-800">Nenhuma fatura no momento</p>
                            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                              Quando houver boletos ou faturas vinculados ao seu CPF, eles aparecerão aqui.
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="suporte" className="mt-0 min-w-0 outline-none">
                        <div className="rounded-2xl border border-slate-200/90 border-l-4 border-l-[#25D366] bg-gradient-to-br from-slate-50/95 via-white to-emerald-50/30 p-4 sm:p-6">
                          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Fale com o suporte</h3>
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Nossa equipe atende pelo WhatsApp em horário comercial. Toque no botão para abrir a conversa
                            no aplicativo.
                          </p>
                          <a
                            href={WHATSAPP_SUPORTE_HREF}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "group relative mt-6 flex min-h-[3.25rem] w-full touch-manipulation items-center justify-center gap-3 overflow-hidden rounded-2xl px-5 py-3.5",
                              "bg-gradient-to-br from-[#25D366] via-[#20c659] to-[#128C7E]",
                              "text-[15px] font-bold tracking-tight text-white shadow-[0_10px_28px_-6px_rgba(37,211,102,0.65),inset_0_1px_0_rgba(255,255,255,0.22)]",
                              "ring-1 ring-white/30 transition-[transform,box-shadow,filter] duration-200",
                              "hover:shadow-[0_14px_36px_-8px_rgba(37,211,102,0.75)] hover:brightness-[1.03]",
                              "active:scale-[0.98] active:brightness-95",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                            )}
                          >
                            <span
                              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-60"
                              aria-hidden
                            />
                            <svg
                              className="relative z-10 h-6 w-6 shrink-0 drop-shadow-sm"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              aria-hidden
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                            </svg>
                            <span className="relative z-10">Conversar no WhatsApp</span>
                          </a>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </>
            )}

            {!resultado && !loading && (
              <Card className="border border-dashed border-gray-300 bg-white">
                <CardContent className="py-10 text-center text-gray-500">
                  <UserRound className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  Informe o CPF para acessar o dashboard do cliente e seus boletos.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </RecursoGuard>
  )
}

