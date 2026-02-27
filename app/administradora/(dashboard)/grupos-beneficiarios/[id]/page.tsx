"use client"

import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { FaturamentoService, type DadosFatura } from "@/services/faturamento-service"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ModalConfirmacaoExclusao } from "@/components/administradora/modal-confirmacao-exclusao"
import { ArrowLeft, FileText, FileSearch, Pencil, AlertTriangle, RefreshCw, UserMinus, Search, ChevronLeft, ChevronRight, ExternalLink, Download } from "lucide-react"
import { formatarMoeda, formatarData } from "@/utils/formatters"

export default function DetalhesGrupoPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const grupoId = params.id as string
  const [tabModalAtiva, setTabModalAtiva] = useState("dados-basicos")

  const [grupo, setGrupo] = useState<GrupoBeneficiarios | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<any[]>([])
  const [showModalGerarFatura, setShowModalGerarFatura] = useState(false)
  const [showModalVisualizar, setShowModalVisualizar] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null)
  const [produtoCliente, setProdutoCliente] = useState<any>(null)
  const [editandoVida, setEditandoVida] = useState(false)
  const [formVida, setFormVida] = useState<Record<string, unknown>>({})
  const [salvandoVida, setSalvandoVida] = useState(false)
  const [produtosOpcoes, setProdutosOpcoes] = useState<{ id: string; nome: string }[]>([])
  const [dependentesModal, setDependentesModal] = useState<any[]>([])
  const [faturasModal, setFaturasModal] = useState<any[]>([])
  const [contratoModal, setContratoModal] = useState<any>(null)
  const [propostaCompleta, setPropostaCompleta] = useState<any>(null)
  const [historicoModal, setHistoricoModal] = useState<any[]>([])
  const [valorProdutoCliente, setValorProdutoCliente] = useState<number | null>(null)
  const [valorMensalSalvo, setValorMensalSalvo] = useState<number | null>(null)
  const [atualizandoValor, setAtualizandoValor] = useState(false)
  const [dadosFatura, setDadosFatura] = useState({
    valor: "",
    vencimento: "",
    descricao: "",
  })
  const [gerandoFatura, setGerandoFatura] = useState(false)
  const [filtro, setFiltro] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<"" | "titular" | "dependente">("")
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(25)
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false)
  const [itemParaExcluir, setItemParaExcluir] = useState<any>(null)
  const [excluindoBeneficiario, setExcluindoBeneficiario] = useState(false)
  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([])
  const [corretorGrupo, setCorretorGrupo] = useState<string>("")
  const [atualizandoCorretorGrupo, setAtualizandoCorretorGrupo] = useState(false)

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
      handleVisualizar(item, "financeiro")
      setTimeout(() => router.replace(`/administradora/grupos-beneficiarios/${grupoId}`, { scroll: false }), 0)
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
      const { supabase } = await import("@/lib/supabase")
      
      // Buscar clientes vinculados ao grupo
      const { data, error } = await supabase
        .from("clientes_grupos")
        .select("*")
        .eq("grupo_id", grupoId)

      if (error) throw error

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
            const { data: cliente } = await supabase
              .from("clientes_administradoras")
              .select("*")
              .eq("id", vinculo.cliente_id)
              .single()

            const ativo = String(cliente?.status || "").toLowerCase() === "ativo"
            return {
              ...vinculo,
              cliente: cliente,
              tipo: "Cliente",
              situacao: ativo ? "Ativo" : "Inativo",
            }
          }
        })
      )

      const clientesFiltrados = clientesCompletos.filter((c) => c.cliente)

      const res = await fetch(`/api/administradora/vidas-importadas?grupo_id=${encodeURIComponent(grupoId)}`)
      const vidas = (await res.json().catch(() => [])) || []
      const vidasComoClientes = (Array.isArray(vidas) ? vidas : []).map((v: { corretor_id?: string | null }) => ({
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

      setClientes([...clientesFiltrados, ...vidasComoClientes])
      const primeiroCorretor = (Array.isArray(vidas) ? vidas : []).find((v: { corretor_id?: string | null }) => v.corretor_id)?.corretor_id
      setCorretorGrupo(primeiroCorretor ?? "")
    } catch (error: any) {
      console.error("Erro ao carregar clientes:", error)
      toast.error("Erro ao carregar clientes")
    }
  }

  function formatarCpf(cpf: string | null | undefined): string {
    if (!cpf) return "-"
    const d = String(cpf).replace(/\D/g, "")
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    return cpf
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

  async function handleVisualizar(item: any, abaInicial?: string) {
    setClienteSelecionado(item)
    setTabModalAtiva(abaInicial || "dados-basicos")
    setEditandoVida(false)
    setShowModalVisualizar(true)
    setProdutoCliente(null)
    setDependentesModal([])
    setFaturasModal([])
    setContratoModal(null)
    setPropostaCompleta(null)
    setHistoricoModal([])
    setValorProdutoCliente(null)
    setValorMensalSalvo(null)

    const adm = getAdministradoraLogada()

    function idadeDeDataNascimento(d: string | null | undefined): number | null {
      if (!d) return null
      const partes = String(d).slice(0, 10).split("-")
      if (partes.length !== 3) return null
      const ano = parseInt(partes[0], 10)
      const mes = parseInt(partes[1], 10)
      const dia = parseInt(partes[2], 10)
      if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null
      const hoje = new Date()
      let idade = hoje.getFullYear() - ano
      if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade--
      return idade >= 0 && idade <= 120 ? idade : null
    }
    if (adm?.id) {
      const r = await fetch(`/api/administradora/produtos-contrato?administradora_id=${adm.id}`)
      const prods = await r.json().catch(() => [])
      setProdutosOpcoes(Array.isArray(prods) ? prods : [])
    }

    const { supabase } = await import("@/lib/supabase")

    if (item.cliente_tipo === "vida_importada") {
      const v = item._vida || item.cliente
      const tels = Array.isArray(v?.telefones) ? v.telefones : []
      const emls = Array.isArray(v?.emails) ? v.emails : []
      setFormVida({
        nome: v?.nome ?? "",
        cpf: v?.cpf ?? "",
        nome_mae: v?.nome_mae ?? "",
        nome_pai: v?.nome_pai ?? "",
        tipo: v?.tipo ?? "titular",
        data_nascimento: v?.data_nascimento ? String(v.data_nascimento).slice(0, 10) : "",
        idade: v?.idade ?? "",
        parentesco: v?.parentesco ?? "",
        cpf_titular: v?.cpf_titular ?? "",
        produto_id: v?.produto_id ?? "",
        acomodacao: (v as any)?.acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria",
        ativo: v?.ativo !== false,
        sexo: v?.sexo ?? "",
        estado_civil: v?.estado_civil ?? "",
        identidade: v?.identidade ?? "",
        cns: v?.cns ?? "",
        observacoes: v?.observacoes ?? "",
        cep: v?.cep ?? "",
        cidade: v?.cidade ?? "",
        estado: v?.estado ?? "",
        bairro: v?.bairro ?? "",
        logradouro: v?.logradouro ?? "",
        numero: v?.numero ?? "",
        complemento: v?.complemento ?? "",
        telefones: tels,
        emails: emls,
      })
      const vValorSalvo = item._vida?.valor_mensal
      setValorMensalSalvo(vValorSalvo != null ? Number(vValorSalvo) : null)
      const pid = item.cliente?.produto_id || item._vida?.produto_id
      if (pid) {
        const r = await fetch(`/api/administradora/produto/${pid}`)
        const p = await r.json().catch(() => null)
        if (p && !p.error) setProdutoCliente(p)
        const idade = typeof v?.idade === "number" ? v.idade : (v?.idade != null && v?.idade !== "" ? parseInt(String(v.idade), 10) : null) ?? idadeDeDataNascimento(v?.data_nascimento)
        if (pid && idade != null && !isNaN(idade)) {
          const acom = (v as any)?.acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria"
          const rVal = await fetch(`/api/administradora/produto/${pid}/valor?idade=${idade}&acomodacao=${encodeURIComponent(acom)}`)
          const jVal = await rVal.json().catch(() => ({}))
          const val = jVal?.valor
          if (val != null && (typeof val === "number" ? !isNaN(val) : parseFloat(String(val).replace(",", ".")) > 0)) {
            setValorProdutoCliente(typeof val === "number" ? val : parseFloat(String(val).replace(",", ".")))
          }
        }
      }
      if (v?.tipo === "titular" && v?.cpf) {
        const { data: deps } = await supabase.from("vidas_importadas").select("id, nome, cpf, tipo, data_nascimento, parentesco").eq("grupo_id", grupoId).eq("cpf_titular", String(v.cpf).replace(/\D/g, "")).eq("tipo", "dependente")
        setDependentesModal(deps || [])
      }
      if (v?.produto_id) {
        const { data: contr } = await supabase.from("produtos_contrato_administradora").select("contrato_id").eq("id", v.produto_id).single()
        if (contr?.contrato_id) {
          const { data: c } = await supabase.from("contratos_administradora").select("*").eq("id", contr.contrato_id).single()
          setContratoModal(c)
        }
      }
      const resHist = await fetch(`/api/administradora/vidas-importadas/${item.id}/historico`)
      const hist = await resHist.json().catch(() => [])
      setHistoricoModal(Array.isArray(hist) ? hist : [])
      // Faturas/boletos do beneficiário (vida importada). Busca via API para garantir asaas_boleto_url (evita RLS do client).
      const clienteAdmIdVida = v?.cliente_administradora_id
      if (clienteAdmIdVida && adm?.id) {
        try {
          const res = await fetch(
            `/api/administradora/fatura/faturas-cliente?cliente_administradora_id=${encodeURIComponent(clienteAdmIdVida)}&administradora_id=${encodeURIComponent(adm.id)}`
          )
          const data = await res.json().catch(() => [])
          setFaturasModal(Array.isArray(data) ? data : data?.error ? [] : [])
        } catch {
          setFaturasModal([])
        }
      } else setFaturasModal([])
    } else {
      let propostaId = item.cliente_tipo === "proposta" ? item.cliente_id : item.cliente?.proposta_id
      let clienteAdmId = item.cliente_tipo === "cliente_administradora" ? item.cliente_id : null
      if (!clienteAdmId && propostaId && adm?.id) {
        const { data: ca } = await supabase.from("clientes_administradoras").select("id").eq("proposta_id", propostaId).eq("administradora_id", adm.id).single()
        clienteAdmId = ca?.id
      }
      let propostaData: any = null
      if (propostaId) {
        const { data: prop } = await supabase.from("propostas").select("*").eq("id", propostaId).single()
        setPropostaCompleta(prop)
        propostaData = prop
      }
      let pid = item.cliente?.produto_id
      if (!pid && propostaData) pid = propostaData?.produto_id
      if (!pid && propostaId && !propostaData) {
        const { data: prop } = await supabase.from("propostas").select("produto_id").eq("id", propostaId).single()
        pid = prop?.produto_id
      }
      if (pid) {
        const r = await fetch(`/api/administradora/produto/${pid}`)
        const p = await r.json().catch(() => null)
        if (p && !p.error) setProdutoCliente(p)
        const d = propostaData || item.cliente
        const idade = typeof d?.idade === "number" ? d.idade : (d?.idade != null && d?.idade !== "" ? parseInt(String(d.idade), 10) : null) ?? idadeDeDataNascimento(d?.data_nascimento)
        if (idade != null && !isNaN(idade)) {
          const rVal = await fetch(`/api/administradora/produto/${pid}/valor?idade=${idade}`)
          const jVal = await rVal.json().catch(() => ({}))
          if (jVal?.valor != null) setValorProdutoCliente(Number(jVal.valor))
        }
      }
      if (propostaId) {
        const { data: deps } = await supabase.from("dependentes").select("id, nome, cpf, data_nascimento, parentesco").eq("proposta_id", propostaId)
        setDependentesModal(deps || [])
      }
      if (clienteAdmId && adm?.id) {
        try {
          const res = await fetch(
            `/api/administradora/fatura/faturas-cliente?cliente_administradora_id=${encodeURIComponent(clienteAdmId)}&administradora_id=${encodeURIComponent(adm.id)}`
          )
          const data = await res.json().catch(() => [])
          setFaturasModal(Array.isArray(data) ? data : data?.error ? [] : [])
        } catch {
          setFaturasModal([])
        }
        const { data: ca } = await supabase.from("clientes_administradoras").select("numero_contrato, data_vigencia, valor_mensal").eq("id", clienteAdmId).single()
        if (ca) setContratoModal(ca)
      }
    }
  }

  async function handleExcluir(item: any) {
    try {
      setExcluindoBeneficiario(true)
      if (item.cliente_tipo === "vida_importada") {
        const res = await fetch(`/api/administradora/vidas-importadas/${item.id}`, { method: "DELETE" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Erro ao excluir")
      } else {
        const { supabase } = await import("@/lib/supabase")
        const { error } = await supabase.from("clientes_grupos").delete().eq("id", item.id)
        if (error) throw error
      }
      if (clienteSelecionado?.id === item.id) {
        setShowModalVisualizar(false)
        setClienteSelecionado(null)
      }
      await carregarClientes()
      toast.success("Beneficiário excluído do grupo.")
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir beneficiário.")
    } finally {
      setExcluindoBeneficiario(false)
    }
  }

  function abrirConfirmExcluir(item: any) {
    setItemParaExcluir(item)
    setConfirmExcluirOpen(true)
  }

  async function handleRecalcularValor() {
    if (clienteSelecionado?.cliente_tipo !== "vida_importada" || !clienteSelecionado?.id) return
    try {
      setAtualizandoValor(true)
      const res = await fetch(`/api/administradora/vidas-importadas/${clienteSelecionado.id}/recalcular-valor`, { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Erro ao atualizar valor")
      const novoValor = json?.valor_recalculado ?? json?.valor_mensal
      setValorMensalSalvo(novoValor != null ? Number(novoValor) : null)
      setValorProdutoCliente(novoValor != null ? Number(novoValor) : null)
      setClienteSelecionado((prev: any) => prev && prev._vida
        ? { ...prev, _vida: { ...prev._vida, valor_mensal: novoValor } }
        : prev)
      toast.success("Valor mensal atualizado com sucesso!")
      carregarClientes()
    } catch (e: any) {
      toast.error("Erro ao atualizar valor: " + (e?.message || "Erro"))
    } finally {
      setAtualizandoValor(false)
    }
  }

  async function handleSalvarVida() {
    if (clienteSelecionado?.cliente_tipo !== "vida_importada") return
    try {
      setSalvandoVida(true)
      const payload: Record<string, unknown> = { ...formVida }
      if (typeof payload.data_nascimento === "string" && !payload.data_nascimento) payload.data_nascimento = null
      if (payload.idade === "" || payload.idade == null) payload.idade = null
      else {
        const n = parseInt(String(payload.idade), 10)
        payload.idade = isNaN(n) ? null : n
      }
      if (payload.produto_id === "_nenhum" || payload.produto_id === "") payload.produto_id = null
      if ("cpf_titular" in payload) {
        const ct = payload.cpf_titular ? String(payload.cpf_titular).replace(/\D/g, "").slice(0, 14) : ""
        payload.cpf_titular = ct.length >= 11 ? ct : null
      }
      if (Array.isArray(payload.telefones)) payload.telefones = payload.telefones.filter((t: any) => t?.numero)
      if (Array.isArray(payload.emails)) payload.emails = payload.emails.filter((e: any) => e)
      const res = await fetch(`/api/administradora/vidas-importadas/${clienteSelecionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Erro ao salvar")
      toast.success("Cliente atualizado com sucesso!")
      setEditandoVida(false)
      const v = json
      setClienteSelecionado((prev: any) => prev ? {
        ...prev,
        cliente: { ...prev.cliente, ...v, nome: v?.nome, cpf: v?.cpf, nome_mae: v?.nome_mae, nome_pai: v?.nome_pai, tipo: v?.tipo, data_nascimento: v?.data_nascimento, idade: v?.idade, parentesco: v?.parentesco, cpf_titular: v?.cpf_titular, produto_id: v?.produto_id, acomodacao: (v as any)?.acomodacao, ativo: v?.ativo, sexo: v?.sexo, estado_civil: v?.estado_civil, identidade: v?.identidade, cns: v?.cns, observacoes: v?.observacoes, cep: v?.cep, cidade: v?.cidade, estado: v?.estado, bairro: v?.bairro, logradouro: v?.logradouro, numero: v?.numero, complemento: v?.complemento, telefones: v?.telefones, emails: v?.emails },
        _vida: v,
      } : prev)
        setFormVida({ nome: v?.nome, cpf: v?.cpf, nome_mae: v?.nome_mae, nome_pai: v?.nome_pai, tipo: v?.tipo, data_nascimento: v?.data_nascimento ? String(v.data_nascimento).slice(0, 10) : "", idade: v?.idade, parentesco: v?.parentesco, cpf_titular: v?.cpf_titular, produto_id: v?.produto_id, plano: (v as any)?.plano ?? "", acomodacao: (v as any)?.acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria", ativo: v?.ativo !== false, sexo: v?.sexo, estado_civil: v?.estado_civil, identidade: v?.identidade, cns: v?.cns, observacoes: v?.observacoes, cep: v?.cep, cidade: v?.cidade, estado: v?.estado, bairro: v?.bairro, logradouro: v?.logradouro, numero: v?.numero, complemento: v?.complemento, telefones: v?.telefones || [], emails: v?.emails || [] })
      const resHist = await fetch(`/api/administradora/vidas-importadas/${clienteSelecionado.id}/historico`)
      const hist = await resHist.json().catch(() => [])
      setHistoricoModal(Array.isArray(hist) ? hist : [])
      const pid = v?.produto_id
      const novaIdade = typeof v?.idade === "number" ? v.idade : (v?.idade != null && v?.idade !== "" ? parseInt(String(v.idade), 10) : null) ?? (v?.data_nascimento ? (() => { const p = String(v.data_nascimento).slice(0, 10).split("-"); if (p.length !== 3) return null; const hoje = new Date(); let i = hoje.getFullYear() - parseInt(p[0], 10); if (hoje.getMonth() + 1 < parseInt(p[1], 10) || (hoje.getMonth() + 1 === parseInt(p[1], 10) && hoje.getDate() < parseInt(p[2], 10))) i--; return i >= 0 && i <= 120 ? i : null })() : null)
      if (pid && novaIdade != null && !isNaN(novaIdade)) {
        const acom = formVida.acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria"
        const rVal = await fetch(`/api/administradora/produto/${pid}/valor?idade=${novaIdade}&acomodacao=${encodeURIComponent(acom)}`)
        const jVal = await rVal.json().catch(() => ({}))
        setValorProdutoCliente(jVal?.valor != null ? Number(jVal.valor) : null)
      }
      setValorMensalSalvo(v?.valor_mensal != null ? Number(v.valor_mensal) : null)
      carregarClientes()
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || "Erro desconhecido"))
    } finally {
      setSalvandoVida(false)
    }
  }

  const clientesFiltrados = clientes.filter((item) => {
    if (filtroTipo) {
      if (getTipoItem(item) !== filtroTipo) return false
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

  useEffect(() => {
    setPaginaAtual(1)
  }, [filtro, filtroTipo])

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
              <Label className="text-xs text-gray-600 whitespace-nowrap">Corretor (vidas importadas):</Label>
              <Select
                value={corretorGrupo || "__nenhum__"}
                onValueChange={async (v) => {
                  const adm = getAdministradoraLogada()
                  if (!adm?.id) return
                  const corretorId = v === "__nenhum__" ? null : v
                  setAtualizandoCorretorGrupo(true)
                  try {
                    const res = await fetch(`/api/administradora/grupos/${grupoId}/corretor-vidas`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ administradora_id: adm.id, corretor_id: corretorId }),
                    })
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}))
                      throw new Error(j?.error || "Erro ao atualizar")
                    }
                    setCorretorGrupo(v)
                    toast.success("Corretor aplicado a todas as vidas importadas do grupo.")
                    carregarClientes()
                  } catch (e: any) {
                    toast.error(e?.message || "Erro ao vincular corretor")
                  } finally {
                    setAtualizandoCorretorGrupo(false)
                  }
                }}
                disabled={atualizandoCorretorGrupo}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__nenhum__">— Nenhum</SelectItem>
                  {corretores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
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
            <Select value={filtroTipo || "todos"} onValueChange={(v) => setFiltroTipo(v === "todos" ? "" : (v as "titular" | "dependente"))}>
              <SelectTrigger className="h-10 w-[140px] rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="titular">Titular</SelectItem>
                <SelectItem value="dependente">Dependente</SelectItem>
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
        {clientesFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filtro.trim() || filtroTipo ? "Nenhum cliente encontrado com os filtros aplicados" : "Nenhum cliente vinculado a este grupo"}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
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
                      {(() => {
                        const corretorId =
                          item.cliente_tipo === "vida_importada"
                            ? (item._vida as { corretor_id?: string | null })?.corretor_id
                            : (item.cliente as { corretor_id?: string | null })?.corretor_id
                        return corretorId ? (corretores.find((c) => c.id === corretorId)?.nome ?? "—") : "—"
                      })()}
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
                          onClick={() => handleVisualizar(item)}
                          className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 rounded-md"
                          title="Visualizar"
                        >
                          <FileSearch className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirConfirmExcluir(item)}
                          className="h-8 w-8 p-0 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 rounded-md"
                          title="Excluir do grupo"
                        >
                          <UserMinus className="h-4 w-4" />
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

      <ModalConfirmacaoExclusao
        open={confirmExcluirOpen}
        onOpenChange={(open) => { setConfirmExcluirOpen(open); if (!open) setItemParaExcluir(null) }}
        titulo="Excluir beneficiário do grupo"
        descricao={itemParaExcluir
          ? `Tem certeza que deseja excluir "${itemParaExcluir.cliente?.nome || "este beneficiário"}" do grupo?${itemParaExcluir.cliente_tipo === "vida_importada" ? " A vida importada será removida permanentemente." : " O vínculo com o grupo será removido."}`
          : ""}
        textoConfirmar="Excluir do grupo"
        onConfirm={() => itemParaExcluir && handleExcluir(itemParaExcluir)}
        carregando={excluindoBeneficiario}
      />

      {/* Modal Visualizar/Editar Cliente - portal no body para overlay cobrir toda a tela */}
      {showModalVisualizar && clienteSelecionado && typeof document !== "undefined" && createPortal(
        (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6" style={{ top: 0, left: 0, right: 0, bottom: 0, minHeight: "100dvh" }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl my-auto min-h-0 max-h-[85vh] sm:max-h-[88vh] flex flex-col p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 shrink-0">
              <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate pr-2">
                {clienteSelecionado.cliente_tipo === "vida_importada" ? clienteSelecionado.cliente?.nome : (clienteSelecionado.cliente_tipo === "proposta" ? clienteSelecionado.cliente?.nome : propostaCompleta?.nome || clienteSelecionado.cliente?.nome) || "Cliente"}
              </h3>
              <div className="flex flex-wrap gap-2 shrink-0">
                {clienteSelecionado.cliente_tipo === "vida_importada" && (
                  editandoVida ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditandoVida(false)}>Cancelar</Button>
                      <Button size="sm" onClick={handleSalvarVida} disabled={salvandoVida} className="bg-[#0F172A] hover:bg-[#1E293B]">{salvandoVida ? "Salvando..." : "Salvar"}</Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditandoVida(true)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  )
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowModalVisualizar(false)}>Fechar</Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <Tabs value={tabModalAtiva} onValueChange={setTabModalAtiva} className="w-full">
                <TabsList className="flex w-full max-w-full gap-1 mb-3 sm:mb-4 overflow-x-auto overflow-y-hidden flex-nowrap min-w-0 py-1 [&>button]:flex-1 [&>button]:min-w-[4.5rem] [&>button]:shrink-0 [&>button]:text-xs [&>button]:whitespace-nowrap">
                  <TabsTrigger value="dados-basicos">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="contato">Contato</TabsTrigger>
                  <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
                  <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                  <TabsTrigger value="contrato">Contrato</TabsTrigger>
                  <TabsTrigger value="coparticipacao">Coparticipação</TabsTrigger>
                  {clienteSelecionado.cliente_tipo === "vida_importada" && <TabsTrigger value="historico">Histórico</TabsTrigger>}
                </TabsList>

                {clienteSelecionado.cliente_tipo === "vida_importada" && getTipoItem(clienteSelecionado) === "dependente" && (() => {
                  const cpfTit = String((clienteSelecionado._vida?.cpf_titular ?? clienteSelecionado.cliente?.cpf_titular ?? "")).replace(/\D/g, "")
                  const vinculado = cpfTit.length >= 11 && titularesDoGrupo.some((t: any) => t.cpf === cpfTit)
                  if (vinculado) return null
                  return (
                    <div className="mb-4 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex flex-wrap items-center gap-2">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <span className="flex-1 min-w-0">Este dependente não está vinculado a um titular. Para vincular, clique em Editar e em &quot;Vincular a titular&quot; selecione o titular do grupo.</span>
                      {!editandoVida && (
                        <Button variant="outline" size="sm" onClick={() => setEditandoVida(true)} className="shrink-0">
                          Editar e vincular
                        </Button>
                      )}
                    </div>
                  )
                })()}

                <TabsContent value="dados-basicos" className="space-y-4">
                  {clienteSelecionado.cliente_tipo === "vida_importada" && editandoVida ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                      {[
                        { key: "nome", label: "Nome", el: <Input value={String(formVida.nome ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, nome: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                        { key: "grupo", label: "Grupo", el: <span className="text-gray-700">{grupo?.nome || "-"}</span> },
                        { key: "sexo", label: "Sexo", el: <Input value={String(formVida.sexo ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, sexo: e.target.value }))} className="h-9 border-0 bg-transparent" placeholder="Ex: Masculino" /> },
                        { key: "ec", label: "Estado Civil", el: <Input value={String(formVida.estado_civil ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, estado_civil: e.target.value }))} className="h-9 border-0 bg-transparent" placeholder="Ex: Solteiro" /> },
                        { key: "mae", label: "Nome da Mãe", el: <Input value={String(formVida.nome_mae ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, nome_mae: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                        { key: "pai", label: "Nome do Pai", el: <Input value={String(formVida.nome_pai ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, nome_pai: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                        { key: "rg", label: "Identidade", el: <Input value={String(formVida.identidade ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, identidade: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                        { key: "cpf", label: "CPF", el: <Input value={String(formVida.cpf ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, cpf: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                        { key: "dt", label: "Data de Nascimento", el: <Input type="date" value={String(formVida.data_nascimento ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, data_nascimento: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                        { key: "idade", label: "Idade", el: <Input type="number" value={String(formVida.idade ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, idade: e.target.value || null }))} className="h-9 border-0 bg-transparent" placeholder="Anos" /> },
                        { key: "cns", label: "CNS", el: <Input value={String(formVida.cns ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, cns: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                        { key: "tipo", label: "Tipo", el: <Select value={String(formVida.tipo ?? "titular")} onValueChange={(v) => setFormVida((f) => ({ ...f, tipo: v }))}><SelectTrigger className="h-9 border-0 bg-transparent"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="titular">Titular</SelectItem><SelectItem value="dependente">Dependente</SelectItem></SelectContent></Select> },
                        { key: "sit", label: "Situação", el: <Select value={formVida.ativo ? "ativo" : "inativo"} onValueChange={(v) => setFormVida((f) => ({ ...f, ativo: v === "ativo" }))}><SelectTrigger className="h-9 border-0 bg-transparent"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent></Select> },
                        { key: "par", label: "Parentesco", el: <Input value={String(formVida.parentesco ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, parentesco: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                        { key: "cpft", label: formVida.tipo === "dependente" ? "Vincular a titular" : "CPF do titular", el: formVida.tipo === "dependente" ? (
                          <div className="space-y-2">
                            {titularesDoGrupo.length > 0 && (
                              <Select
                                value={titularesDoGrupo.some((t) => t.cpf === String(formVida.cpf_titular ?? "").replace(/\D/g, "")) ? String(formVida.cpf_titular ?? "").replace(/\D/g, "") : "_nenhum"}
                                onValueChange={(v) => setFormVida((f) => ({ ...f, cpf_titular: v === "_nenhum" ? "" : v }))}
                              >
                                <SelectTrigger className="h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"><SelectValue placeholder="Selecione um titular do grupo" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_nenhum">— Nenhum selecionado —</SelectItem>
                                  {titularesDoGrupo.map((t) => (
                                    <SelectItem key={t.id} value={t.cpf}>{t.nome} — {formatarCpf(t.cpf)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Input value={String(formVida.cpf_titular ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, cpf_titular: e.target.value }))} className="h-9 border border-gray-300 bg-white" placeholder={formVida.tipo === "dependente" ? "Ou digite o CPF do titular" : "Quando dependente"} />
                          </div>
                        ) : <Input value={String(formVida.cpf_titular ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, cpf_titular: e.target.value }))} className="h-9 border-0 bg-transparent" placeholder="Quando dependente" />, span: true },
                        { key: "obs", label: "Observações", el: <Textarea value={String(formVida.observacoes ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, observacoes: e.target.value }))} className="min-h-[60px] border-0 bg-transparent resize-none" rows={2} />, span: true },
                        ...(produtosOpcoes.length > 0 ? [{ key: "prod", label: "Produto vinculado", el: <Select value={formVida.produto_id ? String(formVida.produto_id) : "_nenhum"} onValueChange={(v) => setFormVida((f) => ({ ...f, produto_id: v === "_nenhum" ? null : v }))}><SelectTrigger className="h-9 border-0 bg-transparent"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="_nenhum">Nenhum</SelectItem>{produtosOpcoes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select>, span: true as const }] : []),
                        { key: "plano", label: "Plano", el: <Input value={String(formVida.plano ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, plano: e.target.value }))} className="h-9 border-0 bg-transparent" placeholder="Ex: NACIONAL" maxLength={150} />, span: false },
                        { key: "acom", label: "Acomodação", el: <Select value={String(formVida.acomodacao ?? "Enfermaria")} onValueChange={(v) => setFormVida((f) => ({ ...f, acomodacao: v }))}><SelectTrigger className="h-9 border-0 bg-transparent"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Enfermaria">Enfermaria</SelectItem><SelectItem value="Apartamento">Apartamento</SelectItem></SelectContent></Select> },
                      ].map((c, i) => (
                        <div key={c.key} className={`p-3 ${Math.floor(i / 2) % 2 === 0 ? "bg-gray-50" : "bg-white"} ${"span" in c && c.span ? "sm:col-span-2" : ""}`}>
                          <span className="text-gray-500 block text-xs font-medium mb-1">{c.label}</span>
                          {c.el}
                        </div>
                      ))}
                    </div>
                  ) : (
                    (() => {
                      const d = clienteSelecionado.cliente_tipo === "vida_importada" ? (clienteSelecionado._vida || clienteSelecionado.cliente) : (clienteSelecionado.cliente_tipo === "proposta" ? clienteSelecionado.cliente : (propostaCompleta || clienteSelecionado.cliente))
                      const rv = (v: any) => (v != null && v !== "" ? String(v) : "-")
                      const campos = [
                        { label: "Nome", val: rv(d?.nome), span: false },
                        { label: "Grupo de Beneficiário", val: rv(grupo?.nome), span: false },
                        { label: "Tipo", val: (d as any)?.tipo === "dependente" ? "Dependente" : "Titular", span: false },
                        { label: "Sexo", val: rv(d?.sexo || d?.sexo_cliente), span: false },
                        { label: "Estado Civil", val: rv(d?.estado_civil), span: false },
                        { label: "Nome da Mãe", val: rv(d?.nome_mae || d?.nome_mae_cliente), span: false },
                        { label: "Nome do Pai", val: rv(d?.nome_pai), span: false },
                        { label: "Identidade (RG)", val: rv(d?.identidade || d?.rg), span: false },
                        { label: "CPF", val: formatarCpf(d?.cpf) || "-", span: false },
                        { label: "Data de Nascimento", val: d?.data_nascimento ? String(d.data_nascimento).slice(0, 10) : "-", span: false },
                        { label: "Idade", val: d?.idade != null && d?.idade !== "" ? String(d.idade) : "-", span: false },
                        { label: "Parentesco", val: rv((d as any)?.parentesco), span: false },
                        ...(clienteSelecionado.cliente_tipo === "vida_importada" && (d as any)?.tipo === "dependente" ? [{ label: "CPF do Titular", val: formatarCpf((d as any)?.cpf_titular) || "-", span: false }] : []),
                        ...(clienteSelecionado.cliente_tipo === "vida_importada" ? [{ label: "Acomodação", val: (d as any)?.acomodacao === "Apartamento" ? "Apartamento" : "Enfermaria", span: false }] : []),
                        ...(clienteSelecionado.cliente_tipo === "vida_importada" ? [{ label: "Plano", val: rv((d as any)?.plano) || rv((d as any)?.dados_adicionais && typeof (d as any).dados_adicionais === "object" ? ((d as any).dados_adicionais as Record<string, unknown>).Plano ?? ((d as any).dados_adicionais as Record<string, unknown>).plano : null), span: false }] : []),
                        { label: "CNS", val: rv(d?.cns), span: false },
                        { label: "Observações", val: rv(d?.observacoes || clienteSelecionado.cliente?.observacoes), span: true },
                      ]
                      const dadosAdicionais = clienteSelecionado.cliente_tipo === "vida_importada" && (d as any)?.dados_adicionais && typeof (d as any).dados_adicionais === "object" ? (d as any).dados_adicionais : null
                      const paresAdicionais = dadosAdicionais && typeof dadosAdicionais === "object" ? Object.entries(dadosAdicionais).filter(([k, v]) => v != null && String(v).trim() !== "" && k.toLowerCase() !== "plano") as [string, string][] : []
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                            {campos.map((c, i) => (
                              <div key={i} className={`p-3 ${Math.floor(i / 2) % 2 === 0 ? "bg-gray-50" : "bg-white"} ${c.span ? "sm:col-span-2" : ""}`}>
                                <span className="text-gray-500 block text-xs font-medium">{c.label}</span>
                                <span className="text-gray-900">{c.val}</span>
                              </div>
                            ))}
                          </div>
                          {paresAdicionais.length > 0 && (
                            <>
                              <h4 className="font-medium text-sm text-gray-700">Dados adicionais (importação)</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                                {paresAdicionais.map(([key, val], i) => (
                                  <div key={key} className={`p-3 ${Math.floor(i / 2) % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                                    <span className="text-gray-500 block text-xs font-medium">{key}</span>
                                    <span className="text-gray-900">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })()
                  )}
                </TabsContent>

                <TabsContent value="contato" className="space-y-4">
                  {clienteSelecionado.cliente_tipo === "vida_importada" && editandoVida ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-2">Endereço</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                          {[
                            { k: "cep", l: "CEP", el: <Input value={String(formVida.cep ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, cep: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                            { k: "cid", l: "Cidade", el: <Input value={String(formVida.cidade ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, cidade: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                            { k: "uf", l: "Estado", el: <Input value={String(formVida.estado ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, estado: e.target.value }))} className="h-9 border-0 bg-transparent" placeholder="UF" maxLength={2} /> },
                            { k: "bai", l: "Bairro", el: <Input value={String(formVida.bairro ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, bairro: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                            { k: "log", l: "Logradouro", el: <Input value={String(formVida.logradouro ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, logradouro: e.target.value }))} className="h-9 border-0 bg-transparent" />, span: true },
                            { k: "num", l: "Número", el: <Input value={String(formVida.numero ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, numero: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                            { k: "comp", l: "Complemento", el: <Input value={String(formVida.complemento ?? "")} onChange={(e) => setFormVida((f) => ({ ...f, complemento: e.target.value }))} className="h-9 border-0 bg-transparent" /> },
                          ].map((c, i) => (
                            <div key={c.k} className={`p-3 ${Math.floor(i / 2) % 2 === 0 ? "bg-gray-50" : "bg-white"} ${"span" in c ? "sm:col-span-2" : ""}`}>
                              <span className="text-gray-500 block text-xs font-medium mb-1">{c.l}</span>{c.el}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Telefones</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                          {[
                            { k: "c1", l: "Celular 1", el: <Input value={(() => { const t = Array.isArray(formVida.telefones) ? formVida.telefones.find((x: any) => x?.tipo === "celular") : null; return t?.numero || (Array.isArray(formVida.telefones) && formVida.telefones[0]?.numero) || "" })()} onChange={(e) => { const arr = Array.isArray(formVida.telefones) ? [...formVida.telefones] : []; const idx = arr.findIndex((x: any) => x?.tipo === "celular"); if (idx >= 0) arr[idx].numero = e.target.value; else arr.unshift({ tipo: "celular", numero: e.target.value }); setFormVida((f) => ({ ...f, telefones: arr })) }} className="h-9 border-0 bg-transparent" placeholder="(11) 99999-9999" /> },
                            { k: "c2", l: "Celular 2", el: <Input value={(() => { const cels = Array.isArray(formVida.telefones) ? formVida.telefones.filter((x: any) => x?.tipo === "celular") : []; return cels[1]?.numero || "" })()} onChange={(e) => { const arr = Array.isArray(formVida.telefones) ? [...formVida.telefones] : []; const cels = arr.filter((x: any) => x?.tipo === "celular"); const fixo = arr.find((x: any) => x?.tipo === "fixo"); const newCels = [...cels]; if (newCels.length >= 2) newCels[1].numero = e.target.value; else if (newCels.length === 1) newCels.push({ tipo: "celular", numero: e.target.value }); else newCels.push({ tipo: "celular", numero: e.target.value }); setFormVida((f) => ({ ...f, telefones: [...newCels.slice(0, 2), fixo].filter(Boolean) })) }} className="h-9 border-0 bg-transparent" /> },
                            { k: "fix", l: "Fixo", el: <Input value={(() => { const t = Array.isArray(formVida.telefones) ? formVida.telefones.find((x: any) => x?.tipo === "fixo") : null; return t?.numero || "" })()} onChange={(e) => { const arr = Array.isArray(formVida.telefones) ? [...formVida.telefones] : []; const idx = arr.findIndex((x: any) => x?.tipo === "fixo"); if (idx >= 0) arr[idx].numero = e.target.value; else arr.push({ tipo: "fixo", numero: e.target.value }); setFormVida((f) => ({ ...f, telefones: arr })) }} className="h-9 border-0 bg-transparent" placeholder="(11) 3333-4444" /> },
                          ].map((c, i) => (
                            <div key={c.k} className={`p-3 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                              <span className="text-gray-500 block text-xs font-medium mb-1">{c.l}</span>{c.el}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">E-mails</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                          {[
                            { k: "e1", l: "E-mail 1", el: <Input type="email" value={Array.isArray(formVida.emails) ? (formVida.emails[0] || "") : ""} onChange={(e) => { const arr = Array.isArray(formVida.emails) ? [...formVida.emails] : []; arr[0] = e.target.value; setFormVida((f) => ({ ...f, emails: arr.filter(Boolean) })) }} className="h-9 border-0 bg-transparent" /> },
                            { k: "e2", l: "E-mail 2", el: <Input type="email" value={Array.isArray(formVida.emails) ? (formVida.emails[1] || "") : ""} onChange={(e) => { const arr = Array.isArray(formVida.emails) ? [...formVida.emails] : []; arr[1] = e.target.value; setFormVida((f) => ({ ...f, emails: arr.filter(Boolean) })) }} className="h-9 border-0 bg-transparent" /> },
                          ].map((c, i) => (
                            <div key={c.k} className={`p-3 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                              <span className="text-gray-500 block text-xs font-medium mb-1">{c.l}</span>{c.el}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const d = clienteSelecionado.cliente_tipo === "vida_importada" ? (clienteSelecionado._vida || clienteSelecionado.cliente) : (clienteSelecionado.cliente_tipo === "proposta" ? clienteSelecionado.cliente : (propostaCompleta || clienteSelecionado.cliente))
                      const dadosAdic = (clienteSelecionado.cliente_tipo === "vida_importada" && (d as any)?.dados_adicionais && typeof (d as any).dados_adicionais === "object") ? (d as any).dados_adicionais as Record<string, unknown> : {}
                      const fromAdic = (...keys: string[]) => {
                        for (const k of keys) {
                          const v = (dadosAdic as Record<string, unknown>)[k] ?? (dadosAdic as Record<string, unknown>)[k.toLowerCase()] ?? Object.entries(dadosAdic).find(([key]) => key.toLowerCase() === k.toLowerCase())?.[1]
                          if (v != null && String(v).trim() !== "") return String(v)
                        }
                        return null
                      }
                      const rv = (v: any) => (v != null && v !== "" ? String(v) : "-")
                      const tels = d?.telefones
                      const emls = d?.emails
                      const cel1 = Array.isArray(tels) ? tels.find((t: any) => t?.tipo === "celular")?.numero || tels[0]?.numero : null
                      const cel2 = Array.isArray(tels) ? tels.filter((t: any) => t?.tipo === "celular")[1]?.numero : null
                      const fixo = Array.isArray(tels) ? tels.find((t: any) => t?.tipo === "fixo")?.numero : null
                      const email1 = Array.isArray(emls) ? emls[0] : (d?.email || null)
                      const email2 = Array.isArray(emls) ? emls[1] : null
                      const cel1Val = cel1 || fromAdic("Celular", "Telefone", "Celular 1", "WhatsApp", "Fone")
                      const cel2Val = cel2 || fromAdic("Celular 2", "Telefone 2")
                      const fixoVal = fixo || fromAdic("Fixo", "Telefone Fixo")
                      const email1Val = email1 || fromAdic("E-mail", "Email", "E-mail 1", "E-Mail")
                      const email2Val = email2 || fromAdic("E-mail 2", "Email 2")
                      const cepVal = d?.cep || fromAdic("CEP", "Cep")
                      const cidadeVal = d?.cidade || fromAdic("Cidade")
                      const estadoVal = d?.estado || fromAdic("Estado", "UF")
                      const bairroVal = d?.bairro || fromAdic("Bairro")
                      const logrVal = d?.logradouro || d?.endereco || fromAdic("Logradouro", "Endereço", "Endereco", "Rua")
                      const numeroVal = d?.numero || fromAdic("Número", "Numero", "Nº")
                      const compVal = d?.complemento || fromAdic("Complemento")
                      const endCampos = [{ label: "CEP", val: rv(cepVal) }, { label: "Cidade", val: rv(cidadeVal) }, { label: "Estado", val: rv(estadoVal) }, { label: "Bairro", val: rv(bairroVal) }, { label: "Logradouro", val: rv(logrVal), span: true }, { label: "Número", val: rv(numeroVal) }, { label: "Complemento", val: rv(compVal) }]
                      const telCampos = [{ label: "Celular 1", val: rv(cel1Val || d?.telefone) }, { label: "Celular 2", val: rv(cel2Val) }, { label: "Fixo", val: rv(fixoVal) }]
                      const emailCampos = [{ label: "E-mail 1", val: rv(email1Val) }, { label: "E-mail 2", val: rv(email2Val) }]
                      const InfoGrid = ({ campos, cols = 2 }: { campos: { label: string; val: string; span?: boolean }[]; cols?: number }) => (
                        <div className={`grid grid-cols-1 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                          {campos.map((c, i) => (
                            <div key={i} className={`p-3 ${Math.floor(i / cols) % 2 === 0 ? "bg-gray-50" : "bg-white"} ${c.span ? "sm:col-span-2" : ""}`}>
                              <span className="text-gray-500 block text-xs font-medium">{c.label}</span>
                              <span className="text-gray-900">{c.val}</span>
                            </div>
                          ))}
                        </div>
                      )
                      return (
                        <div className="space-y-6">
                          <div><h4 className="font-medium mb-2">Endereço</h4><InfoGrid campos={endCampos} /></div>
                          <div><h4 className="font-medium mb-2">Telefones</h4><InfoGrid campos={telCampos} cols={3} /></div>
                          <div><h4 className="font-medium mb-2">E-mails</h4><InfoGrid campos={emailCampos} /></div>
                        </div>
                      )
                    })()
                  )}
                </TabsContent>

                <TabsContent value="dependentes" className="space-y-4">
                  {dependentesModal.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Parentesco</TableHead>
                          <TableHead>Data Nasc.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dependentesModal.map((dep: any, i: number) => (
                          <TableRow key={dep.id} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                            <TableCell>{dep.nome || "-"}</TableCell>
                            <TableCell>{formatarCpf(dep.cpf)}</TableCell>
                            <TableCell>{dep.parentesco || "-"}</TableCell>
                            <TableCell>{dep.data_nascimento ? String(dep.data_nascimento).slice(0, 10) : "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum dependente cadastrado.</p>
                  )}
                </TabsContent>

                <TabsContent value="financeiro" className="space-y-4">
                  {faturasModal.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº Fatura</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Boleto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faturasModal.map((f: any, i: number) => {
                          const valorF = f.valor_total ?? f.valor
                          const vencF = f.data_vencimento ?? f.vencimento
                          const boletoUrl = f.boleto_link ?? f.asaas_boleto_url ?? f.boleto_url
                          return (
                            <TableRow key={f.id} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                              <TableCell>{f.numero_fatura || "-"}</TableCell>
                              <TableCell>{formatarMoeda(Number(valorF ?? 0))}</TableCell>
                              <TableCell>{vencF ? formatarData(String(vencF).slice(0, 10)) : "-"}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize">{f.status || "-"}</Badge></TableCell>
                              <TableCell className="text-right">
                                {boletoUrl ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      asChild
                                    >
                                      <a href={boletoUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                        Visualizar
                                      </a>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      asChild
                                    >
                                      <a href={boletoUrl} target="_blank" rel="noopener noreferrer" download={`boleto-${f.numero_fatura || f.id}.pdf`}>
                                        <Download className="h-3.5 w-3.5 mr-1" />
                                        Baixar
                                      </a>
                                    </Button>
                                  </div>
                                ) : "-"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhuma fatura vinculada. Gere boletos em Fatura → Gerar; eles aparecerão aqui após o vínculo do beneficiário ao cliente de fatura.</p>
                  )}
                </TabsContent>

                <TabsContent value="contrato" className="space-y-4">
                  {clienteSelecionado.cliente_tipo === "vida_importada" &&
                    valorProdutoCliente != null &&
                    (valorMensalSalvo == null || Math.abs(valorProdutoCliente - valorMensalSalvo) > 0.001) && (
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-800">Valor alterado (possível mudança de faixa etária)</p>
                        <p className="text-sm text-amber-700">
                          {valorMensalSalvo != null
                            ? `Valor salvo: R$ ${Number(valorMensalSalvo).toFixed(2)} → Novo valor: R$ ${Number(valorProdutoCliente).toFixed(2)}`
                            : `Valor calculado: R$ ${Number(valorProdutoCliente).toFixed(2)} (não salvo)`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-300 text-amber-800 hover:bg-amber-100"
                        onClick={handleRecalcularValor}
                        disabled={atualizandoValor}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1.5 ${atualizandoValor ? "animate-spin" : ""}`} />
                        {atualizandoValor ? "Atualizando…" : "Atualizar valor"}
                      </Button>
                    </div>
                  )}
                  {contratoModal ? (
                    (() => {
                      const valorMensal = valorProdutoCliente ?? valorMensalSalvo ?? contratoModal.valor_mensal
                      const contrCampos: { label: string; val: string; span?: boolean }[] = [
                        { label: "Número", val: contratoModal.numero || contratoModal.numero_contrato || "-" },
                        { label: "Descrição", val: contratoModal.descricao || "-" },
                        { label: "Data Vigência", val: contratoModal.data_vigencia ? String(contratoModal.data_vigencia).slice(0, 10) : "-" },
                        { label: "Valor Mensal", val: valorMensal != null && valorMensal !== "" ? `R$ ${Number(valorMensal).toFixed(2)}` : "-" },
                      ]
                      if (produtoCliente) contrCampos.push({ label: "Produto vinculado", val: `${produtoCliente.nome}${produtoCliente.segmentacao ? ` • ${produtoCliente.segmentacao}` : ""}`, span: true })
                      const semValor = valorMensal == null || valorMensal === "" || String(valorMensal) === "-"
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                            {contrCampos.map((c, i) => (
                              <div key={i} className={`p-3 ${Math.floor(i / 2) % 2 === 0 ? "bg-gray-50" : "bg-white"} ${c.span ? "sm:col-span-2" : ""}`}>
                                <span className="text-gray-500 block text-xs font-medium">{c.label}</span>
                                <span className="text-gray-900">{c.val}</span>
                              </div>
                            ))}
                          </div>
                          {semValor && clienteSelecionado.cliente_tipo === "vida_importada" && (clienteSelecionado._vida?.produto_id || clienteSelecionado.cliente?.produto_id) && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs text-amber-800 mb-2">Valor não calculado. Verifique se o produto tem faixas preenchidas no contrato.</p>
                              <Button size="sm" variant="outline" onClick={handleRecalcularValor} disabled={atualizandoValor} className="border-amber-300 text-amber-800">
                                <RefreshCw className={`h-4 w-4 mr-1.5 ${atualizandoValor ? "animate-spin" : ""}`} />
                                {atualizandoValor ? "Calculando…" : "Calcular e salvar valor"}
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })()
                  ) : produtoCliente || valorProdutoCliente != null || valorMensalSalvo != null ? (
                    (() => {
                      const valorMensal = valorProdutoCliente ?? valorMensalSalvo
                      const campos: { label: string; val: string }[] = []
                      if (produtoCliente) campos.push({ label: "Produto vinculado", val: `${produtoCliente.nome}${produtoCliente.segmentacao ? ` • ${produtoCliente.segmentacao}` : ""}` })
                      if (valorMensal != null) campos.push({ label: "Valor Mensal", val: `R$ ${Number(valorMensal).toFixed(2)}` })
                      return campos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                          {campos.map((c, i) => (
                            <div key={i} className={`p-3 ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                              <span className="text-gray-500 block text-xs font-medium">{c.label}</span>
                              <span className="text-gray-900">{c.val}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhum contrato ou produto vinculado.</p>
                      )
                    })()
                  ) : clienteSelecionado.cliente_tipo === "vida_importada" &&
                    (clienteSelecionado._vida?.produto_id || clienteSelecionado.cliente?.produto_id) &&
                    (clienteSelecionado._vida?.data_nascimento || clienteSelecionado._vida?.idade != null) ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500">Valor mensal não calculado.</p>
                      <p className="text-xs text-gray-600">
                        O produto e a idade estão disponíveis. Clique para calcular e salvar o valor com base nas faixas do contrato.
                      </p>
                      <Button size="sm" variant="outline" onClick={handleRecalcularValor} disabled={atualizandoValor}>
                        <RefreshCw className={`h-4 w-4 mr-1.5 ${atualizandoValor ? "animate-spin" : ""}`} />
                        {atualizandoValor ? "Calculando…" : "Calcular e salvar valor"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum contrato vinculado.</p>
                  )}
                </TabsContent>

                <TabsContent value="coparticipacao" className="space-y-4">
                  <p className="text-sm text-gray-500">Módulo de coparticipação em desenvolvimento.</p>
                </TabsContent>

                {clienteSelecionado.cliente_tipo === "vida_importada" && (
                  <TabsContent value="historico" className="space-y-4">
                    {historicoModal.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">Últimas alterações registradas:</p>
                        {historicoModal.map((h: any, idx: number) => (
                          <Card key={h.id}>
                            <CardContent className="p-4">
                              <div className="text-xs text-gray-500 mb-2">
                                {h.created_at ? new Date(h.created_at).toLocaleString("pt-BR") : "-"}
                              </div>
                              <div className="space-y-2 text-sm">
                                {h.alteracoes && typeof h.alteracoes === "object" && Object.entries(h.alteracoes).map(([campo, v]: [string, any]) => {
                                  const label = campo === "nome" ? "Nome" : campo === "cpf" ? "CPF" : campo === "nome_mae" ? "Nome da mãe" : campo === "data_nascimento" ? "Data de nascimento" : campo === "ativo" ? "Situação" : campo === "produto_id" ? "Produto" : campo.replace(/_/g, " ")
                                  const antes = v?.antes != null ? String(v.antes) : "-"
                                  const depois = v?.depois != null ? String(v.depois) : "-"
                                  return (
                                    <div key={campo} className="flex gap-2 flex-wrap">
                                      <span className="font-medium text-gray-600 capitalize">{label}:</span>
                                      <span className="text-red-600 line-through">{antes}</span>
                                      <span className="text-gray-400">→</span>
                                      <span className="text-green-700">{depois}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Nenhuma alteração registrada ainda.</p>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </div>
        ),
        document.body
      )}

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

