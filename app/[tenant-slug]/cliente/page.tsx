"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { RecursoGuard } from "@/components/tenant/recurso-guard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, ExternalLink, UserRound, LogOut } from "lucide-react"
import { toast } from "sonner"
import { formatarCPF, formatarData, formatarMoeda } from "@/utils/formatters"

interface ClienteDashboardPageProps {
  params: { "tenant-slug": string }
}

type ResultadoCliente = {
  tenant?: { nome?: string; nome_marca?: string; slug?: string }
  cliente?: {
    cpf?: string
    nome?: string
    tipo?: string
    produto?: string | null
    grupo_nome?: string | null
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
                  className="h-10 w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
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
        <div className="bg-gray-50 min-h-screen py-8">
          <div className="container max-w-6xl px-4 md:px-6 space-y-6">
            {resultado && cliente && (
              <>
                <Card className="border border-gray-200 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-[#0F172A] text-white px-4 py-3">
                      <h2 className="text-sm font-semibold tracking-wide">Portal do Cliente</h2>
                    </div>

                    <div className="pt-6 px-6 pb-6">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-600">
                          Bem-vindo(a), <span className="font-semibold text-gray-900">{cliente.nome || "Cliente"}</span>
                        </p>
                        <Button variant="outline" size="sm" onClick={handleSair}>
                          <LogOut className="h-3.5 w-3.5 mr-1" />
                          Sair
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <p className="text-xs text-gray-500 mb-1">Nome</p>
                          <p className="text-sm font-semibold text-gray-900 break-words">{cliente.nome || "-"}</p>
                        </div>
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <p className="text-xs text-gray-500 mb-1">CPF</p>
                          <p className="text-sm font-semibold text-gray-900">{formatarCPF(cliente.cpf || "") || "-"}</p>
                        </div>
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <p className="text-xs text-gray-500 mb-1">Produto</p>
                          <p className="text-sm font-semibold text-gray-900 break-words">{cliente.produto || "-"}</p>
                        </div>
                        <div className="rounded-md border border-gray-200 bg-white p-3">
                          <p className="text-xs text-gray-500 mb-1">Status</p>
                          <Badge variant="outline" className="capitalize">
                            {cliente.status || "-"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Boletos</h3>
                    {faturas.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nº Fatura</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Boleto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {faturas.map((f: any, i: number) => {
                            const valorF = Number(f.valor_total ?? f.valor ?? 0)
                            const vencF = f.data_vencimento ?? f.vencimento
                            const boletoUrl = f.boleto_link ?? f.asaas_boleto_url ?? f.boleto_url ?? f.asaas_invoice_url ?? f.invoice_url
                            return (
                              <TableRow key={f.id || `${i}`} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                <TableCell>{f.numero_fatura || "-"}</TableCell>
                                <TableCell>{formatarMoeda(valorF)}</TableCell>
                                <TableCell>{vencF ? formatarData(String(vencF).slice(0, 10)) : "-"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {f.status || "-"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {boletoUrl ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="outline" size="sm" className="h-8" asChild>
                                        <a href={boletoUrl} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                          Visualizar
                                        </a>
                                      </Button>
                                      <Button variant="outline" size="sm" className="h-8" asChild>
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
                                    <span className="text-xs text-gray-500">Indisponível</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-sm text-gray-500 py-4">Nenhum boleto/fatura encontrado para este cliente.</div>
                    )}
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

