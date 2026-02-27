"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Users, Briefcase } from "lucide-react"
import type { CorretorAdministradora } from "@/services/corretores-administradora-service"
import { ModalConfirmacaoExclusao } from "@/components/administradora/modal-confirmacao-exclusao"

export default function CorretoresPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [list, setList] = useState<CorretorAdministradora[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false)
  const [itemParaExcluir, setItemParaExcluir] = useState<CorretorAdministradora | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    carregar(adm.id)
  }, [router])

  async function carregar(admId: string) {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/administradora/corretores?administradora_id=${encodeURIComponent(admId)}`
      )
      if (!res.ok) throw new Error("Erro ao carregar")
      const data = await res.json()
      setList(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Erro ao carregar corretores")
      setList([])
    } finally {
      setLoading(false)
    }
  }

  async function excluir(item: CorretorAdministradora) {
    if (!administradoraId) return
    try {
      setExcluindo(true)
      const res = await fetch(
        `/api/administradora/corretores/${item.id}?administradora_id=${encodeURIComponent(administradoraId)}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || "Erro ao excluir")
      }
      toast.success("Corretor excluído")
      setConfirmExcluirOpen(false)
      setItemParaExcluir(null)
      carregar(administradoraId)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir")
    } finally {
      setExcluindo(false)
    }
  }

  if (!administradoraId) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Corretores</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Cadastre corretores e visualize os clientes vinculados a cada um.
            </p>
          </div>
          <Button
            onClick={() => router.push("/administradora/corretores/novo")}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold shadow-lg rounded inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Novo corretor
          </Button>
        </div>
      </div>

      <div className="px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5" />
              Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500 py-8 text-center">Carregando...</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Nenhum corretor cadastrado. Clique em &quot;Novo corretor&quot; para começar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Telefone</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-10 text-center">Clientes</TableHead>
                    <TableHead className="font-semibold w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="text-gray-600">{item.email || "—"}</TableCell>
                      <TableCell className="text-gray-600">{item.telefone || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.ativo ? "default" : "secondary"}
                          className={item.ativo ? "bg-green-600" : ""}
                        >
                          {item.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/administradora/corretores/${item.id}`)}
                          className="gap-1"
                          title="Ver clientes vinculados"
                        >
                          <Users className="h-4 w-4" />
                          Ver clientes
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/administradora/corretores/${item.id}/editar`)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItemParaExcluir(item)
                              setConfirmExcluirOpen(true)
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ModalConfirmacaoExclusao
        open={confirmExcluirOpen}
        onOpenChange={setConfirmExcluirOpen}
        titulo="Excluir corretor"
        descricao={
          itemParaExcluir
            ? `Tem certeza que deseja excluir "${itemParaExcluir.nome}"? Os clientes vinculados não serão excluídos, apenas o vínculo será removido.`
            : ""
        }
        carregando={excluindo}
        onConfirm={() => itemParaExcluir && excluir(itemParaExcluir)}
      />
    </div>
  )
}
