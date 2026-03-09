"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { GruposBeneficiariosService, type GrupoBeneficiarios } from "@/services/grupos-beneficiarios-service"
import { adicionarAlertaSistema } from "@/services/administradora-alertas-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, ArrowLeft, Download, ExternalLink, Loader2, Pencil, Save, Trash2, X } from "lucide-react"
import { formatarData, formatarMoeda } from "@/utils/formatters"
import { toast } from "sonner"

type ClienteItem = any

export default function BeneficiarioDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const grupoId = params.id as string
  const beneficiarioId = params.beneficiarioId as string

  const [grupo, setGrupo] = useState<GrupoBeneficiarios | null>(null)
  const [loading, setLoading] = useState(true)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteItem | null>(null)
  const [tabAtiva, setTabAtiva] = useState("dados-basicos")
  const [dependentes, setDependentes] = useState<any[]>([])
  const [faturas, setFaturas] = useState<any[]>([])
  const [contrato, setContrato] = useState<any>(null)
  const [historico, setHistorico] = useState<any[]>([])
  const [produtoCliente, setProdutoCliente] = useState<any>(null)
  const [valorProdutoCliente, setValorProdutoCliente] = useState<number | null>(null)
  const [corretores, setCorretores] = useState<{ id: string; nome: string }[]>([])
  const [modalCorretorOpen, setModalCorretorOpen] = useState(false)
  const [corretorSelecionadoId, setCorretorSelecionadoId] = useState<string>("__nenhum__")
  const [salvandoCorretor, setSalvandoCorretor] = useState(false)
  const [excluindoFaturaId, setExcluindoFaturaId] = useState<string | null>(null)
  const [editandoDadosBasicos, setEditandoDadosBasicos] = useState(false)
  const [editandoContato, setEditandoContato] = useState(false)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [formDadosBasicos, setFormDadosBasicos] = useState({
    nome: "",
    cpf: "",
    data_nascimento: "",
    parentesco: "",
    cpf_titular: "",
  })
  const [formContato, setFormContato] = useState({
    email: "",
    telefone: "",
    cep: "",
    cidade: "",
    estado: "",
    bairro: "",
    logradouro: "",
    numero: "",
    complemento: "",
  })

  function getTipoItem(item: any): "titular" | "dependente" {
    if (item?.cliente_tipo === "vida_importada") {
      const t = (item?.cliente?.tipo || item?._vida?.tipo || "titular").toString().toLowerCase()
      return t === "dependente" ? "dependente" : "titular"
    }
    return "titular"
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

  function obterCorretorIdAtual(): string | null {
    if (!clienteSelecionado) return null
    if (clienteSelecionado.cliente_tipo === "vida_importada") {
      return normalizarCorretorId(clienteSelecionado?._vida?.corretor_id ?? clienteSelecionado?.cliente?.corretor_id)
    }
    return normalizarCorretorId(clienteSelecionado?.cliente?.corretor_id)
  }

  function obterNomeCorretorAtual(): string {
    const corretorId = obterCorretorIdAtual()
    if (!corretorId) return "—"
    const nome = corretores.find((c) => c.id === corretorId)?.nome
    return nome || "Corretor não encontrado"
  }

  const titularesDoGrupo = useMemo(() => {
    if (!clienteSelecionado) return []
    return [clienteSelecionado]
  }, [clienteSelecionado])

  function normalizarTelefone(valor: string | null | undefined): string {
    if (!valor) return ""
    return String(valor)
  }

  function normalizarCep(valor: string | null | undefined): string {
    if (!valor) return ""
    const dig = String(valor).replace(/\D/g, "").slice(0, 8)
    if (dig.length <= 5) return dig
    return `${dig.slice(0, 5)}-${dig.slice(5)}`
  }

  function getFormFromDados(dados: any) {
    const email = (Array.isArray(dados?.emails) ? dados?.emails?.[0] : dados?.email) || ""
    const telArray = Array.isArray(dados?.telefones) ? dados?.telefones : []
    const telefone = telArray?.[0]?.numero || telArray?.[0] || dados?.telefone || ""
    return {
      basicos: {
        nome: dados?.nome || "",
        cpf: dados?.cpf || "",
        data_nascimento: dados?.data_nascimento ? String(dados.data_nascimento).slice(0, 10) : "",
        parentesco: dados?.parentesco || "",
        cpf_titular: dados?.cpf_titular || "",
      },
      contato: {
        email: email || "",
        telefone: normalizarTelefone(telefone),
        cep: normalizarCep(dados?.cep),
        cidade: dados?.cidade || "",
        estado: dados?.estado || "",
        bairro: dados?.bairro || "",
        logradouro: dados?.logradouro || dados?.endereco || "",
        numero: dados?.numero || "",
        complemento: dados?.complemento || "",
      },
    }
  }

  async function carregarContexto() {
    try {
      setLoading(true)
      const adm = getAdministradoraLogada()
      if (!adm?.id) throw new Error("Administradora não encontrada")

      const corretoresRes = await fetch(`/api/administradora/corretores?administradora_id=${encodeURIComponent(adm.id)}`)
      const corretoresData = await corretoresRes.json().catch(() => [])
      setCorretores(Array.isArray(corretoresData) ? corretoresData.map((c: any) => ({ id: String(c.id), nome: String(c.nome || "") })) : [])

      const g = await GruposBeneficiariosService.buscarPorId(grupoId)
      setGrupo(g)

      const { supabase } = await import("@/lib/supabase")
      const qAdmin = adm?.id ? `&administradora_id=${encodeURIComponent(adm.id)}` : ""
      const [vinculosRes, vidasRes] = await Promise.all([
        supabase.from("clientes_grupos").select("*").eq("grupo_id", grupoId),
        fetch(`/api/administradora/vidas-importadas?grupo_id=${encodeURIComponent(grupoId)}${qAdmin}`).then((r) =>
          r.json().catch(() => [])
        ),
      ])
      const vinculos = vinculosRes.data || []
      const vidas = Array.isArray(vidasRes) ? vidasRes : []
      const vidaPorClienteAdmId = new Map<string, any>()
      for (const v of vidas) {
        const caId = String(v?.cliente_administradora_id || "").trim()
        if (!caId) continue
        const atual = vidaPorClienteAdmId.get(caId)
        if (!atual || String(atual?.tipo || "").toLowerCase() === "dependente") {
          vidaPorClienteAdmId.set(caId, v)
        }
      }

      const clientesCompletos = await Promise.all(
        vinculos.map(async (vinculo: any) => {
          if (vinculo.cliente_tipo === "proposta") {
            const { data: proposta } = await supabase.from("propostas").select("*").eq("id", vinculo.cliente_id).single()
            const ativo = ["aprovada", "assinada", "finalizada"].includes(String(proposta?.status || "").toLowerCase())
            return { ...vinculo, cliente: proposta, situacao: ativo ? "Ativo" : "Inativo" }
          }
          const { data: clienteAdm } = await supabase.from("clientes_administradoras").select("*").eq("id", vinculo.cliente_id).single()
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

          const cliente = {
            ...(propostaVinculada || {}),
            ...(clienteAdm || {}),
            ...(vwCliente || {}),
            nome:
              propostaVinculada?.nome ||
              clienteAdm?.nome ||
              clienteAdm?.razao_social ||
              clienteAdm?.nome_fantasia ||
              vwCliente?.cliente_nome ||
              null,
            cpf: propostaVinculada?.cpf || clienteAdm?.cpf || vwCliente?.cliente_cpf || null,
            email: propostaVinculada?.email || clienteAdm?.email || vwCliente?.cliente_email || null,
          }
          const vidaFallback = vidaPorClienteAdmId.get(String(vinculo.cliente_id || ""))
          if (!cliente.nome && vidaFallback?.nome) cliente.nome = String(vidaFallback.nome)
          if (!cliente.cpf && vidaFallback?.cpf) cliente.cpf = String(vidaFallback.cpf)
          if (!cliente.email) {
            const emailVida = Array.isArray(vidaFallback?.emails) ? vidaFallback?.emails?.[0] : null
            if (emailVida) cliente.email = String(emailVida)
          }

          const ativo = String(clienteAdm?.status || "").toLowerCase() === "ativo"
          return { ...vinculo, cliente, situacao: ativo ? "Ativo" : "Inativo" }
        })
      )

      const vidasComoClientes = vidas.map((v: any) => ({
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
          dados_adicionais: v.dados_adicionais,
        },
        situacao: v.ativo !== false ? "Ativo" : "Inativo",
        _vida: { ...v, valor_mensal: v.valor_mensal },
      }))

      const usaVidasImportadasComoFontePrincipal = vidasComoClientes.length > 0
      const itens = usaVidasImportadasComoFontePrincipal
        ? vidasComoClientes
        : clientesCompletos.filter((c: any) => c.cliente)
      const item = itens.find((i: any) =>
        beneficiarioId.startsWith("vida-")
          ? i.cliente_tipo === "vida_importada" && i.id === beneficiarioId.replace(/^vida-/, "")
          : i.id === beneficiarioId.replace(/^vinculo-/, "")
      )
      if (!item) throw new Error("Beneficiário não encontrado")
      setClienteSelecionado(item)

      if (item.cliente_tipo === "vida_importada") {
        const v = item._vida || item.cliente
        if (v?.tipo === "titular" && v?.cpf) {
          const { data: deps } = await supabase
            .from("vidas_importadas")
            .select("id, nome, cpf, tipo, data_nascimento, parentesco")
            .eq("grupo_id", grupoId)
            .eq("cpf_titular", String(v.cpf).replace(/\D/g, ""))
            .eq("tipo", "dependente")
          setDependentes(deps || [])
        }
        if (v?.produto_id) {
          const [{ data: contr }, pRes] = await Promise.all([
            supabase.from("produtos_contrato_administradora").select("contrato_id").eq("id", v.produto_id).single(),
            fetch(`/api/administradora/produto/${v.produto_id}`).then((r) => r.json().catch(() => null)),
          ])
          if (contr?.contrato_id) {
            const { data: c } = await supabase.from("contratos_administradora").select("*").eq("id", contr.contrato_id).single()
            setContrato(c)
          }
          if (pRes && !pRes.error) setProdutoCliente(pRes)
        }
        const histRes = await fetch(`/api/administradora/vidas-importadas/${item.id}/historico`)
        const hist = await histRes.json().catch(() => [])
        setHistorico(Array.isArray(hist) ? hist : [])

        const clienteAdmId = await resolverClienteAdministradoraIdVida(v, adm.id)
        if (clienteAdmId) {
          await carregarFaturas(clienteAdmId, adm.id)
        }
      } else {
        const propostaId = item.cliente_tipo === "proposta" ? item.cliente_id : item.cliente?.proposta_id
        if (propostaId) {
          const { data: deps } = await supabase.from("dependentes").select("id, nome, cpf, data_nascimento, parentesco").eq("proposta_id", propostaId)
          setDependentes(deps || [])
        }
        let clienteAdmId = item.cliente_tipo === "cliente_administradora" ? item.cliente_id : null
        if (!clienteAdmId && propostaId) {
          const { data: ca } = await supabase
            .from("clientes_administradoras")
            .select("id, numero_contrato, data_vigencia, valor_mensal")
            .eq("proposta_id", propostaId)
            .eq("administradora_id", adm.id)
            .single()
          clienteAdmId = ca?.id
          if (ca) setContrato(ca)
        } else if (clienteAdmId) {
          const { data: ca } = await supabase
            .from("clientes_administradoras")
            .select("numero_contrato, data_vigencia, valor_mensal")
            .eq("id", clienteAdmId)
            .single()
          if (ca) setContrato(ca)
        }
        if (clienteAdmId) await carregarFaturas(clienteAdmId, adm.id)
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar beneficiário")
    } finally {
      setLoading(false)
    }
  }

  async function carregarFaturas(clienteAdmId: string, admId: string) {
    const res = await fetch(
      `/api/administradora/fatura/faturas-cliente?cliente_administradora_id=${encodeURIComponent(clienteAdmId)}&administradora_id=${encodeURIComponent(admId)}`
    )
    const data = await res.json().catch(() => [])
    setFaturas(Array.isArray(data) ? data : data?.error ? [] : [])
  }

  async function resolverClienteAdministradoraIdVida(vida: any, administradoraId: string): Promise<string | null> {
    const idDireto = vida?.cliente_administradora_id
    if (idDireto) return String(idDireto)

    const { supabase } = await import("@/lib/supabase")
    const cpfVida = String(vida?.cpf || "").replace(/\D/g, "")
    if (!cpfVida) return null

    // Fallback por CPF da proposta no escopo da administradora
    const { data: propostas } = await supabase
      .from("propostas")
      .select("id")
      .eq("cpf", cpfVida)
      .limit(1)
    const propostaId = propostas?.[0]?.id
    if (!propostaId) return null

    const { data: clientesAdm } = await supabase
      .from("clientes_administradoras")
      .select("id")
      .eq("proposta_id", propostaId)
      .eq("administradora_id", administradoraId)
      .limit(1)

    return clientesAdm?.[0]?.id || null
  }

  async function handleExcluirFatura(faturaId: string) {
    const adm = getAdministradoraLogada()
    if (!adm?.id) return
    const confirmar = window.confirm("Tem certeza que deseja excluir este boleto/fatura?")
    if (!confirmar) return
    try {
      setExcluindoFaturaId(faturaId)
      const res = await fetch(`/api/administradora/fatura/${encodeURIComponent(faturaId)}?administradora_id=${encodeURIComponent(adm.id)}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erro ao excluir fatura")
      setFaturas((prev) => prev.filter((f) => f.id !== faturaId))
      if (data?.warning) {
        adicionarAlertaSistema({
          titulo: "Ação manual no gateway necessária",
          mensagem: data.warning,
          tipo: "warning",
        })
        toast.warning(data.warning)
      }
      toast.success("Fatura excluída com sucesso.")
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir fatura")
    } finally {
      setExcluindoFaturaId(null)
    }
  }

  useEffect(() => {
    if (grupoId && beneficiarioId) carregarContexto()
  }, [grupoId, beneficiarioId])

  useEffect(() => {
    if (searchParams.get("aba") === "financeiro") setTabAtiva("financeiro")
  }, [searchParams])

  useEffect(() => {
    if (!clienteSelecionado || tabAtiva !== "financeiro") return
    const adm = getAdministradoraLogada()
    if (!adm?.id) return

    let clienteAdmId: string | null = null
    if (clienteSelecionado.cliente_tipo === "cliente_administradora") {
      clienteAdmId = clienteSelecionado.cliente_id
    } else {
      clienteAdmId = clienteSelecionado?.cliente?.id || null
    }

    if (clienteSelecionado.cliente_tipo === "vida_importada") {
      const vida = clienteSelecionado?._vida || clienteSelecionado?.cliente
      let ativo = true
      const setup = async () => {
        const idResolvido = await resolverClienteAdministradoraIdVida(vida, adm.id)
        if (!idResolvido || !ativo) return
        const refresh = () => carregarFaturas(idResolvido, adm.id)
        refresh()
        const intervalId = window.setInterval(refresh, 45000)
        const onVisibility = () => {
          if (document.visibilityState === "visible") refresh()
        }
        document.addEventListener("visibilitychange", onVisibility)
        return () => {
          clearInterval(intervalId)
          document.removeEventListener("visibilitychange", onVisibility)
        }
      }

      let cleanup: (() => void) | undefined
      setup().then((c) => {
        cleanup = c
      })

      return () => {
        ativo = false
        if (cleanup) cleanup()
      }
    }

    if (!clienteAdmId) return

    const refresh = () => carregarFaturas(clienteAdmId as string, adm.id)
    const intervalId = window.setInterval(refresh, 45000)
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(intervalId)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [clienteSelecionado, tabAtiva])

  useEffect(() => {
    if (!clienteSelecionado) return
    const dados = clienteSelecionado.cliente_tipo === "vida_importada"
      ? (clienteSelecionado._vida || clienteSelecionado.cliente)
      : clienteSelecionado.cliente
    const form = getFormFromDados(dados)
    setFormDadosBasicos(form.basicos)
    setFormContato(form.contato)
    setEditandoDadosBasicos(false)
    setEditandoContato(false)
  }, [clienteSelecionado])

  async function buscarCep() {
    try {
      const cepDigitos = String(formContato.cep || "").replace(/\D/g, "")
      if (cepDigitos.length !== 8) {
        toast.error("Informe um CEP válido com 8 dígitos.")
        return
      }
      setBuscandoCep(true)
      const res = await fetch(`https://viacep.com.br/ws/${cepDigitos}/json/`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.erro) throw new Error("CEP não encontrado")
      setFormContato((prev) => ({
        ...prev,
        cep: normalizarCep(cepDigitos),
        logradouro: data?.logradouro || prev.logradouro,
        bairro: data?.bairro || prev.bairro,
        cidade: data?.localidade || prev.cidade,
        estado: String(data?.uf || prev.estado || "").toUpperCase(),
      }))
      toast.success("Endereço preenchido pelo CEP.")
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível consultar o CEP.")
    } finally {
      setBuscandoCep(false)
    }
  }

  async function salvarEdicao() {
    if (!clienteSelecionado) return
    const adm = getAdministradoraLogada()
    if (!adm?.id) {
      toast.error("Administradora não identificada.")
      return
    }

    try {
      setSalvandoEdicao(true)
      const payloadBasicos = {
        nome: formDadosBasicos.nome.trim(),
        cpf: formDadosBasicos.cpf.replace(/\D/g, ""),
        data_nascimento: formDadosBasicos.data_nascimento || null,
        parentesco: formDadosBasicos.parentesco || null,
        cpf_titular: formDadosBasicos.cpf_titular ? formDadosBasicos.cpf_titular.replace(/\D/g, "") : null,
      }
      const payloadContato = {
        email: formContato.email.trim(),
        telefone: formContato.telefone.trim(),
        cep: formContato.cep.replace(/\D/g, ""),
        cidade: formContato.cidade.trim(),
        estado: formContato.estado.trim().toUpperCase(),
        bairro: formContato.bairro.trim(),
        logradouro: formContato.logradouro.trim(),
        numero: formContato.numero.trim(),
        complemento: formContato.complemento.trim(),
      }

      if (clienteSelecionado.cliente_tipo === "vida_importada") {
        const vidaId = clienteSelecionado.id
        const res = await fetch(`/api/administradora/vidas-importadas/${encodeURIComponent(vidaId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payloadBasicos,
            ...payloadContato,
            emails: payloadContato.email ? [payloadContato.email] : [],
            telefones: payloadContato.telefone ? [{ numero: payloadContato.telefone }] : [],
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Erro ao salvar alterações")
      } else {
        const propostaId = clienteSelecionado.cliente_tipo === "proposta"
          ? clienteSelecionado.cliente_id
          : clienteSelecionado?.cliente?.proposta_id
        if (!propostaId) {
          throw new Error("Este beneficiário não possui proposta vinculada para edição.")
        }
        const res = await fetch("/api/administradora/beneficiarios/atualizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            administradora_id: adm.id,
            proposta_id: propostaId,
            dados_basicos: payloadBasicos,
            contato: payloadContato,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || "Erro ao salvar alterações")
      }

      toast.success("Dados do beneficiário atualizados com sucesso.")
      setEditandoDadosBasicos(false)
      setEditandoContato(false)
      await carregarContexto()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar edição")
    } finally {
      setSalvandoEdicao(false)
    }
  }

  async function resolverClienteAdministradoraIdAtual(administradoraId: string): Promise<string | null> {
    if (!clienteSelecionado) return null
    if (clienteSelecionado.cliente_tipo === "cliente_administradora") {
      return String(clienteSelecionado.cliente_id)
    }
    if (clienteSelecionado.cliente_tipo === "proposta") {
      const propostaId = String(clienteSelecionado.cliente_id || "")
      if (!propostaId) return null
      const { supabase } = await import("@/lib/supabase")
      const { data } = await supabase
        .from("clientes_administradoras")
        .select("id")
        .eq("proposta_id", propostaId)
        .eq("administradora_id", administradoraId)
        .limit(1)
      return data?.[0]?.id || null
    }
    const vida = clienteSelecionado._vida || clienteSelecionado.cliente
    return resolverClienteAdministradoraIdVida(vida, administradoraId)
  }

  async function salvarCorretorBeneficiario() {
    const adm = getAdministradoraLogada()
    if (!adm?.id || !clienteSelecionado) {
      toast.error("Administradora não identificada.")
      return
    }
    const corretorIdFinal = normalizarCorretorId(corretorSelecionadoId)
    const corretorIdAtual = obterCorretorIdAtual()
    if ((corretorIdAtual || null) === (corretorIdFinal || null)) {
      setModalCorretorOpen(false)
      return
    }

    try {
      setSalvandoCorretor(true)
      let res: Response
      if (clienteSelecionado.cliente_tipo === "vida_importada") {
        res = await fetch(`/api/administradora/vidas-importadas/${encodeURIComponent(clienteSelecionado.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            administradora_id: adm.id,
            corretor_id: corretorIdFinal,
          }),
        })
      } else {
        const clienteAdmId = await resolverClienteAdministradoraIdAtual(adm.id)
        if (!clienteAdmId) throw new Error("Cliente da administradora não encontrado para este beneficiário.")
        res = await fetch(`/api/administradora/clientes/${encodeURIComponent(clienteAdmId)}`, {
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
      toast.success(corretorIdFinal ? "Corretor atualizado com sucesso." : "Vínculo de corretor removido.")
      setModalCorretorOpen(false)
      await carregarContexto()
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar corretor")
    } finally {
      setSalvandoCorretor(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  if (!grupo || !clienteSelecionado) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Beneficiário não encontrado</p>
        <Button onClick={() => router.push(`/administradora/grupos-beneficiarios/${grupoId}`)} className="mt-4">
          Voltar ao grupo
        </Button>
      </div>
    )
  }

  const d = clienteSelecionado.cliente_tipo === "vida_importada" ? (clienteSelecionado._vida || clienteSelecionado.cliente) : clienteSelecionado.cliente

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">
              {d?.nome || "Beneficiário"}
            </h1>
            <p className="text-gray-600 mt-1 font-medium">{grupo.nome}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => router.push(`/administradora/grupos-beneficiarios/${grupoId}`)}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-4 py-2 h-10 shadow-lg rounded"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao grupo
            </Button>
          </div>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Informações do Beneficiário</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="w-full">
            <TabsList className="flex w-full max-w-full gap-1 mb-3 sm:mb-4 overflow-x-auto overflow-y-hidden flex-nowrap min-w-0 py-1 [&>button]:flex-1 [&>button]:min-w-[4.5rem] [&>button]:shrink-0 [&>button]:text-xs [&>button]:whitespace-nowrap">
              <TabsTrigger value="dados-basicos">Dados Básicos</TabsTrigger>
              <TabsTrigger value="contato">Contato</TabsTrigger>
              <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="contrato">Contrato</TabsTrigger>
              <TabsTrigger value="coparticipacao">Coparticipação</TabsTrigger>
              {clienteSelecionado.cliente_tipo === "vida_importada" && <TabsTrigger value="historico">Histórico</TabsTrigger>}
            </TabsList>

            <TabsContent value="dados-basicos" className="space-y-4">
              {clienteSelecionado.cliente_tipo === "vida_importada" && getTipoItem(clienteSelecionado) === "dependente" && (() => {
                const cpfTit = String((clienteSelecionado._vida?.cpf_titular ?? clienteSelecionado.cliente?.cpf_titular ?? "")).replace(/\D/g, "")
                const vinculado = cpfTit.length >= 11 && titularesDoGrupo.some((t: any) => t.cpf === cpfTit)
                if (vinculado) return null
                return (
                  <div className="mb-4 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex flex-wrap items-center gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span className="flex-1 min-w-0">
                      Este dependente não está vinculado a um titular. Edite o cadastro para vincular.
                    </span>
                  </div>
                )
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-50">
                  <span className="text-gray-500 block text-xs font-medium">Nome</span>
                  {editandoDadosBasicos ? (
                    <Input value={formDadosBasicos.nome} onChange={(e) => setFormDadosBasicos((p) => ({ ...p, nome: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{d?.nome || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-gray-50">
                  <span className="text-gray-500 block text-xs font-medium">Grupo de Beneficiário</span>
                  <span className="text-gray-900">{grupo?.nome || "-"}</span>
                </div>
                <div className="p-3 bg-white">
                  <span className="text-gray-500 block text-xs font-medium">Tipo</span>
                  <span className="text-gray-900">{(d as any)?.tipo === "dependente" ? "Dependente" : "Titular"}</span>
                </div>
                <div className="p-3 bg-white">
                  <span className="text-gray-500 block text-xs font-medium">CPF</span>
                  {editandoDadosBasicos ? (
                    <Input value={formDadosBasicos.cpf} onChange={(e) => setFormDadosBasicos((p) => ({ ...p, cpf: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{formatarCpf(d?.cpf) || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-gray-50">
                  <span className="text-gray-500 block text-xs font-medium">Data de Nascimento</span>
                  {editandoDadosBasicos ? (
                    <Input type="date" value={formDadosBasicos.data_nascimento} onChange={(e) => setFormDadosBasicos((p) => ({ ...p, data_nascimento: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{d?.data_nascimento ? String(d.data_nascimento).slice(0, 10) : "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-gray-50">
                  <span className="text-gray-500 block text-xs font-medium">Idade</span>
                  <span className="text-gray-900">{d?.idade != null && d?.idade !== "" ? String(d.idade) : "-"}</span>
                </div>
                <div className="p-3 bg-white">
                  <span className="text-gray-500 block text-xs font-medium">Parentesco</span>
                  {editandoDadosBasicos ? (
                    <Input value={formDadosBasicos.parentesco} onChange={(e) => setFormDadosBasicos((p) => ({ ...p, parentesco: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{(d as any)?.parentesco || "-"}</span>
                  )}
                </div>
                {((clienteSelecionado.cliente_tipo === "vida_importada" && (d as any)?.tipo === "dependente") || (d as any)?.cpf_titular) && (
                  <div className="p-3 bg-white">
                    <span className="text-gray-500 block text-xs font-medium">CPF do Titular</span>
                    {editandoDadosBasicos ? (
                      <Input value={formDadosBasicos.cpf_titular} onChange={(e) => setFormDadosBasicos((p) => ({ ...p, cpf_titular: e.target.value }))} className="h-9 mt-1" />
                    ) : (
                      <span className="text-gray-900">{formatarCpf((d as any)?.cpf_titular) || "-"}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                {!editandoDadosBasicos ? (
                  <Button variant="outline" size="sm" onClick={() => setEditandoDadosBasicos(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Editar dados básicos
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => {
                      const form = getFormFromDados(d)
                      setFormDadosBasicos(form.basicos)
                      setEditandoDadosBasicos(false)
                    }}>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={salvarEdicao} disabled={salvandoEdicao}>
                      {salvandoEdicao && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      {!salvandoEdicao && <Save className="h-3.5 w-3.5 mr-1" />}
                      Salvar
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contato" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-50">
                  <span className="text-gray-500 block text-xs font-medium">E-mail</span>
                  {editandoContato ? (
                    <Input value={formContato.email} onChange={(e) => setFormContato((p) => ({ ...p, email: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{(Array.isArray(d?.emails) ? d?.emails?.[0] : d?.email) || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-gray-50">
                  <span className="text-gray-500 block text-xs font-medium">Telefone</span>
                  {editandoContato ? (
                    <Input value={formContato.telefone} onChange={(e) => setFormContato((p) => ({ ...p, telefone: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{(Array.isArray(d?.telefones) ? d?.telefones?.[0]?.numero : d?.telefone) || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-white">
                  <span className="text-gray-500 block text-xs font-medium">CEP</span>
                  {editandoContato ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Input value={formContato.cep} onChange={(e) => setFormContato((p) => ({ ...p, cep: e.target.value }))} className="h-9" />
                      <Button type="button" variant="outline" size="sm" className="h-9" onClick={buscarCep} disabled={buscandoCep}>
                        {buscandoCep && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                        {!buscandoCep && "Buscar CEP"}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-900">{d?.cep || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-white">
                  <span className="text-gray-500 block text-xs font-medium">Cidade</span>
                  {editandoContato ? (
                    <Input value={formContato.cidade} onChange={(e) => setFormContato((p) => ({ ...p, cidade: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{d?.cidade || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-gray-50">
                  <span className="text-gray-500 block text-xs font-medium">Estado</span>
                  {editandoContato ? (
                    <Input value={formContato.estado} onChange={(e) => setFormContato((p) => ({ ...p, estado: e.target.value.toUpperCase() }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{d?.estado || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-gray-50">
                  <span className="text-gray-500 block text-xs font-medium">Bairro</span>
                  {editandoContato ? (
                    <Input value={formContato.bairro} onChange={(e) => setFormContato((p) => ({ ...p, bairro: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{d?.bairro || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-white">
                  <span className="text-gray-500 block text-xs font-medium">Logradouro</span>
                  {editandoContato ? (
                    <Input value={formContato.logradouro} onChange={(e) => setFormContato((p) => ({ ...p, logradouro: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{d?.logradouro || d?.endereco || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-white">
                  <span className="text-gray-500 block text-xs font-medium">Número</span>
                  {editandoContato ? (
                    <Input value={formContato.numero} onChange={(e) => setFormContato((p) => ({ ...p, numero: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{d?.numero || "-"}</span>
                  )}
                </div>
                <div className="p-3 bg-gray-50">
                  <span className="text-gray-500 block text-xs font-medium">Complemento</span>
                  {editandoContato ? (
                    <Input value={formContato.complemento} onChange={(e) => setFormContato((p) => ({ ...p, complemento: e.target.value }))} className="h-9 mt-1" />
                  ) : (
                    <span className="text-gray-900">{d?.complemento || "-"}</span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                {!editandoContato ? (
                  <Button variant="outline" size="sm" onClick={() => setEditandoContato(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Editar contato/endereço
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => {
                      const form = getFormFromDados(d)
                      setFormContato(form.contato)
                      setEditandoContato(false)
                    }}>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={salvarEdicao} disabled={salvandoEdicao}>
                      {salvandoEdicao && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      {!salvandoEdicao && <Save className="h-3.5 w-3.5 mr-1" />}
                      Salvar
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="dependentes" className="space-y-4">
              {dependentes.length > 0 ? (
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
                    {dependentes.map((dep: any, i: number) => (
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
              {faturas.length > 0 ? (
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
                    {faturas.map((f: any, i: number) => {
                      const valorF = f.valor_total ?? f.valor
                      const vencF = f.data_vencimento ?? f.vencimento
                      const boletoUrl = f.boleto_link ?? f.asaas_boleto_url ?? f.boleto_url
                      return (
                        <TableRow key={f.id} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <TableCell>{f.numero_fatura || "-"}</TableCell>
                          <TableCell>{formatarMoeda(Number(valorF ?? 0))}</TableCell>
                          <TableCell>{vencF ? formatarData(String(vencF).slice(0, 10)) : "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {f.status || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {boletoUrl && (
                                <>
                                  <Button variant="outline" size="sm" className="h-8" asChild>
                                    <a href={boletoUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                      Visualizar
                                    </a>
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-8" asChild>
                                    <a href={boletoUrl} target="_blank" rel="noopener noreferrer" download={`boleto-${f.numero_fatura || f.id}.pdf`}>
                                      <Download className="h-3.5 w-3.5 mr-1" />
                                      Baixar
                                    </a>
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => handleExcluirFatura(f.id)}
                                disabled={excluindoFaturaId === f.id}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                {excluindoFaturaId === f.id ? "Excluindo..." : "Excluir"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-gray-500">Nenhuma fatura vinculada.</p>
              )}
            </TabsContent>

            <TabsContent value="contrato" className="space-y-4">
              {contrato || produtoCliente || valorProdutoCliente != null ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 text-sm border border-gray-200 rounded-lg overflow-hidden">
                    {[
                      { label: "Número", val: contrato?.numero || contrato?.numero_contrato || "-" },
                      { label: "Data Vigência", val: contrato?.data_vigencia ? String(contrato.data_vigencia).slice(0, 10) : "-" },
                      { label: "Valor Mensal", val: (valorProdutoCliente ?? contrato?.valor_mensal) != null ? `R$ ${Number(valorProdutoCliente ?? contrato?.valor_mensal).toFixed(2)}` : "-" },
                      { label: "Produto vinculado", val: produtoCliente?.nome || "-" },
                      { label: "Corretor", val: obterNomeCorretorAtual() },
                    ].map((c, i) => (
                      <div key={`${c.label}-${i}`} className={`p-3 ${Math.floor(i / 2) % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                        <span className="text-gray-500 block text-xs font-medium">{c.label}</span>
                        <span className="text-gray-900">{c.val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const atual = obterCorretorIdAtual()
                        setCorretorSelecionadoId(atual || "__nenhum__")
                        setModalCorretorOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      {obterCorretorIdAtual() ? "Trocar corretor" : "Vincular corretor"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Nenhum contrato vinculado.</p>
              )}
            </TabsContent>

            <TabsContent value="coparticipacao" className="space-y-4">
              <p className="text-sm text-gray-500">Módulo de coparticipação em desenvolvimento.</p>
            </TabsContent>

            {clienteSelecionado.cliente_tipo === "vida_importada" && (
              <TabsContent value="historico" className="space-y-4">
                {historico.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Últimas alterações registradas:</p>
                    {historico.map((h: any) => (
                      <Card key={h.id}>
                        <CardContent className="p-4">
                          <div className="text-xs text-gray-500 mb-2">
                            {h.created_at ? new Date(h.created_at).toLocaleString("pt-BR") : "-"}
                          </div>
                          <div className="space-y-2 text-sm">
                            {h.alteracoes &&
                              typeof h.alteracoes === "object" &&
                              Object.entries(h.alteracoes).map(([campo, v]: [string, any]) => (
                                <div key={campo} className="flex gap-2 flex-wrap">
                                  <span className="font-medium text-gray-600 capitalize">{campo.replace(/_/g, " ")}:</span>
                                  <span className="text-red-600 line-through">{v?.antes != null ? String(v.antes) : "-"}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-green-700">{v?.depois != null ? String(v.depois) : "-"}</span>
                                </div>
                              ))}
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
        </CardContent>
      </Card>

      <Dialog open={modalCorretorOpen} onOpenChange={setModalCorretorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{obterCorretorIdAtual() ? "Trocar corretor" : "Vincular corretor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Beneficiário: <span className="font-medium text-gray-900">{d?.nome || "—"}</span>
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
            <Button onClick={salvarCorretorBeneficiario} disabled={salvandoCorretor}>
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
    </div>
  )
}

