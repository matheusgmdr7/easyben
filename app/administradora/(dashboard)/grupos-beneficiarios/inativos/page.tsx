"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileSearch, Power, Search, UserMinus } from "lucide-react"
import { toast } from "sonner"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ModalConfirmacaoExclusao } from "@/components/administradora/modal-confirmacao-exclusao"

export default function GruposBeneficiariosInativosPage() {
  const router = useRouter()
  const [grupos, setGrupos] = useState<GrupoBeneficiarios[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false)
  const [grupoParaExcluir, setGrupoParaExcluir] = useState<string | null>(null)
  const [excluindoGrupo, setExcluindoGrupo] = useState(false)
  const [confirmAtivarOpen, setConfirmAtivarOpen] = useState(false)
  const [grupoParaAtivar, setGrupoParaAtivar] = useState<{ id: string; nome: string } | null>(null)
  const [ativandoGrupo, setAtivandoGrupo] = useState(false)

  useEffect(() => {
    const administradora = getAdministradoraLogada()
    if (administradora?.id) {
      setAdministradoraId(administradora.id)
      void carregarGrupos(administradora.id)
    } else {
      setLoading(false)
    }
  }, [])

  async function carregarGrupos(adminId: string) {
    try {
      setLoading(true)
      const data = await GruposBeneficiariosService.buscarInativos(adminId)
      setGrupos(data)
    } catch (error) {
      console.error("Erro ao carregar grupos inativos:", error)
      toast.error("Erro ao carregar grupos inativos")
    } finally {
      setLoading(false)
    }
  }

  async function handleAtivar(grupoId: string) {
    try {
      setAtivandoGrupo(true)
      await GruposBeneficiariosService.alterarStatus(grupoId, true)
      toast.success("Grupo ativado. Ele voltou para a lista principal.")
      setConfirmAtivarOpen(false)
      setGrupoParaAtivar(null)
      if (administradoraId) await carregarGrupos(administradoraId)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao ativar grupo"
      toast.error(message)
    } finally {
      setAtivandoGrupo(false)
    }
  }

  async function handleDeletar(grupoId: string) {
    try {
      setExcluindoGrupo(true)
      await GruposBeneficiariosService.deletar(grupoId)
      toast.success("Grupo excluído com sucesso!")
      setConfirmExcluirOpen(false)
      setGrupoParaExcluir(null)
      if (administradoraId) await carregarGrupos(administradoraId)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao excluir grupo"
      toast.error(message)
    } finally {
      setExcluindoGrupo(false)
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <button
          type="button"
          onClick={() => router.push("/administradora/grupos-beneficiarios")}
          className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
        >
          Voltar para grupos
        </button>
        <div className="mt-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 tracking-tight">Grupos inativos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Estes grupos não entram na lista principal nem nas contagens de beneficiários ativos.
            </p>
          </div>
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar grupos inativos..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-10 h-10 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-bold">Nome do Grupo</TableHead>
              <TableHead className="font-bold">Beneficiários no grupo</TableHead>
              <TableHead className="font-bold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gruposFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  {filtro ? "Nenhum grupo inativo encontrado com o filtro aplicado" : "Nenhum grupo inativo"}
                </TableCell>
              </TableRow>
            ) : (
              gruposFiltrados.map((grupo) => (
                <TableRow key={grupo.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-800">{grupo.nome}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border border-slate-200 bg-slate-50 text-slate-700">
                      {grupo.total_clientes ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/administradora/grupos-beneficiarios/${grupo.id}`)}
                        className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md"
                      >
                        <FileSearch className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGrupoParaAtivar({ id: grupo.id, nome: grupo.nome })
                          setConfirmAtivarOpen(true)
                        }}
                        className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md"
                      >
                        <Power className="h-4 w-4 mr-1" />
                        Ativar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGrupoParaExcluir(grupo.id)
                          setConfirmExcluirOpen(true)
                        }}
                        className="h-8 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 rounded-md"
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

      <ModalConfirmacaoExclusao
        open={confirmAtivarOpen}
        onOpenChange={(open) => {
          setConfirmAtivarOpen(open)
          if (!open) setGrupoParaAtivar(null)
        }}
        titulo="Ativar grupo"
        descricao={
          grupoParaAtivar
            ? `Ativar o grupo "${grupoParaAtivar.nome}"? Ele volta para a lista principal e os beneficiários voltam a entrar nas contagens.`
            : ""
        }
        textoConfirmar="Ativar"
        onConfirm={() => grupoParaAtivar && handleAtivar(grupoParaAtivar.id)}
        carregando={ativandoGrupo}
      />

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
    </div>
  )
}
