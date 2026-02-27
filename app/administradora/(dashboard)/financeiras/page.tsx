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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { AdministradoraFinanceira } from "@/services/financeiras-service"

function IconPlus() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008H17.25v-.008zm0 3h.008v.008H17.25v-.008z" />
    </svg>
  )
}
function IconPencil() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  )
}
function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

const INSTITUICOES: Record<string, string> = {
  asaas: "Asaas",
  pagseguro: "PagSeguro",
  mercadopago: "Mercado Pago",
  stripe: "Stripe",
  outro: "Outro",
}

export default function FinanceirasPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [list, setList] = useState<AdministradoraFinanceira[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false)
  const [itemParaExcluir, setItemParaExcluir] = useState<AdministradoraFinanceira | null>(null)
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
        `/api/administradora/financeiras?administradora_id=${encodeURIComponent(admId)}`
      )
      if (!res.ok) throw new Error("Erro ao carregar")
      const data = await res.json()
      setList(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Erro ao carregar empresas financeiras")
      setList([])
    } finally {
      setLoading(false)
    }
  }

  async function excluir(item: AdministradoraFinanceira) {
    if (!administradoraId) return
    try {
      setExcluindo(true)
      const res = await fetch(
        `/api/administradora/financeiras/${item.id}?administradora_id=${encodeURIComponent(administradoraId)}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || "Erro ao excluir")
      }
      toast.success("Empresa financeira excluída")
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
            <h1 className="text-xl font-semibold text-gray-800">Empresas financeiras</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Cadastre e gerencie contas de gateway de pagamento para gerar boletos.
            </p>
          </div>
          <Button
            onClick={() => router.push("/administradora/financeiras/nova")}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold shadow-lg rounded inline-flex items-center gap-2"
          >
            <IconPlus />
            Nova empresa financeira
          </Button>
        </div>
      </div>

      <div className="px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconBuilding />
              Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500 py-8 text-center">Carregando...</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Nenhuma empresa financeira cadastrada. Clique em &quot;Nova empresa financeira&quot; para
                começar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">Instituição</TableHead>
                    <TableHead className="font-semibold">Ambiente</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>
                        {INSTITUICOES[item.instituicao_financeira] || item.instituicao_financeira}
                      </TableCell>
                      <TableCell className="capitalize">{item.ambiente}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            item.status_integracao === "ativa"
                              ? "border-transparent bg-green-600 text-white"
                              : "border-transparent bg-gray-200 text-gray-800"
                          }`}
                        >
                          {item.status_integracao === "ativa" ? "Ativa" : "Inativa"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/administradora/financeiras/${item.id}/editar`)}
                            className="h-8 w-8 p-0"
                            title="Editar"
                          >
                            <IconPencil />
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
                            <IconTrash />
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

      <AlertDialog open={confirmExcluirOpen} onOpenChange={setConfirmExcluirOpen}>
        <AlertDialogContent className="border-slate-200 bg-white shadow-lg sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-slate-900">
              Excluir empresa financeira
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              {itemParaExcluir
                ? `Tem certeza que deseja excluir "${itemParaExcluir.nome}"? Esta ação não pode ser desfeita.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={excluindo}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (itemParaExcluir) excluir(itemParaExcluir).then(() => setConfirmExcluirOpen(false))
              }}
              disabled={excluindo}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
