"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit2, Trash2, Eye, Eye as EyeIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import ModalNovoGrupo from "@/components/administradora/modals/modal-novo-grupo"

export default function GruposBeneficiariosPage() {
  const router = useRouter()
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [showModalNovo, setShowModalNovo] = useState(false)
  const [grupoEditando, setGrupoEditando] = useState<GrupoBeneficiarios | null>(null)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (administradora?.id) {
      setAdministradoraId(administradora.id)
      carregarGrupos(administradora.id)
    }
  }, [])

  async function carregarGrupos(adminId: string) {
    try {
      setLoading(true)
      const data = await GruposBeneficiariosService.buscarTodos(adminId)
      setGrupos(data)
    } catch (error: any) {
      console.error("❌ Erro ao carregar grupos:", error)
      toast.error("Erro ao carregar grupos de beneficiários")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletar(grupoId: string) {
    if (!confirm("Tem certeza que deseja excluir este grupo?")) return

    try {
      await GruposBeneficiariosService.deletar(grupoId)
      toast.success("Grupo excluído com sucesso!")
      if (administradoraId) {
        carregarGrupos(administradoraId)
      }
    } catch (error: any) {
      console.error("❌ Erro ao deletar grupo:", error)
      toast.error("Erro ao deletar grupo: " + error.message)
    }
  }

  async function handleAlterarStatus(grupoId: string, ativo: boolean) {
    try {
      await GruposBeneficiariosService.alterarStatus(grupoId, !ativo)
      toast.success(`Grupo ${!ativo ? "ativado" : "desativado"} com sucesso!`)
      if (administradoraId) {
        carregarGrupos(administradoraId)
      }
    } catch (error: any) {
      console.error("❌ Erro ao alterar status:", error)
      toast.error("Erro ao alterar status: " + error.message)
    }
  }

  function handleEditar(grupo: GrupoBeneficiarios) {
    setGrupoEditando(grupo)
    setShowModalNovo(true)
  }

  function handleNovo() {
    setGrupoEditando(null)
    setShowModalNovo(true)
  }

  function handleFecharModal() {
    setShowModalNovo(false)
    setGrupoEditando(null)
    if (administradoraId) {
      carregarGrupos(administradoraId)
    }
  }

  const gruposFiltrados = grupos.filter((grupo) => {
    const nomeMatch = grupo.nome.toLowerCase().includes(filtro.toLowerCase())
    const descricaoMatch = grupo.descricao?.toLowerCase().includes(filtro.toLowerCase())
    return nomeMatch || descricaoMatch
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">
              Grupos de Beneficiários
            </h1>
            <p className="text-gray-600 mt-1 font-medium">
              Gerencie grupos de beneficiários e configure métodos de faturamento
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar grupos..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10 h-10 border-2 border-gray-300 focus:border-[#0F172A] rounded-lg"
              />
            </div>
            <Button
              onClick={handleNovo}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-4 py-2 h-10 shadow-lg rounded"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-bold">Nome</TableHead>
              <TableHead className="font-bold">Descrição</TableHead>
              <TableHead className="font-bold">Configuração de Faturamento</TableHead>
              <TableHead className="font-bold">Total de Clientes</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gruposFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {filtro ? "Nenhum grupo encontrado com o filtro aplicado" : "Nenhum grupo cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              gruposFiltrados.map((grupo) => (
                <TableRow key={grupo.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{grupo.nome}</TableCell>
                  <TableCell className="text-gray-600">
                    {grupo.descricao || "-"}
                  </TableCell>
                  <TableCell>
                    {grupo.configuracao_faturamento ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{grupo.configuracao_faturamento.nome}</span>
                        <span className="text-xs text-gray-500 capitalize">
                          {grupo.configuracao_faturamento.tipo_faturamento}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Não configurado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-semibold">
                      {grupo.total_clientes || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={grupo.ativo ? "default" : "secondary"}
                      className={grupo.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                    >
                      {grupo.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/administradora/grupos-beneficiarios/${grupo.id}`)}
                        className="text-[#0F172A] hover:bg-[#0F172A]/10 p-2 rounded"
                        title="Ver Detalhes"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditar(grupo)}
                        className="text-[#0F172A] hover:bg-[#0F172A]/10 p-2 rounded"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAlterarStatus(grupo.id, grupo.ativo)}
                        className="text-[#0F172A] hover:bg-[#0F172A]/10 p-2 rounded"
                        title={grupo.ativo ? "Desativar" : "Ativar"}
                      >
                        {grupo.ativo ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4 opacity-50" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletar(grupo.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Novo/Editar Grupo */}
      {showModalNovo && administradoraId && (
        <ModalNovoGrupo
          open={showModalNovo}
          onClose={handleFecharModal}
          administradoraId={administradoraId}
          grupoEditando={grupoEditando}
        />
      )}
    </div>
  )
}

