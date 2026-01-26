"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function VerificarPropostasPage() {
  const [loading, setLoading] = useState(false)
  const [resultados, setResultados] = useState<any>(null)

  const verificarPropostas = async () => {
    setLoading(true)
    try {
      // Buscar propostas da tabela propostas
      const { data: propostas, error: errorPropostas } = await supabase
        .from("propostas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      if (errorPropostas) {
        throw errorPropostas
      }

      // Buscar propostas da tabela propostas_corretores (se existir)
      const { data: propostasCorretores, error: errorCorretores } = await supabase
        .from("propostas_corretores")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      // Contar por status
      const { data: statusCount, error: errorStatus } = await supabase.from("propostas").select("status")

      if (errorStatus) {
        throw errorStatus
      }

      const statusSummary = statusCount?.reduce((acc: any, item: any) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {})

      setResultados({
        propostas: propostas || [],
        propostasCorretores: propostasCorretores || [],
        statusSummary: statusSummary || {},
        totalPropostas: propostas?.length || 0,
        totalPropostasCorretores: propostasCorretores?.length || 0,
      })

      toast.success("Verificação concluída!")
    } catch (error) {
      console.error("Erro ao verificar propostas:", error)
      toast.error("Erro ao verificar propostas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Verificar Propostas</h1>
        <p className="text-gray-600">Verificar onde as propostas estão sendo salvas</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Verificação de Propostas</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={verificarPropostas} disabled={loading}>
            {loading ? "Verificando..." : "Verificar Propostas"}
          </Button>
        </CardContent>
      </Card>

      {resultados && (
        <div className="space-y-6">
          {/* Resumo por Status */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(resultados.statusSummary).map(([status, count]: [string, any]) => (
                  <div key={status} className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">{status}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabela Propostas */}
          <Card>
            <CardHeader>
              <CardTitle>Tabela: propostas ({resultados.totalPropostas} registros)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-left">ID</th>
                      <th className="border p-2 text-left">Nome</th>
                      <th className="border p-2 text-left">Email</th>
                      <th className="border p-2 text-left">Corretor</th>
                      <th className="border p-2 text-left">Status</th>
                      <th className="border p-2 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.propostas.map((proposta: any) => (
                      <tr key={proposta.id}>
                        <td className="border p-2 text-xs">{proposta.id}</td>
                        <td className="border p-2">{proposta.nome}</td>
                        <td className="border p-2">{proposta.email}</td>
                        <td className="border p-2">{proposta.corretor_nome || "N/A"}</td>
                        <td className="border p-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              proposta.status === "parcial"
                                ? "bg-blue-100 text-blue-800"
                                : proposta.status === "pendente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : proposta.status === "aprovada"
                                    ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                                    : "bg-red-100 text-red-800"
                            }`}
                          >
                            {proposta.status}
                          </span>
                        </td>
                        <td className="border p-2 text-xs">{new Date(proposta.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Tabela Propostas Corretores (se existir) */}
          {resultados.totalPropostasCorretores > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tabela: propostas_corretores ({resultados.totalPropostasCorretores} registros)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full border">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border p-2 text-left">ID</th>
                        <th className="border p-2 text-left">Cliente</th>
                        <th className="border p-2 text-left">Email</th>
                        <th className="border p-2 text-left">Corretor ID</th>
                        <th className="border p-2 text-left">Status</th>
                        <th className="border p-2 text-left">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.propostasCorretores.map((proposta: any) => (
                        <tr key={proposta.id}>
                          <td className="border p-2 text-xs">{proposta.id}</td>
                          <td className="border p-2">{proposta.cliente}</td>
                          <td className="border p-2">{proposta.email_cliente}</td>
                          <td className="border p-2">{proposta.corretor_id}</td>
                          <td className="border p-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                proposta.status === "pendente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : proposta.status === "aprovada"
                                    ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {proposta.status}
                            </span>
                          </td>
                          <td className="border p-2 text-xs">{new Date(proposta.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
