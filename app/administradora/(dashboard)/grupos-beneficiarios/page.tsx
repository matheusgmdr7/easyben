"use client"

import { useState, useEffect } from "react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, FileSearch, Pencil, UserMinus, Power } from "lucide-react"
import { useRouter } from "next/navigation"
import ModalNovoGrupo from "@/components/administradora/modals/modal-novo-grupo"
import { ModalConfirmacaoExclusao } from "@/components/administradora/modal-confirmacao-exclusao"

export default function GruposBeneficiariosPage() {
  const router = useRouter()
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [showModalNovo, setShowModalNovo] = useState(false)
  const [grupoEditando, setGrupoEditando] = useState<GrupoBeneficiarios | null>(null)
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false)
  const [grupoParaExcluir, setGrupoParaExcluir] = useState<string | null>(null)
  const [excluindoGrupo, setExcluindoGrupo] = useState(false)
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)
  const [grupoParaStatus, setGrupoParaStatus] = useState<{ id: string; ativo: boolean; nome: string } | null>(null)
  const [alterandoStatus, setAlterandoStatus] = useState(false)

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
    try {
      setExcluindoGrupo(true)
      await GruposBeneficiariosService.deletar(grupoId)
      toast.success("Grupo excluído com sucesso!")
      setConfirmExcluirOpen(false)
      setGrupoParaExcluir(null)
      if (administradoraId) {
        carregarGrupos(administradoraId)
      }
    } catch (error: any) {
      console.error("❌ Erro ao deletar grupo:", error)
      toast.error("Erro ao deletar grupo: " + error.message)
    } finally {
      setExcluindoGrupo(false)
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

  const gruposFiltrados = grupos.filter((grupo) =>
    grupo.nome.toLowerCase().includes(filtro.toLowerCase())
  )

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
              <TableHead className="font-bold">Nome do Grupo</TableHead>
              <TableHead className="font-bold">Total de Beneficiários</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gruposFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  {filtro ? "Nenhum grupo encontrado com o filtro aplicado" : "Nenhum grupo cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              gruposFiltrados.map((grupo) => (
                <TableRow key={grupo.id} className="hover:bg-gray-50">
                  <TableCell className="font-bold">{grupo.nome}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border border-slate-200 bg-slate-50 text-slate-700">
                      {grupo.total_clientes ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border ${
                        grupo.ativo ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-gray-100 text-gray-600 border-gray-300"
                      }`}
                    >
                      {grupo.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/administradora/grupos-beneficiarios/${grupo.id}`)}
                        className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 rounded-md"
                        title="Ver detalhes"
                      >
                        <FileSearch className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditar(grupo)}
                        className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 rounded-md"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGrupoParaStatus({ id: grupo.id, ativo: grupo.ativo, nome: grupo.nome })
                          setConfirmStatusOpen(true)
                        }}
                        className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 rounded-md"
                        title={grupo.ativo ? "Desativar" : "Ativar"}
                      >
                        <Power className="h-4 w-4 mr-1" />
                        {grupo.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGrupoParaExcluir(grupo.id)
                          setConfirmExcluirOpen(true)
                        }}
                        className="h-8 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 rounded-md"
                        title="Excluir"
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Confirmação Excluir Grupo */}
      <ModalConfirmacaoExclusao
        open={confirmExcluirOpen}
        onOpenChange={(open) => {
          setConfirmExcluirOpen(open)
          if (!open) setGrupoParaExcluir(null)
        }}
        titulo="Excluir grupo"
        descricao="Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita."
        textoConfirmar="Excluir"
        onConfirm={() => grupoParaExcluir && handleDeletar(grupoParaExcluir)}
        carregando={excluindoGrupo}
      />

      {/* Modal Confirmação Ativar/Desativar Grupo */}
      <ModalConfirmacaoExclusao
        open={confirmStatusOpen}
        onOpenChange={(open) => {
          setConfirmStatusOpen(open)
          if (!open) setGrupoParaStatus(null)
        }}
        titulo={grupoParaStatus ? (grupoParaStatus.ativo ? "Desativar grupo" : "Ativar grupo") : ""}
        descricao={grupoParaStatus
          ? grupoParaStatus.ativo
            ? `Tem certeza que deseja desativar o grupo "${grupoParaStatus.nome}"? O grupo não aparecerá em listas ativas até ser ativado novamente.`
            : `Tem certeza que deseja ativar o grupo "${grupoParaStatus.nome}"?`
          : ""}
        textoConfirmar={grupoParaStatus?.ativo ? "Desativar" : "Ativar"}
        onConfirm={async () => {
          if (!grupoParaStatus) return
          setAlterandoStatus(true)
          try {
            await handleAlterarStatus(grupoParaStatus.id, grupoParaStatus.ativo)
            setConfirmStatusOpen(false)
            setGrupoParaStatus(null)
          } finally {
            setAlterandoStatus(false)
          }
        }}
        carregando={alterandoStatus}
      />

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

