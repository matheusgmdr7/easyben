"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { PageHeader } from "@/components/admin/page-header"
import { Database, FileText, Mail, LinkIcon, CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react"

export default function AnalisarFluxoPropostasPage() {
  const [loading, setLoading] = useState(true)
  const [analise, setAnalise] = useState({
    tabelas: [],
    ultimasPropostas: [],
    estruturaTabela: [],
    linksTeste: [],
  })

  useEffect(() => {
    analisarFluxo()
  }, [])

  async function analisarFluxo() {
    try {
      setLoading(true)
      console.log("🔍 INICIANDO ANÁLISE DO FLUXO DE PROPOSTAS")

      // 1. Verificar tabelas relacionadas a propostas
      const { data: tabelas } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .or("table_name.like.%proposta%,table_name.like.%digital%,table_name.like.%saude%")

      // 2. Verificar últimas propostas
      const { data: ultimasPropostas } = await supabase
        .from("propostas_corretores")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      // 3. Verificar estrutura da tabela principal
      const { data: estrutura } = await supabase
        .from("information_schema.columns")
        .select("column_name, data_type, is_nullable")
        .eq("table_name", "propostas_corretores")
        .order("ordinal_position")

      // 4. Analisar links de validação
      const linksTeste =
        ultimasPropostas?.map((proposta) => ({
          id: proposta.id,
          cliente: proposta.cliente,
          link: proposta.link_validacao || `${window.location.origin}/proposta-digital/completar/${proposta.id}`,
          emailEnviado: proposta.email_validacao_enviado,
          status: proposta.status,
        })) || []

      setAnalise({
        tabelas: tabelas || [],
        ultimasPropostas: ultimasPropostas || [],
        estruturaTabela: estrutura || [],
        linksTeste,
      })

      console.log("📊 Análise completa:", {
        tabelas: tabelas?.length || 0,
        propostas: ultimasPropostas?.length || 0,
        campos: estrutura?.length || 0,
      })
    } catch (error) {
      console.error("❌ Erro na análise:", error)
    } finally {
      setLoading(false)
    }
  }

  async function testarLink(link: string) {
    try {
      console.log("🔗 Testando link:", link)
      window.open(link, "_blank")
    } catch (error) {
      console.error("❌ Erro ao testar link:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análise do Fluxo de Propostas"
        description="Verificação completa do processo de propostas e links de validação"
      />

      {/* 1. Tabelas do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Tabelas Relacionadas a Propostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analise.tabelas.map((tabela, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <p className="font-medium">{tabela.table_name}</p>
              </div>
            ))}
          </div>
          {analise.tabelas.length === 0 && <p className="text-gray-500">Nenhuma tabela encontrada</p>}
        </CardContent>
      </Card>

      {/* 2. Estrutura da Tabela Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Estrutura da Tabela: propostas_corretores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 text-left">Campo</th>
                  <th className="border p-2 text-left">Tipo</th>
                  <th className="border p-2 text-left">Nulo?</th>
                </tr>
              </thead>
              <tbody>
                {analise.estruturaTabela.map((campo, index) => (
                  <tr key={index}>
                    <td className="border p-2 font-mono text-sm">{campo.column_name}</td>
                    <td className="border p-2 text-sm">{campo.data_type}</td>
                    <td className="border p-2 text-sm">
                      {campo.is_nullable === "YES" ? (
                        <Badge variant="secondary">Sim</Badge>
                      ) : (
                        <Badge variant="destructive">Não</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 3. Últimas Propostas e Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Últimas Propostas e Links de Validação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analise.linksTeste.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">ID: {item.id}</h4>
                    <p className="text-sm text-gray-600">Cliente: {item.cliente}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      className={
                        item.status === "pendente"
                          ? "bg-yellow-100 text-yellow-800"
                          : item.status === "aprovada"
                            ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                            : item.status === "aguardando_cliente"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                      }
                    >
                      {item.status}
                    </Badge>
                    {item.emailEnviado ? (
                      <CheckCircle className="h-4 w-4 text-[#0F172A]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded mb-3">
                  <p className="text-sm font-mono break-all">{item.link}</p>
                </div>

                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => testarLink(item.link)}>
                    <LinkIcon className="h-4 w-4 mr-1" />
                    Testar Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/admin/propostas`, "_blank")}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver no Admin
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Análise do Fluxo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Análise do Fluxo Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-blue-800">✅ Funcionando Corretamente:</h4>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>
                  • Propostas sendo salvas em: <code>propostas_corretores</code>
                </li>
                <li>
                  • Dependentes sendo salvos em: <code>dependentes_propostas_corretores</code>
                </li>
                <li>• Links de validação sendo gerados</li>
                <li>• Emails sendo enviados (quando configurado)</li>
              </ul>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-medium text-yellow-800">⚠️ Pontos de Atenção:</h4>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>
                  • Link aponta para: <code>/proposta-digital/completar/[id]</code>
                </li>
                <li>• Precisa verificar se esta página existe e funciona</li>
                <li>• Precisa incluir declaração de saúde</li>
                <li>• Precisa incluir assinatura digital</li>
                <li>• Dados completos devem ficar disponíveis para o admin</li>
              </ul>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-medium text-red-800">❌ Necessário Implementar:</h4>
              <ul className="text-sm text-red-700 mt-2 space-y-1">
                <li>• Página de completar proposta com declaração de saúde</li>
                <li>• Sistema de assinatura digital</li>
                <li>• Salvamento dos dados completos</li>
                <li>• Geração de PDF com todos os dados</li>
                <li>• Visualização completa no admin</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Próximos Passos */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Próximos Passos Recomendados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-medium">Verificar/Criar Página de Completar Proposta</h4>
                <p className="text-sm text-gray-600">
                  Garantir que <code>/proposta-digital/completar/[id]</code> existe e funciona
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-medium">Implementar Declaração de Saúde</h4>
                <p className="text-sm text-gray-600">Adicionar questionário de saúde na página de completar</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-medium">Implementar Assinatura Digital</h4>
                <p className="text-sm text-gray-600">Sistema para cliente assinar digitalmente a proposta</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <h4 className="font-medium">Melhorar Visualização no Admin</h4>
                <p className="text-sm text-gray-600">Incluir todos os dados, anexos e gerar PDF completo</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
