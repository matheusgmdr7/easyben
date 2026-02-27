"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Search, Eye, Mail, Phone, FileText, TrendingUp, CheckCircle, Clock, UserCheck, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { getCorretorLogado } from "@/services/auth-corretores-simples"
import { Spinner } from "@/components/ui/spinner"
import { formatarMoeda } from "@/utils/formatters"
import { useRouter } from "next/navigation"
import { formatarCNPJ } from "@/lib/formatters"

interface CorretorEquipe {
  id: string
  nome: string
  email: string
  whatsapp?: string
  status: string
  created_at: string
  total_propostas?: number
  propostas_aprovadas?: number
  propostas_pendentes?: number
  valor_total?: number
}

export default function MinhaEquipePage() {
  const router = useRouter()
  const [corretoresEquipe, setCorretoresEquipe] = useState<CorretorEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [gestorId, setGestorId] = useState<string | null>(null)
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

      setGestorId(gestor.id)
      setCorretoraInfo({ razao_social: gestor.razao_social, nome_fantasia: gestor.nome_fantasia, cnpj: gestor.cnpj })

      // Buscar corretores da equipe
      const { data: corretores, error: corretoresError } = await supabase
        .from("corretores")
        .select("id, nome, email, whatsapp, status, created_at")
        .eq("gestor_id", gestor.id)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })

      if (corretoresError) {
        throw corretoresError
      }

      // Buscar estatísticas de propostas para cada corretor
      const corretoresComStats = await Promise.all(
        (corretores || []).map(async (corretor) => {
          const { data: propostas } = await supabase
            .from("propostas_corretores")
            .select("id, status, valor_total")
            .eq("corretor_id", corretor.id)

          const total = propostas?.length || 0
          const aprovadas = propostas?.filter(p => p.status === "aprovada" || p.status === "aprovado" || p.status === "cadastrado" || p.status === "cadastrada").length || 0
          const pendentes = propostas?.filter(p => p.status === "pendente" || p.status === "em_analise").length || 0
          const valorTotal = propostas?.reduce((acc, p) => acc + Number(p.valor_total || 0), 0) || 0

          return {
            ...corretor,
            total_propostas: total,
            propostas_aprovadas: aprovadas,
            propostas_pendentes: pendentes,
            valor_total: valorTotal,
          }
        })
      )

      setCorretoresEquipe(corretoresComStats)
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error)
      toast.error(`Erro ao carregar dados: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const corretoresFiltrados = corretoresEquipe.filter((corretor) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      corretor.nome?.toLowerCase().includes(searchLower) ||
      corretor.email?.toLowerCase().includes(searchLower) ||
      corretor.whatsapp?.toLowerCase().includes(searchLower)
    )
  })

  const verDetalhes = (corretorId: string) => {
    router.push(`/gestor/equipe/${corretorId}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando equipe...</span>
          <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Minha Equipe</h1>
            <p className="text-gray-600 mt-1 font-medium">Gerencie e acompanhe o desempenho dos corretores da sua equipe</p>
            {(corretoraInfo?.razao_social || corretoraInfo?.nome_fantasia || corretoraInfo?.cnpj) && (
              <p className="text-sm text-gray-500 mt-2">
                {corretoraInfo.razao_social || corretoraInfo.nome_fantasia}
                {corretoraInfo.cnpj && <><span className="mx-1">·</span>CNPJ: {formatarCNPJ(corretoraInfo.cnpj)}</>}
              </p>
            )}
          </div>
          <Button 
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-6 py-2 btn-corporate shadow-corporate"
            onClick={() => router.push('/gestor/link-cadastro')}
          >
            <Users className="h-4 w-4 mr-2" />
            Adicionar Corretor
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total de Corretores</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{corretoresEquipe.length}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-gray-700" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total de Propostas</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">
                {corretoresEquipe.reduce((acc, c) => acc + (c.total_propostas || 0), 0)}
              </div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-gray-700" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Propostas Aprovadas</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">
                {corretoresEquipe.reduce((acc, c) => acc + (c.propostas_aprovadas || 0), 0)}
              </div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-gray-700" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Valor Total</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">
                {formatarMoeda(corretoresEquipe.reduce((acc, c) => acc + (c.valor_total || 0), 0))}
              </div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-gray-700" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
          <CardTitle className="text-lg font-bold text-gray-900 font-sans">Lista de Corretores</CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Visualize e gerencie todos os corretores da sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, email ou WhatsApp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {corretoresFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold">
                {searchTerm ? "Nenhum corretor encontrado" : "Nenhum corretor vinculado à sua equipe ainda"}
              </p>
              <p className="text-sm text-gray-500 mt-2 font-medium">
                {searchTerm ? "Tente uma busca diferente" : "Adicione corretores para começar"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {corretoresFiltrados.map((corretor) => (
                <div
                  key={corretor.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-200 hover:shadow-corporate transition-all duration-200"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserCheck className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">{corretor.nome}</span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {corretor.email}
                        </span>
                        {corretor.whatsapp && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {corretor.whatsapp}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-600 font-medium">
                          <FileText className="h-3 w-3 inline mr-1" />
                          {corretor.total_propostas || 0} propostas
                        </span>
                        <span className="text-xs text-[#0F172A] font-semibold">
                          <CheckCircle className="h-3 w-3 inline mr-1" />
                          {corretor.propostas_aprovadas || 0} aprovadas
                        </span>
                        {corretor.propostas_pendentes > 0 && (
                          <span className="text-xs text-yellow-600 font-semibold">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {corretor.propostas_pendentes} pendentes
                          </span>
                        )}
                        <span className="text-xs text-gray-700 font-bold">
                          {formatarMoeda(corretor.valor_total || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={corretor.status === "aprovado" ? "default" : "secondary"}
                      className="px-2 py-1 text-xs font-semibold"
                    >
                      {corretor.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verDetalhes(corretor.id)}
                      className="btn-corporate"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

