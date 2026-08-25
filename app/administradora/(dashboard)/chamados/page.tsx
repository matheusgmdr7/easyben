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
  PRIORIDADE_CHAMADO_LABELS,
  SETOR_CHAMADO_LABELS,
  SETORES_CHAMADO,
  formatarPrazoChamado,
  prazoChamadoVencido,
  type ChamadoAdministradora,
  type PrioridadeChamado,
  type SetorChamado,
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

function badgePrioridade(prioridade: PrioridadeChamado | null | undefined) {
  const valor = prioridade || "normal"
  const map: Record<PrioridadeChamado, string> = {
    baixa: "bg-slate-100 text-slate-700",
    normal: "bg-blue-50 text-blue-700",
    alta: "bg-orange-100 text-orange-800",
    urgente: "bg-red-100 text-red-800",
  }
  return (
    <Badge variant="secondary" className={map[valor]}>
      {PRIORIDADE_CHAMADO_LABELS[valor]}
    </Badge>
  )
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
  const [filtroPrioridade, setFiltroPrioridade] = useState<PrioridadeChamado | "todos">("todos")
  const [filtroSetor, setFiltroSetor] = useState<SetorChamado | "todos">("todos")

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    carregar(adm.id, filtroStatus, filtroPrioridade, filtroSetor)
  }, [router, filtroStatus, filtroPrioridade, filtroSetor])

  async function carregar(
    admId: string,
    status: StatusChamado | "todos",
    prioridade: PrioridadeChamado | "todos",
    setor: SetorChamado | "todos"
  ) {
    try {
      setLoading(true)
      const params = new URLSearchParams({ administradora_id: admId })
      if (status !== "todos") params.set("status", status)
      if (prioridade !== "todos") params.set("prioridade", prioridade)
      if (setor !== "todos") params.set("setor", setor)
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
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-52">
                <Select
                  value={filtroSetor}
                  onValueChange={(v) => setFiltroSetor(v as SetorChamado | "todos")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os setores</SelectItem>
                    {SETORES_CHAMADO.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SETOR_CHAMADO_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-44">
                <Select
                  value={filtroPrioridade}
                  onValueChange={(v) => setFiltroPrioridade(v as PrioridadeChamado | "todos")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas prioridades</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-44">
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
                    <TableHead>Setor</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Prazo</TableHead>
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
                      <TableCell className="text-sm text-gray-600 max-w-[160px] truncate">
                        {SETOR_CHAMADO_LABELS[item.setor_responsavel || "implantacao"]}
                      </TableCell>
                      <TableCell>{badgePrioridade(item.prioridade)}</TableCell>
                      <TableCell className="text-sm">
                        {item.prazo ? (
                          <span
                            className={
                              prazoChamadoVencido(item.prazo, item.status)
                                ? "text-red-600 font-medium"
                                : "text-gray-600"
                            }
                          >
                            {formatarPrazoChamado(item.prazo)}
                            {prazoChamadoVencido(item.prazo, item.status) ? " (vencido)" : ""}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
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
