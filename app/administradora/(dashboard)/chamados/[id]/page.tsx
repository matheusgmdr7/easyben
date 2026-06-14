"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  getAdministradoraLogada,
  getUsuarioAdministradoraLogado,
} from "@/services/auth-administradoras-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Clock, CheckCircle2, ExternalLink } from "lucide-react"
import Link from "next/link"
import {
  STATUS_CHAMADO_LABELS,
  type ChamadoAdministradora,
  type ChamadoHistorico,
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

function labelHistorico(item: ChamadoHistorico) {
  if (item.tipo === "abertura") return "Chamado aberto"
  if (item.tipo === "fechamento") return "Chamado concluído"
  if (item.tipo === "status" && item.status_novo) {
    return `Status alterado para ${STATUS_CHAMADO_LABELS[item.status_novo as StatusChamado] || item.status_novo}`
  }
  return "Observação registrada"
}

export default function ChamadoDetalhePage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params.id || "")

  const [administradoraId, setAdministradoraId] = useState<string | null>(null)
  const [chamado, setChamado] = useState<ChamadoAdministradora | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [novoStatus, setNovoStatus] = useState<StatusChamado | "">("")
  const [observacao, setObservacao] = useState("")
  const [modalFechar, setModalFechar] = useState(false)
  const [resolucao, setResolucao] = useState("")

  const usuario = getUsuarioAdministradoraLogado()

  const carregar = useCallback(async (admId: string) => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/administradora/chamados/${id}?administradora_id=${encodeURIComponent(admId)}`
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || "Chamado não encontrado")
      }
      const data = await res.json()
      setChamado(data)
      setNovoStatus(data.status)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar chamado")
      setChamado(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      router.push("/administradora/login")
      return
    }
    setAdministradoraId(adm.id)
    carregar(adm.id)
  }, [router, carregar])

  async function atualizarStatus() {
    if (!administradoraId || !chamado || chamado.status === "fechado" || chamado.status === "resolvido") return
    if (!novoStatus || novoStatus === chamado.status) {
      if (!observacao.trim()) {
        toast.error("Selecione um novo status ou adicione uma observação")
        return
      }
    }

    if (novoStatus === "fechado" || novoStatus === "resolvido") {
      setModalFechar(true)
      return
    }

    try {
      setSalvando(true)
      const res = await fetch(`/api/administradora/chamados/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          status: novoStatus !== chamado.status ? novoStatus : undefined,
          observacao: observacao.trim() || undefined,
          usuario_id: usuario?.id ?? null,
          usuario_nome: usuario?.nome,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || "Erro ao atualizar")
      }
      const data = await res.json()
      setChamado(data)
      setObservacao("")
      toast.success("Chamado atualizado")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar")
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarFechamento() {
    if (!administradoraId || !chamado || !resolucao.trim()) {
      toast.error("Informe como o chamado foi resolvido")
      return
    }

    try {
      setSalvando(true)
      const statusFinal = novoStatus === "resolvido" ? "resolvido" : "fechado"
      const res = await fetch(`/api/administradora/chamados/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: administradoraId,
          status: statusFinal,
          resolucao: resolucao.trim(),
          usuario_id: usuario?.id ?? null,
          usuario_nome: usuario?.nome,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || "Erro ao fechar chamado")
      }
      const data = await res.json()
      setChamado(data)
      setModalFechar(false)
      setResolucao("")
      setObservacao("")
      toast.success("Chamado concluído e registrado como resolvido")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao fechar chamado")
    } finally {
      setSalvando(false)
    }
  }

  if (!administradoraId) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando chamado...</p>
      </div>
    )
  }

  if (!chamado) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12 text-center">
        <p className="text-gray-600 mb-4">Chamado não encontrado.</p>
        <Button onClick={() => router.push("/administradora/chamados")}>Voltar à lista</Button>
      </div>
    )
  }

  const encerrado = chamado.status === "fechado" || chamado.status === "resolvido"

  const beneficiarioHref =
    chamado.grupo_id && chamado.vida_importada_id
      ? `/administradora/grupos-beneficiarios/${chamado.grupo_id}/beneficiario/${chamado.vida_importada_id}`
      : chamado.grupo_id && chamado.cliente_administradora_id
        ? `/administradora/grupos-beneficiarios/${chamado.grupo_id}/beneficiario/${chamado.cliente_administradora_id}`
        : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Button
          variant="ghost"
          className="font-bold mb-2"
          onClick={() => router.push("/administradora/chamados")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Chamado #{chamado.numero} — {chamado.assunto}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Cliente: {chamado.cliente_nome}</p>
          </div>
          {badgeStatus(chamado.status)}
        </div>
      </div>

      <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Queixa do cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <p className="whitespace-pre-wrap">{chamado.queixa}</p>
              {(chamado.cliente_telefone || chamado.cliente_email) && (
                <div className="pt-2 border-t text-gray-600">
                  {chamado.cliente_telefone && <p>Telefone: {chamado.cliente_telefone}</p>}
                  {chamado.cliente_email && <p>E-mail: {chamado.cliente_email}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {chamado.resolucao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Resolução
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{chamado.resolucao}</p>
                {chamado.fechado_em && (
                  <p className="text-xs text-gray-500 mt-3">
                    Concluído em {formatarData(chamado.fechado_em)}
                    {chamado.fechado_por_nome ? ` por ${chamado.fechado_por_nome}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!encerrado && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Atualizar chamado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Select
                    value={novoStatus}
                    onValueChange={(v) => setNovoStatus(v as StatusChamado)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_andamento">Em andamento</SelectItem>
                      <SelectItem value="resolvido">Resolvido</SelectItem>
                      <SelectItem value="fechado">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Registre uma observação no histórico (opcional)"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={atualizarStatus}
                  disabled={salvando}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
                >
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-gray-700">
              <p>
                <span className="text-gray-500">Cliente:</span> {chamado.cliente_nome}
              </p>
              {chamado.cliente_cpf && (
                <p>
                  <span className="text-gray-500">CPF:</span> {chamado.cliente_cpf}
                </p>
              )}
              {chamado.grupo_nome && (
                <p>
                  <span className="text-gray-500">Grupo:</span> {chamado.grupo_nome}
                </p>
              )}
              {beneficiarioHref && (
                <Link
                  href={beneficiarioHref}
                  className="inline-flex items-center gap-1 text-[#0F172A] hover:underline text-sm font-medium"
                >
                  Ver ficha do beneficiário
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              <p>
                <span className="text-gray-500">Aberto em:</span> {formatarData(chamado.aberto_em)}
              </p>
              {chamado.aberto_por_nome && (
                <p>
                  <span className="text-gray-500">Aberto por:</span> {chamado.aberto_por_nome}
                </p>
              )}
              {chamado.fechado_em && (
                <p>
                  <span className="text-gray-500">Fechado em:</span> {formatarData(chamado.fechado_em)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!chamado.historico?.length ? (
                <p className="text-sm text-gray-500">Sem registros no histórico.</p>
              ) : (
                <ul className="space-y-4">
                  {chamado.historico.map((item) => (
                    <li key={item.id} className="border-l-2 border-gray-200 pl-3">
                      <p className="text-sm font-medium text-gray-800">{labelHistorico(item)}</p>
                      <p className="text-xs text-gray-500">{formatarData(item.criado_em)}</p>
                      {item.usuario_nome && (
                        <p className="text-xs text-gray-500">por {item.usuario_nome}</p>
                      )}
                      {item.descricao && (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                          {item.descricao}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={modalFechar} onOpenChange={setModalFechar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir chamado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Descreva como o pedido foi resolvido. Este registro ficará no histórico do chamado.
          </p>
          <Textarea
            value={resolucao}
            onChange={(e) => setResolucao(e.target.value)}
            placeholder="Ex.: Cliente orientado sobre o procedimento e problema solucionado."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalFechar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarFechamento}
              disabled={salvando}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
            >
              {salvando ? "Salvando..." : "Confirmar resolução"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
