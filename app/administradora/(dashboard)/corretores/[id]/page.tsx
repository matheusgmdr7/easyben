"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { ArrowLeft, Pencil, Users } from "lucide-react"
import type { CorretorAdministradora } from "@/services/corretores-administradora-service"
import { formatarMoeda } from "@/utils/formatters"

type ClienteVinculado = {
  id: string
  cliente_nome: string
  cliente_cpf: string | null
  cliente_email: string | null
  valor_mensal: number
  status: string
}

export default function CorretorDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [corretor, setCorretor] = useState<CorretorAdministradora | null>(null)
  const [clientes, setClientes] = useState<ClienteVinculado[]>([])
  const [loading, setLoading] = useState(true)

  const administradora = getAdministradoraLogada()
  const administradoraId = administradora?.id

  useEffect(() => {
    if (!administradoraId || !id) return
    ;(async () => {
      try {
        setLoading(true)
        const [resCorretor, resClientes] = await Promise.all([
          fetch(
            `/api/administradora/corretores/${id}?administradora_id=${encodeURIComponent(administradoraId)}`
          ),
          fetch(
            `/api/administradora/corretores/${id}/clientes?administradora_id=${encodeURIComponent(administradoraId)}`
          ),
        ])
        if (!resCorretor.ok) {
          if (resCorretor.status === 404) {
            toast.error("Corretor não encontrado")
            router.push("/administradora/corretores")
            return
          }
          throw new Error("Erro ao carregar corretor")
        }
        const dataCorretor: CorretorAdministradora = await resCorretor.json()
        setCorretor(dataCorretor)
        if (resClientes.ok) {
          const dataClientes = await resClientes.json()
          setClientes(Array.isArray(dataClientes) ? dataClientes : [])
        } else {
          setClientes([])
        }
      } catch {
        toast.error("Erro ao carregar dados")
        router.push("/administradora/corretores")
      } finally {
        setLoading(false)
      }
    })()
  }, [administradoraId, id, router])

  if (!administradoraId) {
    router.push("/administradora/login")
    return null
  }

  if (loading || !corretor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Button
          variant="ghost"
          className="font-bold mb-2"
          onClick={() => router.push("/administradora/corretores")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{corretor.nome}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {corretor.email && <span>{corretor.email}</span>}
              {corretor.email && corretor.telefone && " · "}
              {corretor.telefone && <span>{corretor.telefone}</span>}
              {!corretor.email && !corretor.telefone && "Sem contato cadastrado"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/administradora/corretores/${id}/editar`)}
            className="inline-flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            Editar corretor
          </Button>
        </div>
      </div>

      <div className="px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Clientes vinculados ({clientes.length})
            </CardTitle>
            <p className="text-sm text-gray-500">
              Para vincular um cliente a este corretor, vá em Clientes (Contrato) e altere o
              corretor do cliente.
            </p>
          </CardHeader>
          <CardContent>
            {clientes.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Nenhum cliente vinculado a este corretor.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">CPF</TableHead>
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Valor mensal</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.cliente_nome}</TableCell>
                      <TableCell className="text-gray-600">{c.cliente_cpf || "—"}</TableCell>
                      <TableCell className="text-gray-600">{c.cliente_email || "—"}</TableCell>
                      <TableCell>{formatarMoeda(c.valor_mensal)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.status === "ativo"
                              ? "default"
                              : c.status === "inadimplente"
                                ? "destructive"
                                : "secondary"
                          }
                          className={c.status === "ativo" ? "bg-green-600" : ""}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
