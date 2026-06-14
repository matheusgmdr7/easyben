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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Eye, Ticket } from "lucide-react"
import {
  STATUS_CHAMADO_LABELS,
  type ChamadoAdministradora,
  type StatusChamado,
} from "@/services/chamados-administradora-service"

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function badgeStatus(status: StatusChamado) {
  const map: Record<StatusChamado, string> = {
    aberto: "bg-blue-100 text-blue-800",
    em_andamento: "bg-amber-100 text-amber-800",
    resolvido: "bg-green-100 text-green-800",
    fechado: "bg-gray-200 text-gray-700",
  }
  return (
    <Badge variant="secondary" className={map[status]}>
      {STATUS_CHAMADO_LABELS[status]}
    </Badge>
  )
}

export default function ChamadosPage() {
  const router = useRouter()
  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [list, setList] = useState<ChamadoAdministradora[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<StatusChamado | "todos">("todos")

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    carregar(adm.id, filtroStatus)
  }, [router, filtroStatus])

  async function carregar(admId: string, status: StatusChamado | "todos") {
    try {
      setLoading(true)
      const params = new URLSearchParams({ administradora_id: admId })
      if (status !== "todos") params.set("status", status)
      const res = await fetch(`/api/administradora/chamados?${params.toString()}`)
      if (!res.ok) throw new Error("Erro ao carregar")
      const data = await res.json()
      setList(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Erro ao carregar chamados")
      setList([])
    } finally {
      setLoading(false)
    }
  }

  if (!administradoraId) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Chamados</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Registre queixas de clientes e acompanhe o status até a resolução.
            </p>
          </div>
          <Button
            onClick={() => router.push("/administradora/chamados/novo")}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold shadow-lg rounded inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Abrir chamado
          </Button>
        </div>
      </div>

      <div className="px-6 py-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ticket className="h-5 w-5" />
              Chamados registrados
            </CardTitle>
            <div className="w-full sm:w-48">
              <Select
                value={filtroStatus}
                onValueChange={(v) => setFiltroStatus(v as StatusChamado | "todos")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500 py-8 text-center">Carregando...</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Nenhum chamado encontrado. Clique em &quot;Abrir chamado&quot; para registrar uma queixa.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aberto em</TableHead>
                    <TableHead>Fechado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">#{item.numero}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[140px] truncate">
                        {item.grupo_nome || "—"}
                      </TableCell>
                      <TableCell>{item.cliente_nome}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.assunto}</TableCell>
                      <TableCell>{badgeStatus(item.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatarData(item.aberto_em)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {item.fechado_em ? formatarData(item.fechado_em) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/administradora/chamados/${item.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
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
