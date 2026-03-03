"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"

export default function BeneficiariosContratoPage() {
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [contratos, setContratos] = useState<{ id: string; numero?: string; descricao?: string }[]>([])
  const [produtos, setProdutos] = useState<{ id: string; nome?: string; contrato_id?: string }[]>([])
  const [loading, setLoading] = useState(false)

  const [cpf, setCpf] = useState("")
  const [contratoId, setContratoId] = useState("")
  const [produtoId, setProdutoId] = useState("")

  const [resultados, setResultados] = useState<any[]>([])

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (adm?.id) {
      setAdministradoraId(adm.id)
      carregarContratos(adm.id)
    }
  }, [])

  async function carregarContratos(adminId: string) {
    try {
      const res = await fetch(`/api/administradora/contratos?administradora_id=${encodeURIComponent(adminId)}`)
      const data = await res.json().catch(() => [])
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar contratos")
      setContratos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Erro ao carregar contratos:", error)
      setContratos([])
    }
  }

  async function carregarProdutosPorContrato(contratoIdSelecionado: string) {
    if (!administradoraId || !contratoIdSelecionado) {
      setProdutos([])
      return
    }
    try {
      const res = await fetch(
        `/api/administradora/produtos-contrato?administradora_id=${encodeURIComponent(administradoraId)}&contrato_id=${encodeURIComponent(contratoIdSelecionado)}`
      )
      const data = await res.json().catch(() => [])
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar produtos do contrato")
      setProdutos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Erro ao carregar produtos do contrato:", error)
      setProdutos([])
    }
  }

  async function pesquisar() {
    try {
      setLoading(true)
      // TODO: Integrar com API de contratos de beneficiários
      setResultados([])
      toast.info("Pesquisa em desenvolvimento. Filtros de CPF, contrato e produto vinculado já configurados.")
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || "Erro ao pesquisar"))
    } finally {
      setLoading(false)
    }
  }

  function limpar() {
    setCpf("")
    setContratoId("")
    setProdutoId("")
    setProdutos([])
    setResultados([])
  }

  useEffect(() => {
    setProdutoId("")
    if (!contratoId) {
      setProdutos([])
      return
    }
    carregarProdutosPorContrato(contratoId)
  }, [contratoId, administradoraId])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">Beneficiários › Contrato</h1>
        <p className="text-sm text-gray-500 mt-1">Buscar por CPF, contrato e produto vinculado ao contrato.</p>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
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
            <label className="block text-xs text-gray-600 mb-1">Contrato</label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {`${c.numero || "-"} - ${c.descricao || "Sem descrição"}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Produto vinculado</label>
            <Select value={produtoId} onValueChange={setProdutoId} disabled={!contratoId}>
              <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder={contratoId ? "Selecione" : "Selecione um contrato"} />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome || "-"}</SelectItem>
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
