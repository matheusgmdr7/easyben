"use client"

import { useState, useEffect } from "react"
import { EntidadesService, type Entidade, type CriarEntidadeData } from "@/services/entidades-service"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import ModalNovaEntidade from "@/components/admin/modals/modal-nova-entidade"

export default function EntidadesPage() {
  const [entidades, setEntidades] = useState<Entidade[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [entidadeEditando, setEntidadeEditando] = useState<Entidade | null>(null)
  const [saving, setSaving] = useState(false)

  // Estados do formulário
  const [formData, setFormData] = useState<CriarEntidadeData>({
    sigla: "",
    nome: "",
  })

  useEffect(() => {
    carregarEntidades()
  }, [])

  async function carregarEntidades() {
    try {
      setLoading(true)
      const data = await EntidadesService.buscarTodas()
      setEntidades(data)
    } catch (error: any) {
      console.error("❌ Erro ao carregar entidades:", error)
      toast.error("Erro ao carregar entidades")
    } finally {
      setLoading(false)
    }
  }

  function limparFormulario() {
    setFormData({
      sigla: "",
      nome: "",
    })
  }

  function abrirModalNova() {
    setIsEditing(false)
    setEntidadeEditando(null)
    limparFormulario()
    setIsDialogOpen(true)
  }

  function abrirModalEditar(entidade: Entidade) {
    setIsEditing(true)
    setEntidadeEditando(entidade)
    setFormData({
      sigla: entidade.sigla,
      nome: entidade.nome,
    })
    setIsDialogOpen(true)
  }

  async function handleSalvar() {
    try {
      setSaving(true)

      // Validações
      if (!formData.sigla || !formData.nome) {
        toast.error("Preencha todos os campos obrigatórios")
        return
      }

      if (isEditing && entidadeEditando) {
        await EntidadesService.atualizar(entidadeEditando.id, formData)
        toast.success("Entidade atualizada com sucesso!")
      } else {
        await EntidadesService.criar(formData)
        toast.success("Entidade criada com sucesso!")
      }

      setIsDialogOpen(false)
      limparFormulario()
      carregarEntidades()
    } catch (error: any) {
      console.error("❌ Erro ao salvar entidade:", error)
      toast.error(error.message || "Erro ao salvar entidade")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletar(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta entidade?")) return

    try {
      await EntidadesService.deletar(id)
      toast.success("Entidade excluída com sucesso!")
      carregarEntidades()
    } catch (error: any) {
      console.error("❌ Erro ao deletar entidade:", error)
      toast.error(error.message || "Erro ao deletar entidade")
    }
  }

  const entidadesFiltradas = entidades.filter((entidade) => {
    const termo = searchTerm.toLowerCase()
    return (
      entidade.nome.toLowerCase().includes(termo) ||
      entidade.sigla.toLowerCase().includes(termo)
    )
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Entidades</h1>
          <p className="text-sm text-gray-600 mt-1">Gerencie as entidades do sistema</p>
        </div>
        <Button onClick={abrirModalNova} className="bg-[#0F172A] hover:bg-[#1E293B]">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Entidade
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou sigla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-2 border-gray-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : entidadesFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "Nenhuma entidade encontrada" : "Nenhuma entidade cadastrada"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Sigla</TableHead>
                    <TableHead className="font-bold">Nome</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entidadesFiltradas.map((entidade) => (
                    <TableRow key={entidade.id}>
                      <TableCell className="font-bold">{entidade.sigla}</TableCell>
                      <TableCell>{entidade.nome}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirModalEditar(entidade)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletar(entidade.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro/Edição */}
      <ModalNovaEntidade
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          limparFormulario()
        }}
        onSave={handleSalvar}
        saving={saving}
        formData={formData}
        setFormData={setFormData}
        limparFormulario={limparFormulario}
        isEditing={isEditing}
      />
    </div>
  )
}

