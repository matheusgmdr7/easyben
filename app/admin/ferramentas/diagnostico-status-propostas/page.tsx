"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { RefreshCw, Database, AlertTriangle, CheckCircle, Info } from "lucide-react"

export default function DiagnosticoStatusPropostasPage() {
  const [loading, setLoading] = useState(false)
  const [diagnostico, setDiagnostico] = useState(null)
  const [ultimasPropostas, setUltimasPropostas] = useState([])
  const [statusDistribuicao, setStatusDistribuicao] = useState([])

  useEffect(() => {
    executarDiagnostico()
  }, [])

  async function executarDiagnostico() {
    try {
      setLoading(true)
      console.log("🔍 Iniciando diagnóstico de status das propostas...")

      // 1. Verificar distribuição de status
      const { data: distribuicao, error: errorDistribuicao } = await supabase
        .from("propostas_corretores")
        .select("status")
        .then(({ data, error }) => {
          if (error) throw error

          // Contar status
          const contagem = {}
          data?.forEach((item) => {
            const status = item.status || "null"
            contagem[status] = (contagem[status] || 0) + 1
          })

          return {
            data: Object.entries(contagem).map(([status, count]) => ({ status, count })),
            error: null,
          }
        })

      if (errorDistribuicao) {
        console.error("Erro ao buscar distribuição:", errorDistribuicao)
        throw errorDistribuicao
      }

      setStatusDistribuicao(distribuicao)

      // 2. Buscar últimas propostas
      const { data: propostas, error: errorPropostas } = await supabase
        .from("propostas_corretores")
        .select(`
          id,
          cliente,
          email_cliente,
          status,
          created_at,
          updated_at,
          email_enviado_em,
          email_validacao_enviado,
          assinatura_digital_url,
          questionario_saude_completo,
          produto_nome,
          valor_proposta
        `)
        .order("created_at", { ascending: false })
        .limit(15)

      if (errorPropostas) {
        console.error("Erro ao buscar propostas:", errorPropostas)
        throw errorPropostas
      }

      setUltimasPropostas(propostas || [])

      // 3. Verificar estrutura da tabela
      const { data: estrutura, error: errorEstrutura } = await supabase
        .rpc("get_table_structure", { table_name: "propostas_corretores" })
        .then(({ data, error }) => {
          // Se a função não existir, fazer uma consulta alternativa
          if (error && error.message?.includes("function")) {
            return supabase
              .from("propostas_corretores")
              .select("*")
              .limit(1)
              .then(({ data, error }) => ({
                data: data?.[0] ? Object.keys(data[0]) : [],
                error,
              }))
          }
          return { data, error }
        })

      const diagnosticoCompleto = {
        distribuicaoStatus: distribuicao,
        totalPropostas: propostas?.length || 0,
        estruturaTabela: estrutura || [],
        timestamp: new Date().toISOString(),
      }

      setDiagnostico(diagnosticoCompleto)

      console.log("✅ Diagnóstico concluído:", diagnosticoCompleto)
      toast.success("Diagnóstico concluído com sucesso!")
    } catch (error) {
      console.error("❌ Erro no diagnóstico:", error)
      toast.error(`Erro no diagnóstico: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  function getStatusInfo(status) {
    const statusConfig = {
      parcial: {
        label: "Aguardando Validação",
        color: "bg-blue-100 text-blue-800",
        description: "Proposta criada pelo corretor, aguardando cliente completar",
      },
      aguardando_cliente: {
        label: "Email Enviado",
        color: "bg-purple-100 text-purple-800",
        description: "Email de validação enviado, aguardando cliente",
      },
      pendente: {
        label: "Aguardando Análise",
        color: "bg-yellow-100 text-yellow-800",
        description: "Cliente completou, aguardando aprovação do admin",
      },
      aprovada: {
        label: "Aprovada",
        color: "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]",
        description: "Proposta aprovada pelo admin",
      },
      rejeitada: {
        label: "Rejeitada",
        color: "bg-red-100 text-red-800",
        description: "Proposta rejeitada pelo admin",
      },
      null: {
        label: "Sem Status",
        color: "bg-gray-100 text-gray-800",
        description: "Status não definido - PROBLEMA!",
      },
    }

    return (
      statusConfig[status] || {
        label: status || "Desconhecido",
        color: "bg-orange-100 text-orange-800",
        description: "Status não mapeado - VERIFICAR!",
      }
    )
  }

  async function corrigirStatusProblematicos() {
    try {
      setLoading(true)
      console.log("🔧 Corrigindo status problemáticos...")

      // Corrigir propostas sem status
      const { error: errorNull } = await supabase
        .from("propostas_corretores")
        .update({ status: "parcial" })
        .is("status", null)

      if (errorNull) {
        console.error("Erro ao corrigir status null:", errorNull)
      }

      // Corrigir status vazios
      const { error: errorEmpty } = await supabase
        .from("propostas_corretores")
        .update({ status: "parcial" })
        .eq("status", "")

      if (errorEmpty) {
        console.error("Erro ao corrigir status vazios:", errorEmpty)
      }

      toast.success("Status problemáticos corrigidos!")
      executarDiagnostico() // Recarregar diagnóstico
    } catch (error) {
      console.error("❌ Erro ao corrigir status:", error)
      toast.error(`Erro ao corrigir: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico de Status das Propostas</h1>
          <p className="text-gray-600">Análise detalhada dos status das propostas no sistema</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={executarDiagnostico} disabled={loading}>
            {loading ? <Spinner className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar Diagnóstico
          </Button>
          <Button onClick={corrigirStatusProblematicos} disabled={loading} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Corrigir Problemas
          </Button>
        </div>
      </div>

      {/* Distribuição de Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Distribuição de Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {statusDistribuicao.map(({ status, count }) => {
                const statusInfo = getStatusInfo(status)
                return (
                  <div key={status} className="p-4 border rounded-lg">
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    <p className="text-2xl font-bold mt-2">{count}</p>
                    <p className="text-sm text-gray-600">{statusInfo.description}</p>
                    {(status === "null" ||
                      !["parcial", "aguardando_cliente", "pendente", "aprovada", "rejeitada"].includes(status)) && (
                      <div className="mt-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Últimas Propostas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Últimas 15 Propostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">ID</th>
                    <th className="text-left py-2 px-3">Cliente</th>
                    <th className="text-left py-2 px-3">Email</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Criado</th>
                    <th className="text-left py-2 px-3">Email Enviado</th>
                    <th className="text-left py-2 px-3">Assinatura</th>
                    <th className="text-left py-2 px-3">Quest. Saúde</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasPropostas.map((proposta) => {
                    const statusInfo = getStatusInfo(proposta.status)
                    return (
                      <tr key={proposta.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 text-sm font-mono">{proposta.id.slice(0, 8)}...</td>
                        <td className="py-2 px-3">{proposta.cliente || "N/A"}</td>
                        <td className="py-2 px-3 text-sm">{proposta.email_cliente || "N/A"}</td>
                        <td className="py-2 px-3">
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </td>
                        <td className="py-2 px-3 text-sm">
                          {new Date(proposta.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2 px-3 text-center">{proposta.email_validacao_enviado ? "✅" : "❌"}</td>
                        <td className="py-2 px-3 text-center">{proposta.assinatura_digital_url ? "✅" : "❌"}</td>
                        <td className="py-2 px-3 text-center">{proposta.questionario_saude_completo ? "✅" : "❌"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações do Diagnóstico */}
      {diagnostico && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Status Encontrados:</h4>
                <ul className="space-y-1">
                  {statusDistribuicao.map(({ status, count }) => (
                    <li key={status} className="text-sm">
                      <code className="bg-gray-100 px-2 py-1 rounded">{status || "null"}</code>: {count} propostas
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Problemas Identificados:</h4>
                <ul className="space-y-1 text-sm">
                  {statusDistribuicao.some((s) => s.status === "null") && (
                    <li className="text-orange-600">⚠️ Propostas com status NULL encontradas</li>
                  )}
                  {statusDistribuicao.some(
                    (s) =>
                      !["parcial", "aguardando_cliente", "pendente", "aprovada", "rejeitada"].includes(s.status) &&
                      s.status !== "null",
                  ) && <li className="text-orange-600">⚠️ Status não mapeados encontrados</li>}
                  {statusDistribuicao.every((s) =>
                    ["parcial", "aguardando_cliente", "pendente", "aprovada", "rejeitada"].includes(s.status),
                  ) && <li className="text-[#0F172A]">✅ Todos os status estão corretos</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
