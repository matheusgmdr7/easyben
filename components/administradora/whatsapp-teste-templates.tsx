"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Send, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatarTelefone } from "@/utils/formatters"
import { normalizarTelefoneWhatsApp } from "@/lib/whatsapp-cobranca"

type TemplateItem = {
  event_type: string
  label: string
  descricao: string | null
  content_sid: string | null
  ativo: boolean
  pronto: boolean
}

type ClienteItem = {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  plano_nome: string | null
  cobertura: string | null
}

type PreviewDados = {
  cliente_nome: string
  financeira_nome: string
  plano_descricao: string
  cobertura: string
  valor_fatura: string | null
  data_vencimento: string | null
  link_boleto: string | null
  url_portal_cliente: string | null
  telefone_cadastro: string | null
}

type Props = {
  administradoraId: string
}

const btnSquare = "rounded-sm"
const FICTICIO = "__ficticio__"

function formatarCpf(cpf: string | null) {
  const d = String(cpf || "").replace(/\D/g, "")
  if (d.length !== 11) return cpf || ""
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

export function WhatsAppTesteTemplates({ administradoraId }: Props) {
  const [telefone, setTelefone] = useState("")
  const [clienteId, setClienteId] = useState(FICTICIO)
  const [buscaCliente, setBuscaCliente] = useState("")
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [clientes, setClientes] = useState<ClienteItem[]>([])
  const [preview, setPreview] = useState<PreviewDados | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [carregandoPreview, setCarregandoPreview] = useState(false)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [enviandoTodos, setEnviandoTodos] = useState(false)

  const carregarBase = useCallback(async () => {
    setCarregando(true)
    try {
      const qs = new URLSearchParams({ administradora_id: administradoraId })
      const res = await fetch(`/api/administradora/whatsapp/test-templates?${qs}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar dados")
      setTemplates(Array.isArray(data.templates) ? data.templates : [])
      setClientes(Array.isArray(data.clientes) ? data.clientes : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar modelos")
    } finally {
      setCarregando(false)
    }
  }, [administradoraId])

  const carregarPreview = useCallback(
    async (id: string) => {
      if (id === FICTICIO) {
        setPreview(null)
        return
      }
      setCarregandoPreview(true)
      try {
        const qs = new URLSearchParams({
          administradora_id: administradoraId,
          cliente_administradora_id: id,
        })
        const res = await fetch(`/api/administradora/whatsapp/test-templates?${qs}`, {
          cache: "no-store",
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Erro ao carregar prévia")
        setPreview(data.preview || null)
      } catch (e) {
        setPreview(null)
        toast.error(e instanceof Error ? e.message : "Erro ao carregar dados do cliente")
      } finally {
        setCarregandoPreview(false)
      }
    },
    [administradoraId]
  )

  useEffect(() => {
    void carregarBase()
  }, [carregarBase])

  useEffect(() => {
    void carregarPreview(clienteId)
  }, [clienteId, carregarPreview])

  const clientesFiltrados = useMemo(() => {
    const q = buscaCliente.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter((c) => {
      const cpf = String(c.cpf || "").replace(/\D/g, "")
      return (
        c.nome.toLowerCase().includes(q) ||
        cpf.includes(q.replace(/\D/g, "")) ||
        String(c.plano_nome || "").toLowerCase().includes(q)
      )
    })
  }, [clientes, buscaCliente])

  const clienteSelecionado = clientes.find((c) => c.id === clienteId)
  const telefoneOk = Boolean(normalizarTelefoneWhatsApp(telefone))
  const prontos = templates.filter((t) => t.pronto)
  const usandoClienteReal = clienteId !== FICTICIO

  function payloadBase() {
    return {
      administradora_id: administradoraId,
      telefone,
      ...(usandoClienteReal ? { cliente_administradora_id: clienteId } : {}),
    }
  }

  function usarTelefoneCadastro() {
    const tel = preview?.telefone_cadastro || clienteSelecionado?.telefone
    if (!tel) {
      toast.error("Cliente sem telefone no cadastro")
      return
    }
    setTelefone(formatarTelefone(tel) || tel)
  }

  async function enviarUm(eventType: string) {
    if (!telefoneOk) {
      toast.error("Informe um telefone de destino válido com DDD")
      return
    }
    setEnviandoId(eventType)
    try {
      const res = await fetch("/api/administradora/whatsapp/test-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payloadBase(), event_type: eventType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao enfileirar")
      toast.success(data.message || "Modelo enfileirado para envio")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar teste")
    } finally {
      setEnviandoId(null)
    }
  }

  async function enviarTodos() {
    if (!telefoneOk) {
      toast.error("Informe um telefone de destino válido com DDD")
      return
    }
    if (prontos.length === 0) {
      toast.error("Nenhum modelo pronto para envio")
      return
    }
    setEnviandoTodos(true)
    try {
      const res = await fetch("/api/administradora/whatsapp/test-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payloadBase(), enviar_todos: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao enfileirar")
      toast.success(data.message || `${data.enfileirados} modelo(s) enfileirado(s)`)
      if (Array.isArray(data.falhas) && data.falhas.length > 0) {
        toast.warning(`${data.falhas.length} modelo(s) não enfileirado(s)`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar todos")
    } finally {
      setEnviandoTodos(false)
    }
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80">
        <h2 className="text-base font-semibold text-slate-800">Testar modelos de mensagem</h2>
        <p className="text-xs text-slate-600 mt-1">
          Selecione um cliente real para preencher as variáveis do template com dados do cadastro e da
          última fatura. A mensagem é enviada para o telefone de destino que você informar abaixo.
        </p>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cliente (dados da mensagem)</Label>
            <Input
              placeholder="Buscar por nome, CPF ou plano…"
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              className={cn(btnSquare, "h-9 mb-2")}
            />
            <Select
              value={clienteId}
              onValueChange={(v) => {
                setClienteId(v)
                if (v !== FICTICIO) {
                  const c = clientes.find((x) => x.id === v)
                  if (c?.telefone && !telefone) {
                    setTelefone(formatarTelefone(c.telefone) || c.telefone)
                  }
                }
              }}
            >
              <SelectTrigger className={cn(btnSquare, "h-10 w-full")}>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={FICTICIO}>Dados fictícios (exemplo)</SelectItem>
                {clientesFiltrados.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                    {c.cpf ? ` — ${formatarCpf(c.cpf)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500">
              {clientes.length} cliente(s) ativo(s) no cadastro
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-teste-telefone">Telefone de destino (recebe o teste)</Label>
            <Input
              id="whatsapp-teste-telefone"
              placeholder="(21) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value) || e.target.value)}
              className={cn(btnSquare, "h-10")}
            />
            <div className="flex flex-wrap gap-2">
              {usandoClienteReal && (preview?.telefone_cadastro || clienteSelecionado?.telefone) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(btnSquare, "h-8 text-xs")}
                  onClick={usarTelefoneCadastro}
                >
                  Usar telefone do cadastro
                </Button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Pode ser o seu WhatsApp ou o do cliente — o teste não altera o cadastro.
            </p>
          </div>
        </div>

        {usandoClienteReal && (
          <div className="rounded-sm border border-slate-200 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <UserRound className="h-4 w-4" />
              Prévia dos dados que irão no template
            </div>
            {carregandoPreview ? (
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Carregando…
              </p>
            ) : preview ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div>
                  <dt className="text-slate-500">Cliente</dt>
                  <dd className="text-slate-800 font-medium">{preview.cliente_nome}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Financeira</dt>
                  <dd className="text-slate-800">{preview.financeira_nome}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Plano</dt>
                  <dd className="text-slate-800">{preview.plano_descricao}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Cobertura</dt>
                  <dd className="text-slate-800">{preview.cobertura}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Valor fatura</dt>
                  <dd className="text-slate-800">{preview.valor_fatura || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Vencimento</dt>
                  <dd className="text-slate-800">{preview.data_vencimento || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Link boleto</dt>
                  <dd className="text-slate-800 truncate">{preview.link_boleto || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Portal do cliente</dt>
                  <dd className="text-slate-800 truncate">{preview.url_portal_cliente || "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-amber-700">Não foi possível montar a prévia deste cliente.</p>
            )}
          </div>
        )}

        {!usandoClienteReal && (
          <Alert className="border-amber-200 bg-amber-50/80">
            <AlertDescription className="text-xs text-amber-900">
              Modo fictício: usa valores de exemplo. Selecione um cliente real para testar com dados
              do cadastro e da última fatura.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className={cn(btnSquare, "bg-[#0F172A] hover:bg-[#1E293B] text-white")}
            disabled={!telefoneOk || enviandoTodos || prontos.length === 0}
            onClick={() => void enviarTodos()}
          >
            {enviandoTodos ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando todos…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar todos ({prontos.length})
              </>
            )}
          </Button>
        </div>

        {carregando ? (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando modelos…
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-sm">
            {templates.map((t) => (
              <li
                key={t.event_type}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{t.label}</p>
                  {t.descricao && <p className="text-xs text-slate-500 truncate">{t.descricao}</p>}
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t.event_type}</p>
                  {!t.pronto && (
                    <p className="text-xs text-amber-700 mt-1">
                      {!t.ativo ? "Template inativo" : "Content SID não configurado"}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(btnSquare, "shrink-0")}
                  disabled={!t.pronto || !telefoneOk || enviandoId === t.event_type || enviandoTodos}
                  onClick={() => void enviarUm(t.event_type)}
                >
                  {enviandoId === t.event_type ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    "Enviar teste"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
