"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, X, Eye, Link2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import {
  buscarTabelasPrecos,
  criarTabelaPreco,
  atualizarTabelaPreco,
  buscarTabelaPrecoDetalhada,
  adicionarFaixaEtaria,
  vincularTabelaProduto,
  buscarTabelasPrecosPorProduto,
} from "@/services/tabelas-service"
import type { TabelaPreco } from "@/types/tabelas"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OperadorasService } from "@/services/operadoras-service"
import { EntidadesService } from "@/services/entidades-service"
import { AdministradorasService } from "@/services/administradoras-service"
import { obterProdutosCorretores } from "@/services/produtos-corretores-service"
import { buscarCorretores } from "@/services/corretores-service"
import { supabase } from "@/lib/supabase"
import type { TabelaPrecoDetalhada } from "@/types/tabelas"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import ModalNovaTabela from "@/components/admin/modals/modal-nova-tabela"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function TabelasAdminPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredTabelas, setFilteredTabelas] = useState<TabelaPreco[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [modalNovaTabelaOpen, setModalNovaTabelaOpen] = useState(false)
  const [savingTabela, setSavingTabela] = useState(false)
  const [editingTabela, setEditingTabela] = useState<TabelaPreco | null>(null)
  const [formData, setFormData] = useState({
    nome: "",
    data: new Date().toISOString().split("T")[0],
    operadora_id: "",
    entidade_id: "",
    subestipulante_id: "",
    tipo_plano: "",
    segmentacao: "",
    corretora: "",
    descricao: "",
    abrangencia: "",
    ativo: true,
  })

  const [faixasEtarias, setFaixasEtarias] = useState<{ faixa_etaria: string; valor: string }[]>([
    { faixa_etaria: "0-18", valor: "" },
    { faixa_etaria: "19-23", valor: "" },
    { faixa_etaria: "24-28", valor: "" },
    { faixa_etaria: "29-33", valor: "" },
    { faixa_etaria: "34-38", valor: "" },
    { faixa_etaria: "39-43", valor: "" },
    { faixa_etaria: "44-48", valor: "" },
    { faixa_etaria: "49-53", valor: "" },
    { faixa_etaria: "54-58", valor: "" },
    { faixa_etaria: "59+", valor: "" },
  ])

  // Estados para vinculação
  const [operadoras, setOperadoras] = useState<any[]>([])
  const [administradoras, setAdministradoras] = useState<any[]>([])
  const [entidades, setEntidades] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [modalVincularOpen, setModalVincularOpen] = useState(false)
  const [tabelaSelecionada, setTabelaSelecionada] = useState<TabelaPreco | null>(null)
  const [tipoVinculo, setTipoVinculo] = useState<"operadora" | "administradora" | "entidade">("operadora")
  const [entidadeSelecionada, setEntidadeSelecionada] = useState<string>("")
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<any[]>([])
  const [produtosSelecionados, setProdutosSelecionados] = useState<string[]>([])
  const [segmentacaoVinculo, setSegmentacaoVinculo] = useState("Padrão")

  useEffect(() => {
    carregarTabelas()
    carregarDadosVinculacao()
    carregarDadosFormulario()
  }, [])

  async function carregarDadosFormulario() {
    try {
      const [operadorasData, entidadesData] = await Promise.all([
        OperadorasService.buscarTodas().catch(() => []),
        EntidadesService.buscarTodas().catch(() => []),
      ])
      setOperadoras(operadorasData)
      setEntidades(entidadesData)
    } catch (error) {
      console.error("Erro ao carregar dados do formulário:", error)
    }
  }

  useEffect(() => {
    if (tabelaSelecionada && tipoVinculo && entidadeSelecionada) {
      filtrarProdutos()
    }
  }, [tipoVinculo, entidadeSelecionada, produtos])

  async function carregarDadosVinculacao() {
    try {
      const [operadorasData, administradorasData, entidadesData, produtosData] = await Promise.all([
        OperadorasService.buscarTodas().catch(() => []),
        AdministradorasService.buscarTodas().catch(() => []),
        EntidadesService.buscarTodas().catch(() => []),
        obterProdutosCorretores().catch(() => []),
      ])
      setOperadoras(operadorasData)
      setAdministradoras(administradorasData)
      setEntidades(entidadesData)
      setProdutos(produtosData)
    } catch (error) {
      console.error("Erro ao carregar dados para vinculação:", error)
    }
  }

  function filtrarProdutos() {
    let produtosFiltrados: any[] = []

    if (tipoVinculo === "operadora") {
      const operadora = operadoras.find((o) => o.id === entidadeSelecionada)
      produtosFiltrados = produtos.filter((p) => p.operadora === operadora?.nome)
    } else if (tipoVinculo === "administradora") {
      const administradora = administradoras.find((a) => a.id === entidadeSelecionada)
      produtosFiltrados = produtos.filter((p) => p.operadora === administradora?.nome || p.administradora_id === administradora?.id)
    } else if (tipoVinculo === "entidade") {
      const entidade = entidades.find((e) => e.id === entidadeSelecionada)
      produtosFiltrados = produtos.filter((p) => p.entidade_id === entidade?.id || p.entidade_sigla === entidade?.sigla)
    }

    setProdutosDisponiveis(produtosFiltrados)
  }

  function abrirModalVincular(tabela: TabelaPreco) {
    setTabelaSelecionada(tabela)
    setTipoVinculo("operadora")
    setEntidadeSelecionada("")
    setProdutosSelecionados([])
    setSegmentacaoVinculo("Padrão")
    setModalVincularOpen(true)
  }

  async function handleVincular() {
    if (!tabelaSelecionada || !entidadeSelecionada || produtosSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione uma entidade e pelo menos um produto",
        variant: "destructive",
      })
      return
    }

    try {
      for (const produtoId of produtosSelecionados) {
        await vincularTabelaProduto(produtoId, tabelaSelecionada.id, segmentacaoVinculo)
      }
      toast({
        title: "Sucesso",
        description: `${produtosSelecionados.length} produto(s) vinculado(s) com sucesso!`,
      })
      setModalVincularOpen(false)
      carregarTabelas()
    } catch (error: any) {
      console.error("Erro ao vincular:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao vincular produtos",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTabelas(tabelas)
    } else {
      const filtered = tabelas.filter(
        (tabela) =>
          tabela.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (tabela.operadora && tabela.operadora.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (tabela.segmentacao && tabela.segmentacao.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      setFilteredTabelas(filtered)
    }
  }, [searchTerm, tabelas])

  async function carregarTabelas() {
    try {
      setLoading(true)
      const data = await buscarTabelasPrecos()
      setTabelas(data)
      setFilteredTabelas(data)
    } catch (error) {
      console.error("Erro ao carregar tabelas:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as tabelas de preços",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (tabela?: TabelaPreco) => {
    if (tabela) {
      // Para edição, ainda usar o Dialog antigo
      setEditingTabela(tabela)
      const operadoraEncontrada = operadoras.find((op) => op.nome === tabela.operadora)
      setFormData({
        nome: tabela.titulo,
        data: tabela.data || new Date().toISOString().split("T")[0],
        operadora_id: operadoraEncontrada?.id || "",
        entidade_id: (tabela as any).entidade_id || "",
        subestipulante_id: (tabela as any).subestipulante_id || "",
        tipo_plano: tabela.tipo_plano || "",
        segmentacao: tabela.segmentacao || "",
        corretora: tabela.corretora || "",
        descricao: tabela.descricao || "",
        abrangencia: tabela.abrangencia || "",
        ativo: tabela.ativo,
      })
      carregarFaixasEtarias(tabela.id)
      setDialogOpen(true)
    } else {
      // Para nova tabela, usar o modal moderno
      setModalNovaTabelaOpen(true)
    }
  }

  const handleSalvarNovaTabela = async (dados: any) => {
    try {
      setSavingTabela(true)

      // Criar a tabela
      const tabelaCriada = await criarTabelaPreco({
        titulo: dados.nome,
        operadora: dados.operadora,
        operadora_id: dados.operadora_id,
        segmentacao: dados.acomodacao || dados.segmentacao,
        data: dados.data_fechamento,
        data_fechamento: dados.data_fechamento,
        data_vencimento: dados.data_vencimento,
        data_vigencia: dados.data_vigencia,
        ativo: true,
      })

      // Vincular o produto automaticamente
      if (dados.produto_id && tabelaCriada.id) {
        try {
          await vincularTabelaProduto(dados.produto_id, tabelaCriada.id, "Padrão")
        } catch (error) {
          console.error("Erro ao vincular produto:", error)
          // Não falhar a criação da tabela se a vinculação falhar
        }
      }

      toast({
        title: "Sucesso",
        description: "Tabela de preços criada com sucesso! O produto foi vinculado automaticamente.",
      })

      await carregarTabelas()
      setModalNovaTabelaOpen(false)
    } catch (error: any) {
      console.error("Erro ao criar tabela:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a tabela de preços",
        variant: "destructive",
      })
    } finally {
      setSavingTabela(false)
    }
  }

  const carregarFaixasEtarias = async (tabelaId: string | number) => {
    try {
      const { faixas } = await buscarTabelaPrecoDetalhada(tabelaId)
      // Se existirem faixas, atualizar o estado
      if (faixas.length > 0) {
        const faixasFormatadas = faixas.map((faixa) => ({
          faixa_etaria: faixa.faixa_etaria,
          valor: faixa.valor.toString(),
        }))
        setFaixasEtarias(faixasFormatadas)
      }
    } catch (error) {
      console.error("Erro ao carregar faixas etárias:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as faixas etárias",
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, ativo: checked }))
  }

  const handleFaixaEtariaChange = (index: number, value: string) => {
    const novasFaixas = [...faixasEtarias]
    novasFaixas[index].valor = value
    setFaixasEtarias(novasFaixas)
  }

  const handleAddFaixaEtaria = () => {
    setFaixasEtarias([...faixasEtarias, { faixa_etaria: "", valor: "" }])
  }

  const handleRemoveFaixaEtaria = (index: number) => {
    const novasFaixas = [...faixasEtarias]
    novasFaixas.splice(index, 1)
    setFaixasEtarias(novasFaixas)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Validar campos obrigatórios
      if (!formData.nome || !formData.data || !formData.operadora_id || !formData.entidade_id) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos obrigatórios (Nome, Data, Operadora e Entidade)",
          variant: "destructive",
        })
        return
      }

      // Buscar nome da operadora e entidade
      const operadoraSelecionada = operadoras.find((op) => op.id === formData.operadora_id)
      const entidadeSelecionada = entidades.find((ent) => ent.id === formData.entidade_id)

      // Preparar dados para salvar
      const dadosParaSalvar = {
        titulo: formData.nome,
        operadora: operadoraSelecionada?.nome || "",
        operadora_id: formData.operadora_id,
        entidade_id: formData.entidade_id,
        subestipulante_id: formData.subestipulante_id,
        data: formData.data,
        tipo_plano: formData.tipo_plano,
        segmentacao: formData.segmentacao,
        ativo: true,
      }

      if (editingTabela) {
        // Atualizar tabela existente
        await atualizarTabelaPreco(editingTabela.id, dadosParaSalvar)

        toast({
          title: "Sucesso",
          description: "Tabela de preços atualizada com sucesso",
        })
      } else {
        // Criar nova tabela
        await criarTabelaPreco(dadosParaSalvar)

        toast({
          title: "Sucesso",
          description: "Tabela de preços criada com sucesso",
        })
      }

      // Recarregar tabelas e fechar diálogo
      await carregarTabelas()
      setDialogOpen(false)
    } catch (error) {
      console.error("Erro ao salvar tabela:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a tabela de preços",
        variant: "destructive",
      })
    }
  }

  const handleToggleStatus = async (id: string | number, ativo: boolean) => {
    try {
      await atualizarTabelaPreco(id, { ativo: !ativo })
      toast({
        title: "Sucesso",
        description: `Tabela de preços ${!ativo ? "ativada" : "desativada"} com sucesso`,
      })
      await carregarTabelas()
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da tabela",
        variant: "destructive",
      })
    }
  }

  // Estados para modal de visualização
  const [modalVisualizarOpen, setModalVisualizarOpen] = useState(false)
  const [tabelaVisualizar, setTabelaVisualizar] = useState<TabelaPrecoDetalhada | null>(null)
  const [produtosVinculados, setProdutosVinculados] = useState<any[]>([])
  const [gestores, setGestores] = useState<any[]>([])
  const [autorizacoes, setAutorizacoes] = useState<Record<string, boolean>>({})
  const [loadingVisualizar, setLoadingVisualizar] = useState(false)

  const handleVisualizarTabela = async (id: string | number) => {
    try {
      setLoadingVisualizar(true)
      setModalVisualizarOpen(true)
      
      console.log("🔍 Carregando tabela:", id)
      
      // Buscar dados detalhados da tabela
      const dadosTabela = await buscarTabelaPrecoDetalhada(id)
      console.log("✅ Dados da tabela carregados:", dadosTabela)
      setTabelaVisualizar(dadosTabela)
      
      // Buscar produtos vinculados
      await carregarProdutosVinculados(id)
      
      // Buscar gestores e autorizações
      await carregarGestoresEAutorizacoes(id)
    } catch (error) {
      console.error("❌ Erro ao carregar tabela:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da tabela",
        variant: "destructive",
      })
    } finally {
      setLoadingVisualizar(false)
    }
  }

  async function carregarProdutosVinculados(tabelaId: string | number) {
    try {
      const tenantId = await getCurrentTenantId()
      console.log("🔍 Buscando produtos vinculados para tabela:", tabelaId, "tenant:", tenantId)
      
      const { data, error } = await supabase
        .from("produto_tabela_relacao")
        .select(`
          id,
          produto_id,
          segmentacao,
          produtos_corretores (
            id,
            nome,
            operadora
          )
        `)
        .eq("tabela_id", tabelaId)
        .eq("tenant_id", tenantId)

      if (error) {
        console.error("❌ Erro ao buscar produtos vinculados:", error)
        throw error
      }

      console.log("✅ Produtos vinculados encontrados:", data)

      // Buscar faixas etárias para cada produto
      const produtosComFaixas = await Promise.all(
        (data || []).map(async (relacao: any) => {
          const { data: faixas, error: faixasError } = await supabase
            .from("tabelas_precos_faixas")
            .select("*")
            .eq("tabela_id", tabelaId)
            .eq("tenant_id", tenantId)
            .order("faixa_etaria", { ascending: true })

          if (faixasError) {
            console.error("❌ Erro ao buscar faixas:", faixasError)
          }

          return {
            ...relacao,
            faixas: faixas || [],
          }
        })
      )

      console.log("✅ Produtos com faixas:", produtosComFaixas)
      setProdutosVinculados(produtosComFaixas)
    } catch (error) {
      console.error("❌ Erro ao carregar produtos vinculados:", error)
      setProdutosVinculados([])
    }
  }

  async function carregarGestoresEAutorizacoes(tabelaId: string | number) {
    try {
      const todosCorretores = await buscarCorretores()
      const gestoresFiltrados = todosCorretores.filter(
        (corretor) => corretor.is_gestor || corretor.link_cadastro_equipe
      )
      setGestores(gestoresFiltrados)

      // Buscar autorizações existentes
      const tenantId = await getCurrentTenantId()
      const { data: autorizacoesData } = await supabase
        .from("tabela_corretora_autorizacao")
        .select("corretora_id")
        .eq("tabela_id", tabelaId)
        .eq("tenant_id", tenantId)

      const autorizacoesMap: Record<string, boolean> = {}
      gestoresFiltrados.forEach((gestor) => {
        // Converter gestor.id para número se necessário (corretora_id é BIGINT)
        const gestorIdNum = typeof gestor.id === 'string' ? Number.parseInt(gestor.id, 10) : gestor.id
        autorizacoesMap[gestor.id] = autorizacoesData?.some((a) => Number(a.corretora_id) === gestorIdNum) || false
      })
      setAutorizacoes(autorizacoesMap)
    } catch (error) {
      console.error("Erro ao carregar gestores:", error)
      setGestores([])
    }
  }

  async function toggleAutorizacaoTabela(corretoraId: string, autorizado: boolean) {
    try {
      if (!tabelaVisualizar) return

      const tenantId = await getCurrentTenantId()
      // Converter corretoraId para número (corretora_id é BIGINT no banco)
      const corretoraIdNum = Number.parseInt(corretoraId, 10)

      if (autorizado) {
        // Adicionar autorização
        const { error } = await supabase
          .from("tabela_corretora_autorizacao")
          .insert({
            tabela_id: tabelaVisualizar.tabela.id,
            corretora_id: corretoraIdNum,
            tenant_id: tenantId,
          })

        if (error) throw error
      } else {
        // Remover autorização
        const { error } = await supabase
          .from("tabela_corretora_autorizacao")
          .delete()
          .eq("tabela_id", tabelaVisualizar.tabela.id)
          .eq("corretora_id", corretoraIdNum)
          .eq("tenant_id", tenantId)

        if (error) throw error
      }

      setAutorizacoes((prev) => ({ ...prev, [corretoraId]: autorizado }))
      toast({
        title: "Sucesso",
        description: autorizado
          ? "Autorização concedida com sucesso"
          : "Autorização revogada com sucesso",
      })
    } catch (error: any) {
      console.error("Erro ao atualizar autorização:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar autorização",
        variant: "destructive",
      })
    }
  }

  const handleEditarTabela = (id: string | number) => {
    router.push(`/admin/tabelas/${id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Tabelas de Preços</h1>
            <p className="text-gray-600 mt-1 font-medium">Gerencie as tabelas de preços e vincule a produtos de operadoras, administradoras e entidades</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="gerenciar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gerenciar">Gerenciar Tabelas</TabsTrigger>
          <TabsTrigger value="vincular">Vincular a Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="gerenciar" className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar tabelas..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button onClick={() => handleOpenDialog()} className="bg-[#0F172A] hover:bg-[#1E293B]">
          <Plus className="mr-2 h-4 w-4" />
          Nova Tabela
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-center">
            <div className="loading-corporate mx-auto"></div>
            <span className="block mt-4 loading-text-corporate">Carregando tabelas...</span>
            <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tabelas de Preços</CardTitle>
            <CardDescription>Gerencie as tabelas de preços disponíveis para os corretores</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTabelas.length === 0 ? (
              <div className="text-center py-10">
                <h3 className="text-lg font-semibold">Nenhuma tabela encontrada</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchTerm
                    ? "Não encontramos tabelas correspondentes à sua busca."
                    : "Clique em 'Nova Tabela' para adicionar uma tabela de preços."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Título</TableHead>
                    <TableHead className="font-bold">Operadora</TableHead>
                    <TableHead className="font-bold">Acomodação</TableHead>
                    <TableHead className="hidden md:table-cell font-bold">Status</TableHead>
                    <TableHead className="hidden md:table-cell font-bold">Atualização</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTabelas.map((tabela) => (
                    <TableRow key={tabela.id}>
                      <TableCell className="font-medium">{tabela.titulo}</TableCell>
                      <TableCell>{tabela.operadora || "-"}</TableCell>
                      <TableCell>{tabela.segmentacao || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={tabela.ativo ? "default" : "secondary"}
                            className={
                              tabela.ativo
                                ? "bg-green-100 text-green-800 border-green-300 font-semibold"
                                : "bg-gray-100 text-gray-600 border-gray-300 font-semibold"
                            }
                          >
                            {tabela.ativo ? "Ativa" : "Inativa"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(tabela.id, tabela.ativo)}
                            className="h-6 text-xs"
                            title={tabela.ativo ? "Desativar tabela" : "Ativar tabela"}
                          >
                            {tabela.ativo ? "Desativar" : "Ativar"}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {tabela.updated_at ? new Date(tabela.updated_at).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleVisualizarTabela(tabela.id)}
                            title="Visualizar tabela"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenDialog(tabela)}
                            title="Editar tabela"
                          >
                            <Edit className="h-4 w-4" />
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
      )}
        </TabsContent>

        <TabsContent value="vincular" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vincular Tabelas a Produtos</CardTitle>
              <CardDescription>
                Selecione uma tabela e vincule a produtos de operadoras, administradoras ou entidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              ) : filteredTabelas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma tabela cadastrada. Crie uma tabela primeiro na aba "Gerenciar Tabelas".
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Título</TableHead>
                        <TableHead className="font-bold">Operadora</TableHead>
                        <TableHead className="font-bold">Acomodação</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                        <TableHead className="text-right font-bold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTabelas.map((tabela) => (
                        <TableRow key={tabela.id}>
                          <TableCell className="font-medium">{tabela.titulo}</TableCell>
                          <TableCell>{tabela.operadora || "-"}</TableCell>
                          <TableCell>{tabela.segmentacao || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={tabela.ativo ? "default" : "secondary"}
                              className={
                                tabela.ativo
                                  ? "bg-green-100 text-green-800 border-green-300 font-semibold"
                                  : "bg-gray-100 text-gray-600 border-gray-300 font-semibold"
                              }
                            >
                              {tabela.ativo ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirModalVincular(tabela)}
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              Vincular
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTabela ? "Editar Tabela de Preços" : "Nova Tabela de Preços"}</DialogTitle>
            <DialogDescription>
              {editingTabela
                ? "Atualize as informações da tabela de preços"
                : "Preencha as informações para criar uma nova tabela de preços"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="font-bold">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Nome da tabela"
                    required
                    className="border-2 border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data" className="font-bold">
                    Data <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="data"
                    name="data"
                    type="date"
                    value={formData.data}
                    onChange={handleInputChange}
                    required
                    className="border-2 border-gray-300"
                  />
                </div>
              </div>

                <div className="space-y-2">
                <Label htmlFor="operadora_id" className="font-bold">
                  Operadora <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.operadora_id}
                  onValueChange={(value) => setFormData({ ...formData, operadora_id: value })}
                  required
                >
                  <SelectTrigger className="border-2 border-gray-300">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {operadoras.map((operadora) => (
                      <SelectItem key={operadora.id} value={operadora.id}>
                        {operadora.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>

                <div className="space-y-2">
                <Label htmlFor="entidade_id" className="font-bold">
                  Entidade <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.entidade_id}
                  onValueChange={(value) => setFormData({ ...formData, entidade_id: value })}
                  required
                >
                  <SelectTrigger className="border-2 border-gray-300">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {entidades.map((entidade) => (
                      <SelectItem key={entidade.id} value={entidade.id}>
                        {entidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subestipulante_id" className="font-bold">
                  Subestipulante
                </Label>
                <Select
                  value={formData.subestipulante_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, subestipulante_id: value })}
                >
                  <SelectTrigger className="border-2 border-gray-300">
                    <SelectValue placeholder="Em breve - será implementado" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Por enquanto vazio, será implementado depois dentro de entidades */}
                  </SelectContent>
                </Select>
                </div>
              </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Vincular */}
      <Dialog open={modalVincularOpen} onOpenChange={setModalVincularOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">
              Vincular Tabela a Produtos
            </DialogTitle>
            <DialogDescription>
              Selecione o tipo de entidade e os produtos para vincular à tabela: {tabelaSelecionada?.titulo}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
              <div className="space-y-2">
              <Label htmlFor="tipo" className="font-bold">
                Tipo de Entidade <span className="text-red-500">*</span>
              </Label>
              <Select
                value={tipoVinculo}
                onValueChange={(value: any) => {
                  setTipoVinculo(value)
                  setEntidadeSelecionada("")
                  setProdutosSelecionados([])
                }}
              >
                <SelectTrigger className="border-2 border-gray-300">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operadora">Operadora</SelectItem>
                  <SelectItem value="administradora">Administradora</SelectItem>
                  <SelectItem value="entidade">Entidade</SelectItem>
                </SelectContent>
              </Select>
              </div>

              <div className="space-y-2">
              <Label htmlFor="entidade" className="font-bold">
                {tipoVinculo === "operadora"
                  ? "Operadora"
                  : tipoVinculo === "administradora"
                    ? "Administradora"
                    : "Entidade"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={entidadeSelecionada}
                onValueChange={setEntidadeSelecionada}
                disabled={!tipoVinculo}
              >
                <SelectTrigger className="border-2 border-gray-300">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tipoVinculo === "operadora" &&
                    operadoras.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.nome}
                      </SelectItem>
                    ))}
                  {tipoVinculo === "administradora" &&
                    administradoras.map((adm) => (
                      <SelectItem key={adm.id} value={adm.id}>
                        {adm.nome}
                      </SelectItem>
                    ))}
                  {tipoVinculo === "entidade" &&
                    entidades.map((ent) => (
                      <SelectItem key={ent.id} value={ent.id}>
                        {ent.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              </div>

            {entidadeSelecionada && (
              <>
              <div className="space-y-2">
                  <Label htmlFor="segmentacao" className="font-bold">
                    Segmentação <span className="text-red-500">*</span>
                  </Label>
                <Input
                    id="segmentacao"
                    value={segmentacaoVinculo}
                    onChange={(e) => setSegmentacaoVinculo(e.target.value)}
                    placeholder="Ex: Padrão, Individual, Familiar"
                    className="border-2 border-gray-300"
                  required
                />
              </div>

                <div className="space-y-2">
                  <Label className="font-bold">
                    Produtos Disponíveis <span className="text-red-500">*</span>
                  </Label>
                  <div className="border-2 border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
                    {produtosDisponiveis.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nenhum produto encontrado para esta entidade
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {produtosDisponiveis.map((produto) => (
                          <label
                            key={produto.id}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={produtosSelecionados.includes(produto.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setProdutosSelecionados([...produtosSelecionados, produto.id.toString()])
                                } else {
                                  setProdutosSelecionados(
                                    produtosSelecionados.filter((id) => id !== produto.id.toString())
                                  )
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{produto.nome}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
              </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalVincularOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
                  </Button>
            <Button
              onClick={handleVincular}
              disabled={!entidadeSelecionada || produtosSelecionados.length === 0}
              className="bg-[#0F172A] hover:bg-[#1E293B]"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Vincular Produtos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização com Abas */}
      <Dialog open={modalVisualizarOpen} onOpenChange={setModalVisualizarOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {loadingVisualizar ? (
            <div className="flex justify-center items-center h-64">
              <Spinner />
                </div>
          ) : tabelaVisualizar ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#0F172A]">
                  {tabelaVisualizar.tabela.titulo}
                </DialogTitle>
                <DialogDescription>
                  Visualize e gerencie informações, produtos vinculados e autorizações de corretoras
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="informacoes" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="informacoes">Informações</TabsTrigger>
                  <TabsTrigger value="produtos">Produtos</TabsTrigger>
                  <TabsTrigger value="corretoras">Corretoras</TabsTrigger>
                </TabsList>

                {/* Aba Informações */}
                <TabsContent value="informacoes" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dados da Tabela</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-bold">Nome</Label>
                          <p className="text-sm text-gray-600">{tabelaVisualizar.tabela.titulo}</p>
                        </div>
                        <div>
                          <Label className="font-bold">Data</Label>
                          <p className="text-sm text-gray-600">
                            {tabelaVisualizar.tabela.data
                              ? new Date(tabelaVisualizar.tabela.data).toLocaleDateString("pt-BR")
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <Label className="font-bold">Operadora</Label>
                          <p className="text-sm text-gray-600">
                            {operadoras.find((op) => op.id === (tabelaVisualizar.tabela as any).operadora_id)?.nome ||
                              tabelaVisualizar.tabela.operadora ||
                              "-"}
                          </p>
                        </div>
                        <div>
                          <Label className="font-bold">Entidade</Label>
                          <p className="text-sm text-gray-600">
                            {entidades.find((ent) => ent.id === (tabelaVisualizar.tabela as any).entidade_id)?.nome ||
                              "-"}
                          </p>
                        </div>
                        <div>
                          <Label className="font-bold">Status</Label>
                          <Badge variant={tabelaVisualizar.tabela.ativo ? "default" : "secondary"}>
                            {tabelaVisualizar.tabela.ativo ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <div>
                          <Label className="font-bold">Criada em</Label>
                          <p className="text-sm text-gray-600">
                            {tabelaVisualizar.tabela.created_at
                              ? new Date(tabelaVisualizar.tabela.created_at).toLocaleDateString("pt-BR")
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba Produtos */}
                <TabsContent value="produtos" className="space-y-4 mt-4">
                  {produtosVinculados.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-gray-500">
                        Nenhum produto vinculado a esta tabela
                      </CardContent>
                    </Card>
                  ) : (
                    produtosVinculados.map((produtoRelacao: any) => (
                      <Card key={produtoRelacao.id}>
                        <CardHeader>
                          <CardTitle>{produtoRelacao.produtos_corretores?.nome || "Produto sem nome"}</CardTitle>
                          <CardDescription>
                            Operadora: {produtoRelacao.produtos_corretores?.operadora || "-"} | Segmentação:{" "}
                            {produtoRelacao.segmentacao}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                <div className="space-y-2">
                            <Label className="font-bold">Faixas Etárias e Valores</Label>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Faixa Etária</TableHead>
                                  <TableHead className="text-right">Valor (R$)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {produtoRelacao.faixas && produtoRelacao.faixas.length > 0 ? (
                                  produtoRelacao.faixas.map((faixa: any, index: number) => (
                                    <TableRow key={faixa.id || index}>
                                      <TableCell>{faixa.faixa_etaria}</TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                                            value={faixa.valor || ""}
                                            onChange={async (e) => {
                                              const novoValor = e.target.value
                                              try {
                                                const tenantId = await getCurrentTenantId()
                                                const { error } = await supabase
                                                  .from("tabelas_precos_faixas")
                                                  .update({ valor: Number.parseFloat(novoValor) })
                                                  .eq("id", faixa.id)
                                                  .eq("tenant_id", tenantId)

                                                if (error) throw error

                                                // Atualizar estado local
                                                setProdutosVinculados((prev) =>
                                                  prev.map((prod) => {
                                                    if (prod.id === produtoRelacao.id) {
                                                      return {
                                                        ...prod,
                                                        faixas: prod.faixas.map((f: any) =>
                                                          f.id === faixa.id ? { ...f, valor: novoValor } : f
                                                        ),
                                                      }
                                                    }
                                                    return prod
                                                  })
                                                )

                                                toast({
                                                  title: "Sucesso",
                                                  description: "Valor atualizado com sucesso",
                                                })
                                              } catch (error: any) {
                                                console.error("Erro ao atualizar valor:", error)
                                                toast({
                                                  title: "Erro",
                                                  description: error.message || "Erro ao atualizar valor",
                                                  variant: "destructive",
                                                })
                                              }
                                            }}
                                            className="w-32 border-2 border-gray-300"
                        />
                      </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={2} className="text-center text-gray-500">
                                      Nenhuma faixa etária cadastrada
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                    </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* Aba Corretoras */}
                <TabsContent value="corretoras" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Autorização de Corretoras</CardTitle>
                      <CardDescription>
                        Marque as corretoras (gestores) que terão acesso a esta tabela. Corretores vinculados a gestores
                        autorizados também terão acesso.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {gestores.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Nenhuma corretora cadastrada</p>
                      ) : (
                        <div className="space-y-3">
                          {gestores.map((gestor) => (
                            <div
                              key={gestor.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex-1">
                                <p className="font-bold">{gestor.nome?.toUpperCase() || "-"}</p>
                                <p className="text-sm text-gray-600">{gestor.email}</p>
                </div>
                              <Switch
                                checked={autorizacoes[gestor.id] || false}
                                onCheckedChange={(checked) => toggleAutorizacaoTabela(gestor.id, checked)}
                              />
              </div>
                          ))}
            </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

            <DialogFooter>
                <Button variant="outline" onClick={() => setModalVisualizarOpen(false)}>
                  Fechar
              </Button>
            </DialogFooter>
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">Nenhuma tabela selecionada</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Moderno Nova Tabela */}
      <ModalNovaTabela
        isOpen={modalNovaTabelaOpen}
        onClose={() => setModalNovaTabelaOpen(false)}
        onSave={handleSalvarNovaTabela}
        saving={savingTabela}
      />
    </div>
  )
}
