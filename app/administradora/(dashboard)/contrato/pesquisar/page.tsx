"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, FileDown, Eye } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface Contrato {
  id: string
  numero: string
  descricao: string
  razao_social?: string
  nome_fantasia?: string
  operadora_nome: string
  produtos_count: number
  created_at?: string
}

export default function PesquisarContratoPage() {
  const router = useRouter()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(false)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [buscaFiltro, setBuscaFiltro] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (administradora?.id) {
      setAdministradoraId(administradora.id)
    }
  }, [])

  useEffect(() => {
    if (administradoraId) pesquisarContratos()
  }, [administradoraId])

  async function pesquisarContratos() {
    if (!administradoraId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/administradora/contratos?administradora_id=${encodeURIComponent(administradoraId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erro ao buscar contratos")
      setContratos(Array.isArray(data) ? data : [])
    } catch (error: unknown) {
      console.error("Erro ao pesquisar contratos:", error)
      toast.error("Erro ao pesquisar contratos: " + (error instanceof Error ? error.message : ""))
      setContratos([])
    } finally {
      setLoading(false)
    }
  }

  function limparFiltros() {
    setBuscaFiltro("")
    setCurrentPage(1)
  }

  function formatarData(data: string | undefined): string {
    if (!data) return "-"
    try {
      return format(new Date(data), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return data
    }
  }

  function exportarPDF() {
    toast.info("Funcionalidade de exportação PDF em desenvolvimento")
  }

  function exportarExcel() {
    toast.info("Funcionalidade de exportação Excel em desenvolvimento")
  }

  const contratosFiltrados = contratos.filter((c) => {
    if (!buscaFiltro.trim()) return true
    const q = buscaFiltro.toLowerCase()
    return (
      (c.numero || "").toLowerCase().includes(q) ||
      (c.descricao || "").toLowerCase().includes(q) ||
      (c.operadora_nome || "").toLowerCase().includes(q)
    )
  })

  const contratosPaginados = contratosFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPagesAtual = Math.max(1, Math.ceil(contratosFiltrados.length / itemsPerPage))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Contratos</h1>
        <Button
          onClick={() => router.push("/administradora/contrato/novo")}
          className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm flex items-center gap-2"
        >
          <span>+</span>
          Nova
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-600 mb-1">Buscar por número, descrição ou operadora</label>
            <Input
              value={buscaFiltro}
              onChange={(e) => setBuscaFiltro(e.target.value)}
              placeholder="Buscar..."
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>
          <Button
            onClick={pesquisarContratos}
            disabled={loading}
            className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
          >
            <Search className="h-4 w-4 mr-1" />
            Pesquisar
          </Button>
          <Button
            onClick={limparFiltros}
            variant="outline"
            className="h-9 px-4 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <span className="text-sm text-gray-600">
          Contratos cadastrados: <strong>{contratosFiltrados.length}</strong>
        </span>
      </div>

      {/* Tabela */}
      <div className="px-6 py-4">
        <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Número</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Descrição</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Operadora</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Produtos</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Data</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 w-[120px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : contratosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Nenhum contrato encontrado. Cadastre em &quot;Novo&quot;.
                    </td>
                  </tr>
                ) : (
                  contratosPaginados.map((contrato, index) => (
                    <tr
                      key={contrato.id}
                      className={cn(
                        "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      )}
                    >
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{contrato.numero || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{contrato.descricao || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{contrato.operadora_nome || "-"}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{contrato.produtos_count}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 border-r border-gray-200">{formatarData(contrato.created_at)}</td>
                      <td className="px-4 py-2 text-center border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/administradora/contrato/editar/${contrato.id}`)}
                          className="h-8 px-3 text-xs border-gray-300 rounded-sm gap-1"
                          title="Analisar e editar contrato"
                        >
                          <Eye className="h-4 w-4" />
                          Analisar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Paginação e Exportação */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="h-8 px-3 text-xs border-gray-300 rounded-sm"
          >
            &lt;&lt;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3 text-xs border-gray-300 rounded-sm"
          >
            &lt;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPagesAtual, prev + 1))}
            disabled={currentPage >= totalPagesAtual}
            className="h-8 px-3 text-xs border-gray-300 rounded-sm"
          >
            &gt;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPagesAtual)}
            disabled={currentPage >= totalPagesAtual}
            className="h-8 px-3 text-xs border-gray-300 rounded-sm"
          >
            &gt;&gt;
          </Button>
          <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
            <SelectTrigger className="w-20 h-8 text-xs rounded-md border border-gray-300 bg-background px-3 py-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportarPDF}
            variant="outline"
            className="h-8 px-3 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm flex items-center gap-1"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          <Button
            onClick={exportarExcel}
            variant="outline"
            className="h-8 px-3 text-xs border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm flex items-center gap-1"
          >
            <FileDown className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>
    </div>
  )
}







