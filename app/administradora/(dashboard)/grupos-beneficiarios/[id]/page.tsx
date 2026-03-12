"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { FaturamentoService, type DadosFatura } from "@/services/faturamento-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, FileText, FileSearch, Search, ChevronLeft, ChevronRight, UserX, Loader2 } from "lucide-react"

export default function DetalhesGrupoPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const grupoId = params.id as string

  const [grupo, setGrupo] = useState<GrupoBeneficiarios | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [showModalGerarFatura, setShowModalGerarFatura] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null)
  const [dadosFatura, setDadosFatura] = useState({
    valor: "",
    vencimento: "",
    descricao: "",
  })
  const [gerandoFatura, setGerandoFatura] = useState(false)
  const [filtro, setFiltro] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<"titular" | "todos">("titular")
  const [filtroCorretora, setFiltroCorretora] = useState<string>("todas")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(25)
  const [confirmSolicitarCancelamentoOpen, setConfirmSolicitarCancelamentoOpen] = useState(false)
  const [itemParaSolicitarCancelamento, setItemParaSolicitarCancelamento] = useState<any>(null)
  const [motivoSolicitacaoCancelamento, setMotivoSolicitacaoCancelamento] = useState("")
  const [solicitandoCancelamento, setSolicitandoCancelamento] = useState(false)
  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([])
  const [modalCorretorOpen, setModalCorretorOpen] = useState(false)
  const [itemCorretor, setItemCorretor] = useState<any>(null)
  const [corretorSelecionadoId, setCorretorSelecionadoId] = useState<string>("__nenhum__")
  const [salvandoCorretor, setSalvandoCorretor] = useState(false)
  const [selecionadosSemCorretor, setSelecionadosSemCorretor] = useState<Set<string>>(new Set())
  const [modalCorretorLoteOpen, setModalCorretorLoteOpen] = useState(false)
  const [corretorLoteId, setCorretorLoteId] = useState<string>("")
  const [salvandoCorretorLote, setSalvandoCorretorLote] = useState(false)
  const [modoSelecaoCorretorLote, setModoSelecaoCorretorLote] = useState(false)

  function getTipoItem(item: any): "titular" | "dependente" {
    if (item.cliente_tipo === "vida_importada") {
      const t = (item.cliente?.tipo || item._vida?.tipo || "titular").toString().toLowerCase()
      return t === "dependente" ? "dependente" : "titular"
    }
    return "titular"
  }

  useEffect(() => {
    if (grupoId) {
      carregarGrupo()
      carregarClientes()
    }
  }, [grupoId])

  // Abrir modal na aba Financeiro quando vier da página "Gerar fatura" (query: aba=financeiro&cliente=xxx)
  useEffect(() => {
    const aba = searchParams.get("aba")
    const clienteId = searchParams.get("cliente")
    if (aba !== "financeiro" || !clienteId || clientes.length === 0) return
    const item = clientes.find((c: any) => {
      if (clienteId.startsWith("vida:")) {
        const vidaId = clienteId.replace(/^vida:/, "")
        return c.cliente_tipo === "vida_importada" && c.id === vidaId
      }
      if (c.cliente_tipo === "vida_importada" && c._vida?.cliente_administradora_id === clienteId) return true
      if (c.cliente_tipo === "cliente_administradora" && c.cliente_id === clienteId) return true
      if (c.cliente_tipo === "proposta") {
        const caId = c.cliente?.id
        return caId === clienteId
      }
      return false
    })
    if (item) {
      const destino = item.cliente_tipo === "vida_importada" ? `vida-${item.id}` : `vinculo-${item.id}`
      router.push(`/administradora/grupos-beneficiarios/${grupoId}/beneficiario/${destino}?aba=financeiro`)
    }
  }, [searchParams, clientes, grupoId])

  useEffect(() => {
    const adm = getAdministradoraLogada()
    if (!adm?.id) return
    fetch(`/api/administradora/corretores?administradora_id=${encodeURIComponent(adm.id)}`)
      .then((r) => r.json())
      .then((d) => setCorretores(Array.isArray(d) ? d.map((c: { id: string; nome: string }) => ({ id: c.id, nome: c.nome })) : []))
      .catch(() => setCorretores([]))
  }, [grupoId])

  async function carregarGrupo() {
    try {
      setLoading(true)
      const data = await GruposBeneficiariosService.buscarPorId(grupoId)
      setGrupo(data)
    } catch (error: any) {
      console.error("Erro ao carregar grupo:", error)
      toast.error("Erro ao carregar grupo")
    } finally {
      setLoading(false)
    }
  }

  async function carregarClientes() {
    try {
      setLoadingClientes(true)
      const { supabase } = await import("@/lib/supabase")
      
      // Buscar clientes vinculados ao grupo
      const { data, error } = await supabase
        .from("clientes_grupos")
        .select("*")
        .eq("grupo_id", grupoId)

      if (error) throw error

      const adm = getAdministradoraLogada()
      const qAdmin = adm?.id ? `&administradora_id=${encodeURIComponent(adm.id)}` : ""
      const res = await fetch(`/api/administradora/vidas-importadas?grupo_id=${encodeURIComponent(grupoId)}${qAdmin}&somente_ativos=1`)
      const vidas = (await res.json().catch(() => [])) || []
      const vidasArray = Array.isArray(vidas) ? vidas : []
      const vidaPorClienteAdmId = new Map<string, any>()
      for (const v of vidasArray) {
        const caId = String(v?.cliente_administradora_id || "").trim()
        if (!caId) continue
        const atual = vidaPorClienteAdmId.get(caId)
        // Prioriza titular para preenchimento de nome/cpf quando houver múltiplas vidas no mesmo cliente_administradora
        if (!atual || String(atual?.tipo || "").toLowerCase() === "dependente") {
          vidaPorClienteAdmId.set(caId, v)
        }
      }

      const vidasComoClientes = vidasArray.map((v: { corretor_id?: string | null }) => ({
        id: v.id,
        cliente_id: v.id,
        cliente_tipo: "vida_importada",
        cliente: {
          nome: v.nome,
          cpf: v.cpf,
          nome_mae: v.nome_mae,
          tipo: v.tipo,
          data_nascimento: v.data_nascimento,
          idade: v.idade,
          parentesco: v.parentesco,
          cpf_titular: v.cpf_titular,
          produto_id: v.produto_id,
          ativo: v.ativo !== false,
        },
        situacao: v.ativo !== false ? "Ativo" : "Inativo",
        _vida: { ...v, valor_mensal: v.valor_mensal },
      }))

      // Otimização: quando há vidas importadas, elas são a fonte oficial da tela.
      // Nesse cenário não precisamos montar os dados de clientes_grupos (query pesada em lote).
      if (vidasComoClientes.length > 0) {
        setClientes(vidasComoClientes)
        return
      }

      // Buscar dados completos dos clientes
      const clientesCompletos = await Promise.all(
        (data || []).map(async (vinculo) => {
          if (vinculo.cliente_tipo === "proposta") {
            const { data: proposta } = await supabase
              .from("propostas")
              .select("*")
              .eq("id", vinculo.cliente_id)
              .single()

            const ativo = ["aprovada", "assinada", "finalizada"].includes(String(proposta?.status || "").toLowerCase())
            return {
              ...vinculo,
              cliente: proposta,
              tipo: "Proposta",
              situacao: ativo ? "Ativo" : "Inativo",
            }
          } else {
            const { data: clienteAdm } = await supabase
              .from("clientes_administradoras")
              .select("*")
              .eq("id", vinculo.cliente_id)
              .single()

            const { data: vwCliente } = await supabase
              .from("vw_clientes_administradoras_completo")
              .select("cliente_nome, cliente_cpf, cliente_email")
              .eq("id", vinculo.cliente_id)
              .maybeSingle()

            let propostaVinculada: any = null
            if (clienteAdm?.proposta_id) {
              const { data: proposta } = await supabase
                .from("propostas")
                .select("*")
                .eq("id", clienteAdm.proposta_id)
                .maybeSingle()
              propostaVinculada = proposta || null
            }

            // Em muitos cenários nome/cpf estão na proposta, não em clientes_administradoras.
            // Mesclamos para garantir colunas completas na tabela do grupo.
            const clienteMesclado = {
              ...(propostaVinculada || {}),
              ...(clienteAdm || {}),
              ...(vwCliente || {}),
              nome: propostaVinculada?.nome || clienteAdm?.nome || clienteAdm?.razao_social || clienteAdm?.nome_fantasia || null,
              cpf: propostaVinculada?.cpf || clienteAdm?.cpf || null,
              email: propostaVinculada?.email || clienteAdm?.email || null,
            }

            if (!clienteMesclado.nome && vwCliente?.cliente_nome) {
              clienteMesclado.nome = vwCliente.cliente_nome
            }
            if (!clienteMesclado.cpf && vwCliente?.cliente_cpf) {
              clienteMesclado.cpf = String(vwCliente.cliente_cpf)
            }
            if (!clienteMesclado.email && vwCliente?.cliente_email) {
              clienteMesclado.email = String(vwCliente.cliente_email)
            }
            const vidaFallback = vidaPorClienteAdmId.get(String(vinculo.cliente_id || ""))
            if (!clienteMesclado.nome && vidaFallback?.nome) {
              clienteMesclado.nome = String(vidaFallback.nome)
            }
            if (!clienteMesclado.cpf && vidaFallback?.cpf) {
              clienteMesclado.cpf = String(vidaFallback.cpf)
            }
            if (!clienteMesclado.email) {
              const emailVida = Array.isArray(vidaFallback?.emails) ? vidaFallback?.emails?.[0] : null
              if (emailVida) clienteMesclado.email = String(emailVida)
            }

            const ativo = String(clienteAdm?.status || "").toLowerCase() === "ativo"
            return {
              ...vinculo,
              cliente: clienteMesclado,
              tipo: "Cliente",
              situacao: ativo ? "Ativo" : "Inativo",
            }
          }
        })
      )

      const clientesFiltrados = clientesCompletos.filter((c) => c.cliente)

      // Fonte única por grupo:
      // - Se houver vidas importadas, elas são a origem oficial dos beneficiários.
      // - Só usa clientes_grupos quando o grupo não tiver vidas importadas.
      const usaVidasImportadasComoFontePrincipal = vidasComoClientes.length > 0
      setClientes(usaVidasImportadasComoFontePrincipal ? vidasComoClientes : clientesFiltrados)
    } catch (error: any) {
      console.error("Erro ao carregar clientes:", error)
      toast.error("Erro ao carregar clientes")
    } finally {
      setLoadingClientes(false)
    }
  }

  function formatarCpf(cpf: string | null | undefined): string {
    if (!cpf) return "-"
    const d = String(cpf).replace(/\D/g, "")
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    return cpf
  }

  function normalizarCorretorId(valor: unknown): string | null {
    const raw = String(valor ?? "").trim()
    if (!raw) return null
    const lower = raw.toLowerCase()
    if (lower === "null" || lower === "undefined" || lower === "__nenhum__") return null
    return raw
  }

  function obterCorretorIdItem(item: any): string | null {
    if (!item) return null
    const idBruto = item.cliente_tipo === "vida_importada"
      ? ((item._vida as { corretor_id?: string | null })?.corretor_id ?? null)
      : ((item.cliente as { corretor_id?: string | null })?.corretor_id ?? null)
    return normalizarCorretorId(idBruto)
  }

  function itemTemCorretor(item: any): boolean {
    const corretorId = obterCorretorIdItem(item)
    if (!corretorId) return false
    return corretores.some((c) => c.id === corretorId)
  }

  function chaveSelecaoItem(item: any): string {
    return item.cliente_tipo === "vida_importada"
      ? `vida:${String(item.id)}`
      : `cliente:${String(item.cliente_id)}`
  }

  function obterNomeCorretor(corretorId: string | null | undefined): string {
    const id = normalizarCorretorId(corretorId)
    if (!id) return "—"
    const nome = corretores.find((c) => c.id === id)?.nome
    return nome || "Corretor não encontrado"
  }

  function abrirModalCorretor(item: any) {
    setItemCorretor(item)
    const corretorIdAtual = obterCorretorIdItem(item)
    setCorretorSelecionadoId(corretorIdAtual || "__nenhum__")
    setModalCorretorOpen(true)
  }

  async function atualizarCorretorDoItem(item: any, corretorIdFinal: string | null) {
    const adm = getAdministradoraLogada()
    if (!adm?.id || !item) throw new Error("Beneficiário inválido")

    let res: Response
    if (item.cliente_tipo === "vida_importada") {
      res = await fetch(`/api/administradora/vidas-importadas/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: adm.id,
          corretor_id: corretorIdFinal,
        }),
      })
    } else {
      res = await fetch(`/api/administradora/clientes/${item.cliente_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: adm.id,
          corretor_id: corretorIdFinal,
        }),
      })
    }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || "Erro ao atualizar corretor")
  }

  async function salvarCorretorDoBeneficiario() {
    if (!itemCorretor) return

    const corretorIdFinal = normalizarCorretorId(corretorSelecionadoId)
    const corretorIdAnterior = obterCorretorIdItem(itemCorretor)

    if ((corretorIdAnterior || null) === (corretorIdFinal || null)) {
      setModalCorretorOpen(false)
      setItemCorretor(null)
      return
    }

    try {
      setSalvandoCorretor(true)
      await atualizarCorretorDoItem(itemCorretor, corretorIdFinal)
      await carregarClientes()
      toast.success(corretorIdFinal ? "Corretor atualizado com sucesso." : "Vínculo de corretor removido.")
      setModalCorretorOpen(false)
      setItemCorretor(null)
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar corretor")
    } finally {
      setSalvandoCorretor(false)
    }
  }

  function toggleSelecaoSemCorretor(item: any) {
    if (itemTemCorretor(item)) return
    const key = chaveSelecaoItem(item)
    setSelecionadosSemCorretor((prev) => {
      const prox = new Set(prev)
      if (prox.has(key)) prox.delete(key)
      else prox.add(key)
      return prox
    })
  }

  function limparSelecaoSemCorretor() {
    setSelecionadosSemCorretor(new Set())
  }

  function selecionarTodosBeneficiariosDoGrupo() {
    const ids = clientes
      .filter((item) => !itemTemCorretor(item))
      .map((item) => chaveSelecaoItem(item))
    setSelecionadosSemCorretor(new Set(ids))
  }

  function alternarModoSelecaoCorretorLote() {
    setModoSelecaoCorretorLote((prev) => {
      const proximo = !prev
      if (!proximo) {
        setSelecionadosSemCorretor(new Set())
      }
      return proximo
    })
  }

  async function vincularCorretorEmLote() {
    const corretorIdFinal = normalizarCorretorId(corretorLoteId)
    if (!corretorIdFinal) {
      toast.error("Selecione um corretor")
      return
    }
    const itensSelecionados = clientes.filter((item) => {
      const key = chaveSelecaoItem(item)
      return selecionadosSemCorretor.has(key) && !itemTemCorretor(item)
    })
    if (itensSelecionados.length === 0) {
      toast.error("Selecione ao menos um beneficiário sem corretor")
      return
    }

    try {
      setSalvandoCorretorLote(true)
      const resultados = await Promise.allSettled(
        itensSelecionados.map((item) => atualizarCorretorDoItem(item, corretorIdFinal))
      )
      const sucesso = resultados.filter((r) => r.status === "fulfilled").length
      const erro = resultados.length - sucesso
      await carregarClientes()
      setSelecionadosSemCorretor(new Set())
      setModalCorretorLoteOpen(false)
      setCorretorLoteId("")
      if (erro === 0) {
        toast.success(`${sucesso} beneficiário(s) vinculado(s) ao corretor.`)
      } else {
        toast.warning(`${sucesso} vinculado(s) e ${erro} com erro.`)
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao vincular corretor em lote")
    } finally {
      setSalvandoCorretorLote(false)
    }
  }

  async function handleGerarFatura(cliente: any) {
    setClienteSelecionado(cliente)
    setDadosFatura({
      valor: "",
      vencimento: "",
      descricao: `Fatura - ${cliente.cliente.nome || cliente.cliente.nome}`,
    })
    setShowModalGerarFatura(true)
  }

  async function handleConfirmarGerarFatura() {
    if (!dadosFatura.valor || !dadosFatura.vencimento || !clienteSelecionado) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    try {
      setGerandoFatura(true)

      const dados: DadosFatura = {
        cliente_id: clienteSelecionado.cliente_id,
        cliente_tipo: clienteSelecionado.cliente_tipo,
        valor: parseFloat(dadosFatura.valor),
        vencimento: dadosFatura.vencimento,
        descricao: dadosFatura.descricao,
        grupo_id: grupoId,
      }

      const resultado = await FaturamentoService.gerarFatura(dados)

      if (resultado.sucesso) {
        toast.success("Fatura gerada com sucesso!")
        setShowModalGerarFatura(false)
        setDadosFatura({ valor: "", vencimento: "", descricao: "" })
        setClienteSelecionado(null)
      } else {
        toast.error(resultado.erro || "Erro ao gerar fatura")
      }
    } catch (error: any) {
      console.error("Erro ao gerar fatura:", error)
      toast.error("Erro ao gerar fatura: " + error.message)
    } finally {
      setGerandoFatura(false)
    }
  }

  function abrirConfirmSolicitarCancelamento(item: any) {
    setItemParaSolicitarCancelamento(item)
    setMotivoSolicitacaoCancelamento("")
    setConfirmSolicitarCancelamentoOpen(true)
  }

  async function handleSolicitarCancelamento(item: any) {
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      toast.error("Administradora não identificada.")
      return
    }
    if (item?.cliente_tipo !== "vida_importada") {
      toast.error("Solicitação de cancelamento está disponível apenas para vidas importadas.")
      return
    }
    try {
      setSolicitandoCancelamento(true)
      const res = await fetch("/api/administradora/beneficiarios/cancelamentos/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administradora_id: adm.id,
          grupo_id: grupoId,
          beneficiario_id: item.id,
          motivo_solicitacao: motivoSolicitacaoCancelamento || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao solicitar cancelamento")

      const idsAfetados = new Set(
        Array.isArray(data?.beneficiarios_afetados)
          ? data.beneficiarios_afetados.map((b: { id?: string }) => String(b?.id || "")).filter(Boolean)
          : []
      )
      if (idsAfetados.size > 0) {
        setClientes((prev) => prev.filter((c) => !idsAfetados.has(String(c.id))))
      } else {
        await carregarClientes()
      }

      toast.success("Cancelamento solicitado com sucesso.")
      setConfirmSolicitarCancelamentoOpen(false)
      setItemParaSolicitarCancelamento(null)
      setMotivoSolicitacaoCancelamento("")
    } catch (e: any) {
      toast.error(e?.message || "Erro ao solicitar cancelamento")
    } finally {
      setSolicitandoCancelamento(false)
    }
  }

  const clientesFiltrados = clientes.filter((item) => {
    if (filtroTipo === "titular" && getTipoItem(item) !== "titular") return false
    if (filtroCorretora !== "todas") {
      const corretorId = obterCorretorIdItem(item)
      if ((corretorId || "") !== filtroCorretora) return false
    }
    if (!filtro.trim()) return true
    const termoNome = filtro.toLowerCase().trim()
    const termoDigitos = termoNome.replace(/\D/g, "")
    const nome = (item.cliente?.nome || "").toLowerCase()
    const cpfCnpj = (formatarCpf(item.cliente?.cpf || item.cliente?.cnpj) || "").replace(/\D/g, "")
    const matchNome = termoNome.length > 0 && nome.includes(termoNome)
    const matchCpf = termoDigitos.length > 0 && cpfCnpj.includes(termoDigitos)
    return matchNome || matchCpf
  })

  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / itensPorPagina))
  const paginaAtualAjustada = Math.min(paginaAtual, totalPaginas)
  const clientesPaginados = clientesFiltrados.slice(
    (paginaAtualAjustada - 1) * itensPorPagina,
    paginaAtualAjustada * itensPorPagina
  )
  const inicio = (paginaAtualAjustada - 1) * itensPorPagina + 1
  const fim = Math.min(paginaAtualAjustada * itensPorPagina, clientesFiltrados.length)
  const totalSelecionadosSemCorretor = clientes.filter((item) => {
    const key = chaveSelecaoItem(item)
    return selecionadosSemCorretor.has(key) && !itemTemCorretor(item)
  }).length

  useEffect(() => {
    setPaginaAtual(1)
  }, [filtro, filtroTipo, filtroCorretora])

  useEffect(() => {
    setSelecionadosSemCorretor((prev) => {
      if (prev.size === 0) return prev
      const validos = new Set(
        clientes
          .filter((item) => !itemTemCorretor(item))
          .map((item) => chaveSelecaoItem(item))
      )
      const prox = new Set<string>()
      prev.forEach((id) => {
        if (validos.has(id)) prox.add(id)
      })
      return prox
    })
  }, [clientes])

  const titularesDoGrupo = useMemo(() => {
    return clientes
      .filter((c: any) => c.cliente_tipo === "vida_importada" && getTipoItem(c) === "titular")
      .map((c: any) => {
        const cpfDigitos = (c.cliente?.cpf || "").toString().replace(/\D/g, "")
        return { cpf: cpfDigitos, nome: (c.cliente?.nome || "-").trim(), id: c.id }
      })
      .filter((t: any) => t.cpf.length >= 11)
  }, [clientes])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  if (!grupo) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Grupo não encontrado</p>
        <Button onClick={() => router.push("/administradora/grupos-beneficiarios")} className="mt-4">
          Voltar
        </Button>
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
              {grupo.nome}
            </h1>
            {grupo.descricao && (
              <p className="text-gray-600 mt-1 font-medium">{grupo.descricao}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-xs text-gray-600 whitespace-nowrap">Corretora:</Label>
              <Select value={filtroCorretora} onValueChange={setFiltroCorretora}>
                <SelectTrigger className="h-10 w-[200px] rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                  <SelectValue placeholder="Todas as corretoras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as corretoras</SelectItem>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10 h-10 border-2 border-gray-300 focus:border-[#0F172A] rounded-lg"
              />
            </div>
            <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as "titular" | "todos")}>
              <SelectTrigger className="h-10 w-[140px] rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="titular">Titular</SelectItem>
                <SelectItem value="todos">Titular e Dependentes</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => router.push("/administradora/grupos-beneficiarios")}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-4 py-2 h-10 shadow-lg rounded"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>

      {/* Informações do Grupo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 bg-white shadow-sm rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total de Beneficiários
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-slate-800 tracking-tight">{clientes.length}</div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total de Titulares
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-slate-800 tracking-tight">{clientes.filter((c) => getTipoItem(c) === "titular").length}</div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total de Dependentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-slate-800 tracking-tight">{clientes.filter((c) => getTipoItem(c) === "dependente").length}</div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border ${
                grupo.ativo
                  ? "bg-slate-100 text-slate-800 border-slate-300"
                  : "bg-gray-100 text-gray-600 border-gray-300"
              }`}
            >
              {grupo.ativo ? "Ativo" : "Inativo"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes - mesmo design da tabela de grupos */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            Selecionados sem corretor: <span className="font-semibold text-gray-900">{totalSelecionadosSemCorretor}</span>
            {loadingClientes && <span className="ml-2 text-xs text-gray-500 animate-pulse">Carregando beneficiários...</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={alternarModoSelecaoCorretorLote}>
              {modoSelecaoCorretorLote ? "Fechar seleção" : "Selecionar beneficiários"}
            </Button>
            {modoSelecaoCorretorLote && (
              <>
                <Button variant="outline" size="sm" onClick={selecionarTodosBeneficiariosDoGrupo}>
                  Selecionar todos
                </Button>
                <Button variant="outline" size="sm" onClick={limparSelecaoSemCorretor}>
                  Limpar seleção
                </Button>
                <Button
                  size="sm"
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                  disabled={totalSelecionadosSemCorretor === 0}
                  onClick={() => setModalCorretorLoteOpen(true)}
                >
                  Vincular corretor em lote
                </Button>
              </>
            )}
          </div>
        </div>
        {loadingClientes ? (
          <div className="px-4 py-8 text-sm text-gray-500 animate-pulse">Carregando informações dos beneficiários...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filtro.trim() || filtroTipo !== "titular" || filtroCorretora !== "todas"
              ? "Nenhum cliente encontrado com os filtros aplicados"
              : "Nenhum cliente vinculado a este grupo"}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  {modoSelecaoCorretorLote && <TableHead className="font-bold w-[50px]">Sel.</TableHead>}
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold">CPF/CNPJ</TableHead>
                  <TableHead className="font-bold">Tipo</TableHead>
                  <TableHead className="font-bold">Situação</TableHead>
                  <TableHead className="font-bold">Corretor(a)</TableHead>
                  <TableHead className="font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesPaginados.map((item) => {
                  const ehDependenteSemTitular =
                    item.cliente_tipo === "vida_importada" &&
                    getTipoItem(item) === "dependente" &&
                    (() => {
                      const cpfTit = String((item._vida?.cpf_titular ?? item.cliente?.cpf_titular ?? "")).replace(/\D/g, "")
                      return !cpfTit || cpfTit.length < 11 || !titularesDoGrupo.some((t: any) => t.cpf === cpfTit)
                    })()
                  return (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    {modoSelecaoCorretorLote && (
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#0F172A] cursor-pointer disabled:cursor-not-allowed"
                          disabled={itemTemCorretor(item)}
                          checked={selecionadosSemCorretor.has(chaveSelecaoItem(item))}
                          onChange={() => toggleSelecaoSemCorretor(item)}
                          title={itemTemCorretor(item) ? "Beneficiário já possui corretor vinculado" : "Selecionar para vincular corretor"}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div>
                        {item.cliente?.nome || "-"}
                        {ehDependenteSemTitular && (
                          <p className="text-xs text-amber-600 mt-0.5 font-normal">Vincular titular</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatarCpf(item.cliente?.cpf || item.cliente?.cnpj) || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border ${
                          getTipoItem(item) === "titular"
                            ? "bg-slate-100 text-slate-800 border-slate-300"
                            : "bg-gray-100 text-gray-600 border-gray-300"
                        }`}
                      >
                        {getTipoItem(item) === "titular" ? "Titular" : "Dependente"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-sm border ${
                          item.situacao === "Ativo"
                            ? "bg-slate-100 text-slate-800 border-slate-300"
                            : "bg-gray-100 text-gray-600 border-gray-300"
                        }`}
                      >
                        {item.situacao || "Ativo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {obterNomeCorretor(obterCorretorIdItem(item))}
                    </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.cliente_tipo !== "vida_importada" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGerarFatura(item)}
                          className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 rounded-md"
                          title="Gerar Fatura"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const destino = item.cliente_tipo === "vida_importada" ? `vida-${item.id}` : `vinculo-${item.id}`
                            router.push(`/administradora/grupos-beneficiarios/${grupoId}/beneficiario/${destino}`)
                          }}
                          className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 rounded-md"
                          title="Visualizar"
                        >
                          <FileSearch className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirConfirmSolicitarCancelamento(item)}
                          className="h-8 w-8 p-0 border-slate-200 text-amber-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 rounded-md"
                          title="Solicitar cancelamento"
                          disabled={item.cliente_tipo !== "vida_importada"}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
                  )
                })}
            </TableBody>
          </Table>
          {(totalPaginas > 1 || clientesFiltrados.length > 0) && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50/50">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-gray-600">
                  Mostrando {inicio} a {fim} de {clientesFiltrados.length}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Itens por página:</span>
                  <Select
                    value={String(itensPorPagina)}
                    onValueChange={(v) => {
                      setItensPorPagina(Number(v))
                      setPaginaAtual(1)
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaAtualAjustada <= 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-sm text-gray-600 min-w-[80px] text-center">
                  Página {paginaAtualAjustada} de {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtualAjustada >= totalPaginas}
                  className="h-8"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      <Dialog
        open={confirmSolicitarCancelamentoOpen}
        onOpenChange={(open) => {
          setConfirmSolicitarCancelamentoOpen(open)
          if (!open) {
            setItemParaSolicitarCancelamento(null)
            setMotivoSolicitacaoCancelamento("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar cancelamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Beneficiário:{" "}
              <span className="font-medium text-gray-900">
                {itemParaSolicitarCancelamento?.cliente?.nome || "—"}
              </span>
            </p>
            <p className="text-xs text-amber-700">
              Se for titular, os dependentes vinculados também serão desativados imediatamente.
            </p>
            <div>
              <Label className="text-sm">Motivo da solicitação (opcional)</Label>
              <Input
                value={motivoSolicitacaoCancelamento}
                onChange={(e) => setMotivoSolicitacaoCancelamento(e.target.value)}
                placeholder="Ex: solicitado pelo cliente em 01/03"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSolicitarCancelamentoOpen(false)} disabled={solicitandoCancelamento}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                itemParaSolicitarCancelamento && handleSolicitarCancelamento(itemParaSolicitarCancelamento)
              }
              disabled={solicitandoCancelamento}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {solicitandoCancelamento ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Solicitando...
                </>
              ) : (
                "Confirmar solicitação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCorretorOpen} onOpenChange={setModalCorretorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {obterCorretorIdItem(itemCorretor) ? "Trocar corretor do beneficiario" : "Vincular corretor ao beneficiario"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Beneficiario: <span className="font-medium text-gray-900">{itemCorretor?.cliente?.nome || "—"}</span>
            </p>
            <div>
              <Label className="text-sm">Corretor(a)</Label>
              <Select value={corretorSelecionadoId} onValueChange={setCorretorSelecionadoId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione o corretor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__nenhum__">Sem corretor</SelectItem>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCorretorOpen(false)} disabled={salvandoCorretor}>
              Cancelar
            </Button>
            <Button onClick={salvarCorretorDoBeneficiario} disabled={salvandoCorretor}>
              {salvandoCorretor ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCorretorLoteOpen} onOpenChange={setModalCorretorLoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular corretor em lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Beneficiários selecionados (sem corretor):{" "}
              <span className="font-medium text-gray-900">{totalSelecionadosSemCorretor}</span>
            </p>
            <div>
              <Label className="text-sm">Corretor(a)</Label>
              <Select value={corretorLoteId} onValueChange={setCorretorLoteId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione o corretor" />
                </SelectTrigger>
                <SelectContent>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCorretorLoteOpen(false)} disabled={salvandoCorretorLote}>
              Cancelar
            </Button>
            <Button onClick={vincularCorretorEmLote} disabled={salvandoCorretorLote || !corretorLoteId}>
              {salvandoCorretorLote ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Vincular"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gerar Fatura */}
      {showModalGerarFatura && clienteSelecionado && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Gerar Fatura - {clienteSelecionado.cliente?.nome}
            </h3>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-bold text-gray-700 mb-2 block">
                  Valor <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dadosFatura.valor}
                  onChange={(e) => setDadosFatura({ ...dadosFatura, valor: e.target.value })}
                  placeholder="0.00"
                  className="h-12 border-2 border-gray-300 focus:border-[#0F172A] rounded-lg"
                />
              </div>

              <div>
                <Label className="text-sm font-bold text-gray-700 mb-2 block">
                  Data de Vencimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dadosFatura.vencimento}
                  onChange={(e) => setDadosFatura({ ...dadosFatura, vencimento: e.target.value })}
                  className="h-12 border-2 border-gray-300 focus:border-[#0F172A] rounded-lg"
                />
              </div>

              <div>
                <Label className="text-sm font-bold text-gray-700 mb-2 block">
                  Descrição
                </Label>
                <Input
                  value={dadosFatura.descricao}
                  onChange={(e) => setDadosFatura({ ...dadosFatura, descricao: e.target.value })}
                  placeholder="Descrição da fatura"
                  className="h-12 border-2 border-gray-300 focus:border-[#0F172A] rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModalGerarFatura(false)
                  setClienteSelecionado(null)
                }}
                className="h-12"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarGerarFatura}
                disabled={gerandoFatura || !dadosFatura.valor || !dadosFatura.vencimento}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white h-12"
              >
                {gerandoFatura ? "Gerando..." : "Gerar Fatura"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

