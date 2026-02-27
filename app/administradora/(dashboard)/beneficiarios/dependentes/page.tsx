"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"

const STATUS_OPCOES = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativo" },
  { value: "cancelado", label: "Cancelado" },
]

export default function BeneficiariosDependentesPage() {
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [loading, setLoading] = useState(false)

  const [cpf, setCpf] = useState("")
  const [nome, setNome] = useState("")
  const [grupoId, setGrupoId] = useState("")
  const [titular, setTitular] = useState("")
  const [status, setStatus] = useState("todos")

  const [resultados, setResultados] = useState<any[]>([])

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (adm?.id) {
      setAdministradoraId(adm.id)
      carregarGrupos(adm.id)
    }
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

  async function pesquisar() {
    try {
      setLoading(true)
      // TODO: Integrar com API de dependentes
      setResultados([])
      toast.info("Pesquisa de dependentes em desenvolvimento. Filtros serão aplicados na integração.")
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || "Erro ao pesquisar"))
    } finally {
      setLoading(false)
    }
  }

  function limpar() {
    setCpf("")
    setNome("")
    setGrupoId("")
    setTitular("")
    setStatus("todos")
    setResultados([])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Beneficiários › Dependentes</h1>
        <p className="text-sm text-gray-500 mt-1">Buscar dependentes por CPF, nome, grupo, titular e status.</p>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
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
            <label className="block text-xs text-gray-600 mb-1">Nome</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do dependente"
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
            <label className="block text-xs text-gray-600 mb-1">Titular</label>
            <Input
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              placeholder="Nome ou CPF do titular"
              className="h-9 text-sm border-gray-300 rounded-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Ativo / Cancelado</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPCOES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
            <p className="text-sm text-gray-500 text-center py-8">Use os filtros e clique em Pesquisar para buscar dependentes.</p>
          ) : (
            <p className="text-sm text-gray-600">{resultados.length} resultado(s) encontrado(s).</p>
          )}
        </div>
      </div>
    </div>
  )
}
