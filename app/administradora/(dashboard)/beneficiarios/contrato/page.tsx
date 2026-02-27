"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { obterProdutosCorretores } from "@/services/produtos-corretores-service"
import { buscarCorretores } from "@/services/corretores-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"

export default function BeneficiariosContratoPage() {
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [produtos, setProdutos] = useState<{ id: string; nome?: string }[]>([])
  const [corretores, setCorretores] = useState<{ id: string; nome?: string }[]>([])
  const [loading, setLoading] = useState(false)

  const [cpf, setCpf] = useState("")
  const [grupoId, setGrupoId] = useState("")
  const [produtoId, setProdutoId] = useState("")
  const [corretorId, setCorretorId] = useState("")

  const [resultados, setResultados] = useState<any[]>([])

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (adm?.id) {
      setAdministradoraId(adm.id)
      carregarGrupos(adm.id)
    }
    carregarProdutos()
    carregarCorretores()
  }, [])

  async function carregarGrupos(adminId: string) {
    try {
      const data = await GruposBeneficiariosService.buscarTodos(adminId)
      setGrupos(data)
    } catch (error) {
      console.error("Erro ao carregar grupos:", error)
      toast.error("Erro ao carregar grupos de beneficiários")
    }
  }

  async function carregarProdutos() {
    try {
      const data = await obterProdutosCorretores()
      setProdutos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
      setProdutos([])
    }
  }

  async function carregarCorretores() {
    try {
      const data = await buscarCorretores()
      setCorretores(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Erro ao carregar corretores:", error)
      setCorretores([])
    }
  }

  async function pesquisar() {
    try {
      setLoading(true)
      // TODO: Integrar com API de contratos de beneficiários
      setResultados([])
      toast.info("Pesquisa de contratos em desenvolvimento. Filtros serão aplicados na integração.")
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || "Erro ao pesquisar"))
    } finally {
      setLoading(false)
    }
  }

  function limpar() {
    setCpf("")
    setGrupoId("")
    setProdutoId("")
    setCorretorId("")
    setResultados([])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Beneficiários › Contrato</h1>
        <p className="text-sm text-gray-500 mt-1">Buscar por CPF, grupo de beneficiário, produto e corretor.</p>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">CPF</label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Grupo de beneficiário</label>
            <Select value={grupoId} onValueChange={setGrupoId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Produto</label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome || "-"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Corretor</label>
            <Select value={corretorId} onValueChange={setCorretorId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {corretores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome || "-"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            onClick={pesquisar}
            disabled={loading}
            className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
          >
            <Search className="h-4 w-4 mr-1" />
            Pesquisar
          </Button>
          <Button onClick={limpar} variant="outline" className="h-9 px-4 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm">
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="bg-white border border-gray-200 rounded-sm p-6">
          {resultados.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Use os filtros e clique em Pesquisar para buscar contratos.</p>
          ) : (
            <p className="text-sm text-gray-600">{resultados.length} resultado(s) encontrado(s).</p>
          )}
        </div>
      </div>
    </div>
  )
}
