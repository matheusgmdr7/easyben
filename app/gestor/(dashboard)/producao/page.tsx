"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FileText, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { getCorretorLogado } from "@/services/auth-corretores-simples"
import { Spinner } from "@/components/ui/spinner"
import { formatarCNPJ } from "@/lib/formatters"

interface PropostaProducao {
  id: string
  status: string
  created_at: string
  corretor_id: string
  nome_cliente?: string | null
  cliente?: string | null
  sigla_plano?: string | null
  produto_nome?: string | null
  produto_operadora?: string | null
  produto_descricao?: string | null
  corretores?: { nome: string } | null
}

function labelStatus(status: string) {
  const s = (status || "").toLowerCase()
  if (["aprovada", "aprovado", "cadastrado", "cadastrada"].includes(s)) return "Aprovada"
  if (["pendente", "em_analise"].includes(s)) return "Em análise"
  if (["rejeitada", "rejeitado"].includes(s)) return "Rejeitada"
  if (["cancelada", "cancelado"].includes(s)) return "Cancelada"
  if (s === "devolvida") return "Devolvida"
  if (s === "transmitida") return "Transmitida"
  return status || "—"
}

function corStatus(status: string) {
  const s = (status || "").toLowerCase()
  if (["aprovada", "aprovado", "cadastrado", "cadastrada", "transmitida"].includes(s))
    return "bg-emerald-100 text-emerald-800"
  if (["pendente", "em_analise", "aguardando_cliente", "parcial", "aguardando_validacao"].includes(s))
    return "bg-amber-100 text-amber-800"
  if (["rejeitada", "rejeitado", "cancelada", "cancelado"].includes(s))
    return "bg-red-100 text-red-800"
  if (s === "devolvida") return "bg-orange-100 text-orange-800"
  return "bg-gray-100 text-gray-700"
}

export default function ProducaoPage() {
  const [propostas, setPropostas] = useState<PropostaProducao[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [corretoraInfo, setCorretoraInfo] = useState<{ razao_social?: string | null; nome_fantasia?: string | null; cnpj?: string | null } | null>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)

      const corretorLocal = getCorretorLogado()
      if (!corretorLocal) {
        toast.error("Sessão não encontrada")
        return
      }

      const tenantId = await getCurrentTenantId()

      const { data: gestor, error: gestorError } = await supabase
        .from("corretores")
        .select("id, razao_social, nome_fantasia, cnpj")
        .eq("id", corretorLocal.id)
        .eq("tenant_id", tenantId)
        .eq("is_gestor", true)
        .single()

      if (gestorError || !gestor) {
        toast.error("Gestor não encontrado")
        return
      }

      setCorretoraInfo({ razao_social: gestor.razao_social, nome_fantasia: gestor.nome_fantasia, cnpj: gestor.cnpj })

      const { data: corretores, error: corretoresError } = await supabase
        .from("corretores")
        .select("id")
        .eq("gestor_id", gestor.id)
        .eq("tenant_id", tenantId)

      if (corretoresError || !corretores?.length) {
        setPropostas([])
        return
      }

      const idsEquipe = corretores.map((c) => c.id)

      const { data: rows, error } = await supabase
        .from("propostas_corretores")
        .select(`
          id,
          status,
          created_at,
          corretor_id,
          nome_cliente,
          cliente,
          sigla_plano,
          produto_nome,
          produto_operadora,
          produto_descricao,
          corretores ( nome )
        `)
        .in("corretor_id", idsEquipe)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setPropostas((rows as PropostaProducao[]) || [])
    } catch (e: any) {
      console.error("Erro ao carregar produção:", e)
      toast.error(e?.message || "Erro ao carregar propostas")
      setPropostas([])
    } finally {
      setLoading(false)
    }
  }

  const nomeCliente = (p: PropostaProducao) =>
    p.nome_cliente || p.cliente || "—"

  const nomeProduto = (p: PropostaProducao) =>
    p.produto_nome || p.produto_operadora || p.sigla_plano || p.produto_descricao || "—"

  const filtradas = propostas.filter((p) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      nomeCliente(p).toLowerCase().includes(q) ||
      (p.corretores?.nome || "").toLowerCase().includes(q) ||
      nomeProduto(p).toLowerCase().includes(q) ||
      (p.status || "").toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando produção...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Produção</h1>
        <p className="text-gray-600 mt-1 font-medium">Todas as propostas enviadas pela sua equipe</p>
        {(corretoraInfo?.razao_social || corretoraInfo?.nome_fantasia || corretoraInfo?.cnpj) && (
          <p className="text-sm text-gray-500 mt-2">
            {corretoraInfo.razao_social || corretoraInfo.nome_fantasia}
            {corretoraInfo.cnpj && <><span className="mx-1">·</span>CNPJ: {formatarCNPJ(corretoraInfo.cnpj)}</>}
          </p>
        )}
      </div>

      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
          <CardTitle className="text-lg font-bold text-gray-900 font-sans">Propostas enviadas</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Corretor, produto e status de cada proposta
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, corretor, produto ou status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filtradas.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold">
                {searchTerm ? "Nenhuma proposta encontrada" : "Nenhuma proposta enviada pela equipe ainda"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Data</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Cliente</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Corretor</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Produto</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-3 px-2 text-gray-600">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-900">{nomeCliente(p)}</td>
                      <td className="py-3 px-2 text-gray-700">{p.corretores?.nome || "—"}</td>
                      <td className="py-3 px-2 text-gray-700">{nomeProduto(p)}</td>
                      <td className="py-3 px-2">
                        <Badge className={corStatus(p.status)}>
                          {labelStatus(p.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
