"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { formatarMoeda } from "@/utils/formatters"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Download, Search, FileText, User, Calendar, Filter, X, Archive, FileDigit } from "lucide-react"
import { downloadPropostaComDocumentos } from "@/services/download-service"
import { gerarPDFCompleto } from "@/services/pdf-completo-service"
import FileSaver from "file-saver"

export default function PropostasDigitaisPage() {
  const [propostas, setPropostas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [propostaDetalhada, setPropostaDetalhada] = useState(null)
  const [dependentes, setDependentes] = useState([])
  const [questionario, setQuestionario] = useState([])
  const [documentos, setDocumentos] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [pdfCompletoLoading, setPdfCompletoLoading] = useState(false)

  useEffect(() => {
    // Detectar se é dispositivo móvel
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  useEffect(() => {
    carregarPropostas()
  }, [])

  async function carregarPropostas() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("propostas").select("*").order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setPropostas(data || [])
    } catch (error) {
      console.error("Erro ao carregar propostas:", error)
      toast.error("Erro ao carregar propostas")
    } finally {
      setLoading(false)
    }
  }

  async function carregarDetalhesProposta(id) {
    try {
      // Carregar dependentes
      const { data: dependentesData, error: dependentesError } = await supabase
        .from("dependentes")
        .select("*")
        .eq("proposta_id", id)
        .order("created_at", { ascending: true })

      if (dependentesError) throw dependentesError
      setDependentes(dependentesData || [])

      // Carregar questionário de saúde
      const { data: questionarioData, error: questionarioError } = await supabase
        .from("questionario_saude")
        .select("*")
        .eq("proposta_id", id)
        .order("pergunta_id", { ascending: true })

      if (questionarioError) throw questionarioError
      setQuestionario(questionarioData || [])

      // Obter URLs de documentos da proposta
      const proposta = propostas.find((p) => p.id === id)
      if (proposta && proposta.documentos_urls) {
        setDocumentos(proposta.documentos_urls)
      } else {
        setDocumentos({})
      }

      setShowModal(true)
    } catch (error) {
      console.error("Erro ao carregar detalhes da proposta:", error)
      toast.error("Erro ao carregar detalhes da proposta")
    }
  }

  function abrirDetalhes(proposta) {
    setPropostaDetalhada(proposta)
    carregarDetalhesProposta(proposta.id)
  }

  async function atualizarStatusProposta(id, novoStatus) {
    try {
      const { error } = await supabase.from("propostas").update({ status: novoStatus }).eq("id", id)

      if (error) throw error

      toast.success(`Status da proposta atualizado para ${novoStatus}`)

      // Atualizar a lista de propostas
      setPropostas(propostas.map((p) => (p.id === id ? { ...p, status: novoStatus } : p)))

      // Atualizar a proposta detalhada se estiver aberta
      if (propostaDetalhada && propostaDetalhada.id === id) {
        setPropostaDetalhada({ ...propostaDetalhada, status: novoStatus })
      }
    } catch (error) {
      console.error("Erro ao atualizar status da proposta:", error)
      toast.error("Erro ao atualizar status da proposta")
    }
  }

  async function baixarTodosDocumentos(proposta) {
    try {
      setDownloadLoading(true)

      // Verificar se a proposta tem PDF
      if (!proposta.pdf_url) {
        toast.error("PDF da proposta não disponível")
        return
      }

      // Obter documentos da proposta
      let docs = proposta.documentos_urls || {}

      // Se não tiver documentos no objeto proposta, buscar do estado
      if (Object.keys(docs).length === 0 && propostaDetalhada && propostaDetalhada.id === proposta.id) {
        docs = documentos
      }

      // Se ainda não tiver documentos, buscar do banco de dados
      if (Object.keys(docs).length === 0) {
        // Buscar proposta completa para obter documentos
        const { data, error } = await supabase
          .from("propostas")
          .select("documentos_urls")
          .eq("id", proposta.id)
          .single()

        if (error) throw error
        if (data && data.documentos_urls) {
          docs = data.documentos_urls
        }
      }

      await downloadPropostaComDocumentos(proposta.id, proposta.nome_cliente, docs, proposta.pdf_url)

      toast.success("Download iniciado com sucesso")
    } catch (error) {
      console.error("Erro ao baixar documentos:", error)
      toast.error("Erro ao baixar documentos")
    } finally {
      setDownloadLoading(false)
    }
  }

  async function gerarPDFCompletoComDocumentos(proposta) {
    try {
      setPdfCompletoLoading(true)

      // Verificar se a proposta tem PDF
      if (!proposta.pdf_url) {
        toast.error("PDF da proposta não disponível")
        return
      }

      // Obter documentos da proposta
      let docs = proposta.documentos_urls || {}

      // Se não tiver documentos no objeto proposta, buscar do estado
      if (Object.keys(docs).length === 0 && propostaDetalhada && propostaDetalhada.id === proposta.id) {
        docs = documentos
      }

      // Se ainda não tiver documentos, buscar do banco de dados
      if (Object.keys(docs).length === 0) {
        // Buscar proposta completa para obter documentos
        const { data, error } = await supabase
          .from("propostas")
          .select("documentos_urls")
          .eq("id", proposta.id)
          .single()

        if (error) throw error
        if (data && data.documentos_urls) {
          docs = data.documentos_urls
        }
      }

      // Gerar o PDF completo
      const pdfBlob = await gerarPDFCompleto(proposta.id, proposta.nome_cliente, docs, proposta.pdf_url)

      // Formatar o nome do cliente para o nome do arquivo
      const nomeFormatado = proposta.nome_cliente
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")

      // Salvar o PDF
      FileSaver.saveAs(pdfBlob, `Proposta_Completa_${nomeFormatado}_${proposta.id.substring(0, 8)}.pdf`)

      toast.success("PDF completo gerado com sucesso")
    } catch (error) {
      console.error("Erro ao gerar PDF completo:", error)
      toast.error("Erro ao gerar PDF completo")
    } finally {
      setPdfCompletoLoading(false)
    }
  }

  const propostasFiltradas = propostas.filter((proposta) => {
    const matchFiltro =
      proposta.nome_cliente?.toLowerCase().includes(filtro.toLowerCase()) ||
      proposta.corretor_nome?.toLowerCase().includes(filtro.toLowerCase()) ||
      proposta.sigla_plano?.toLowerCase().includes(filtro.toLowerCase())

    if (statusFiltro === "todos") return matchFiltro
    return matchFiltro && proposta.status === statusFiltro
  })

  const formatarData = (dataString) => {
    const data = new Date(dataString)
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pendente":
        return "bg-yellow-100 text-yellow-800"
      case "aprovada":
        return "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
      case "rejeitada":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "pendente":
        return "Pendente"
      case "aprovada":
        return "Aprovada"
      case "rejeitada":
        return "Rejeitada"
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Propostas Digitais" description="Gerencie as propostas digitais enviadas pelos clientes." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">Total de Propostas</p>
          <p className="text-2xl font-bold">{propostas.length}</p>
        </Card>
        <Card className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">Pendentes de Análise</p>
          <p className="text-2xl font-bold text-amber-600">{propostas.filter((p) => p.status === "pendente").length}</p>
        </Card>
        <Card className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600">Valor Total Aprovado</p>
          <p className="text-2xl font-bold text-[#0F172A]">
            {formatarMoeda(
              propostas.filter((p) => p.status === "aprovada").reduce((acc, p) => acc + Number(p.valor || 0), 0),
            )}
          </p>
        </Card>
      </div>

      <Card className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between mb-6">
          <h2 className="text-lg font-semibold mb-4 md:mb-0">Lista de Propostas Digitais</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Buscar por nome, corretor ou plano..."
                className="pl-9 w-full"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="pl-9 w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="aprovada">Aprovadas</SelectItem>
                  <SelectItem value="rejeitada">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Versão para desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 text-left">Cliente</th>
                    <th className="py-3 px-4 text-left">Corretor</th>
                    <th className="py-3 px-4 text-left">Plano</th>
                    <th className="py-3 px-4 text-left">Valor</th>
                    <th className="py-3 px-4 text-left">Data</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {propostasFiltradas.length > 0 ? (
                    propostasFiltradas.map((proposta) => (
                      <tr key={proposta.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{proposta.nome_cliente}</td>
                        <td className="py-3 px-4">{proposta.corretor_nome || "Direto"}</td>
                        <td className="py-3 px-4">{proposta.sigla_plano || "N/A"}</td>
                        <td className="py-3 px-4">{formatarMoeda(proposta.valor || 0)}</td>
                        <td className="py-3 px-4">{formatarData(proposta.created_at)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(proposta.status)}`}>
                            {getStatusLabel(proposta.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => abrirDetalhes(proposta)}
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>

                            {proposta.pdf_url && (
                              <>
                                <Button
                                  onClick={() => window.open(proposta.pdf_url, "_blank")}
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </Button>

                                <Button
                                  onClick={() => baixarTodosDocumentos(proposta)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#0F172A] hover:text-[#0F172A] hover:bg-[#7BD9F6] bg-opacity-20"
                                  disabled={downloadLoading}
                                >
                                  <Archive className="h-4 w-4 mr-1" />
                                  Docs ZIP
                                </Button>

                                <Button
                                  onClick={() => gerarPDFCompletoComDocumentos(proposta)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                  disabled={pdfCompletoLoading}
                                >
                                  <FileDigit className="h-4 w-4 mr-1" />
                                  PDF Completo
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-gray-500">
                        Nenhuma proposta encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Versão para mobile (cards) */}
            <div className="md:hidden space-y-4">
              {propostasFiltradas.length > 0 ? (
                propostasFiltradas.map((proposta) => (
                  <Card key={proposta.id} className="p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">{proposta.nome_cliente}</h3>
                        <p className="text-sm text-gray-500">{formatarData(proposta.created_at)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(proposta.status)}`}>
                        {getStatusLabel(proposta.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Corretor</p>
                        <p className="text-sm">{proposta.corretor_nome || "Direto"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Plano</p>
                        <p className="text-sm">{proposta.sigla_plano || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Valor</p>
                        <p className="text-sm font-medium">{formatarMoeda(proposta.valor || 0)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <Button
                        onClick={() => abrirDetalhes(proposta)}
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 justify-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>

                      {proposta.pdf_url && (
                        <>
                          <Button
                            onClick={() => window.open(proposta.pdf_url, "_blank")}
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 justify-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>

                          <Button
                            onClick={() => baixarTodosDocumentos(proposta)}
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-[#0F172A] hover:text-[#0F172A] hover:bg-[#7BD9F6] bg-opacity-20 justify-center"
                            disabled={downloadLoading}
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            Baixar Docs (ZIP)
                          </Button>

                          <Button
                            onClick={() => gerarPDFCompletoComDocumentos(proposta)}
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 justify-center"
                            disabled={pdfCompletoLoading}
                          >
                            <FileDigit className="h-4 w-4 mr-1" />
                            {pdfCompletoLoading ? "Gerando PDF..." : "PDF Completo com Docs"}
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-4 text-center text-gray-500">Nenhuma proposta encontrada</div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Modal de Detalhes - Versão responsiva */}
      {propostaDetalhada && showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full h-full md:h-auto md:w-full md:max-w-4xl md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b">
              <h3 className="text-lg md:text-xl font-semibold">Proposta #{propostaDetalhada.id.substring(0, 8)}</h3>
              <Button
                onClick={() => setShowModal(false)}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 p-1 h-auto"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 flex flex-col">
                  <div className="flex items-center mb-2">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">Data de Envio</span>
                  </div>
                  <span className="text-base md:text-lg">{formatarData(propostaDetalhada.created_at)}</span>
                </Card>

                <Card className="p-4 flex flex-col">
                  <div className="flex items-center mb-2">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">Corretor</span>
                  </div>
                  <span className="text-base md:text-lg">{propostaDetalhada.corretor_nome || "Direto"}</span>
                </Card>

                <Card className="p-4 flex flex-col">
                  <div className="flex items-center mb-2">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs mr-2 ${getStatusBadgeClass(propostaDetalhada.status)}`}
                    >
                      {getStatusLabel(propostaDetalhada.status)}
                    </span>

                    <Select
                      value={propostaDetalhada.status}
                      onValueChange={(value) => atualizarStatusProposta(propostaDetalhada.id, value)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Alterar status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="aprovada">Aprovar</SelectItem>
                        <SelectItem value="rejeitada">Rejeitar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium mb-3 border-b pb-2">Dados do Plano</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Cobertura</p>
                      <p className="font-medium">{propostaDetalhada.cobertura}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Acomodação</p>
                      <p className="font-medium">{propostaDetalhada.acomodacao}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Código do Plano</p>
                      <p className="font-medium">{propostaDetalhada.sigla_plano}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valor</p>
                      <p className="font-medium">{formatarMoeda(propostaDetalhada.valor || 0)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-3 border-b pb-2">Dados do Titular</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Nome</p>
                      <p className="font-medium">{propostaDetalhada.nome_cliente}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">CPF</p>
                      <p className="font-medium">{propostaDetalhada.cpf}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">RG</p>
                      <p className="font-medium">{propostaDetalhada.rg}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Data de Nascimento</p>
                      <p className="font-medium">{propostaDetalhada.data_nascimento}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{propostaDetalhada.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Telefone</p>
                      <p className="font-medium">{propostaDetalhada.telefone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Endereço</p>
                      <p className="font-medium">{propostaDetalhada.endereco}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cidade/UF</p>
                      <p className="font-medium">
                        {propostaDetalhada.cidade}/{propostaDetalhada.estado}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">CEP</p>
                      <p className="font-medium">{propostaDetalhada.cep}</p>
                    </div>
                  </div>
                </div>

                {dependentes.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium mb-3 border-b pb-2">Dependentes</h4>
                    <div className="space-y-4">
                      {dependentes.map((dep, index) => (
                        <Card key={dep.id} className="p-4">
                          <h5 className="font-medium mb-2">Dependente {index + 1}</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm text-gray-500">Nome</p>
                              <p className="font-medium">{dep.nome}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">CPF</p>
                              <p className="font-medium">{dep.cpf}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">RG</p>
                              <p className="font-medium">{dep.rg}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Data de Nascimento</p>
                              <p className="font-medium">{dep.data_nascimento}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Parentesco</p>
                              <p className="font-medium">{dep.parentesco}</p>
                            </div>
                            {dep.cns && (
                              <div>
                                <p className="text-sm text-gray-500">CNS</p>
                                <p className="font-medium">{dep.cns}</p>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-md font-medium mb-3 border-b pb-2">Dados de Saúde</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Peso</p>
                      <p className="font-medium">{propostaDetalhada.peso} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Altura</p>
                      <p className="font-medium">{propostaDetalhada.altura} cm</p>
                    </div>
                  </div>

                  {questionario.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Questionário de Saúde</h5>
                      <Card className="p-4">
                        <div className="space-y-3">
                          {questionario
                            .filter((q) => q.resposta === "Sim")
                            .map((q) => (
                              <div key={q.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                                <p className="font-medium">{q.pergunta}</p>
                                {q.observacao && <p className="text-sm text-gray-600 mt-1">Obs: {q.observacao}</p>}
                              </div>
                            ))}

                          {questionario.filter((q) => q.resposta === "Sim").length === 0 && (
                            <p className="text-gray-500">Nenhuma condição de saúde reportada.</p>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}
                </div>

                {Object.keys(documentos).length > 0 && (
                  <div>
                    <h4 className="text-md font-medium mb-3 border-b pb-2">Documentos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(documentos).map(([key, url]) => (
                        <Card key={key} className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {key === "rg_frente"
                                  ? "RG (Frente)"
                                  : key === "rg_verso"
                                    ? "RG (Verso)"
                                    : key === "cpf"
                                      ? "CPF"
                                      : key === "comprovante_residencia"
                                        ? "Comprovante de Residência"
                                        : key === "cns"
                                          ? "Cartão Nacional de Saúde"
                                          : key}
                              </p>
                            </div>
                            <Button onClick={() => window.open(url as string, "_blank")} variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Visualizar
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col md:flex-row gap-3 justify-center">
                  {propostaDetalhada.pdf_url && (
                    <>
                      <Button
                        onClick={() => window.open(propostaDetalhada.pdf_url, "_blank")}
                        className="bg-[#0F172A] hover:bg-[#1E293B] w-full md:w-auto"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Visualizar Proposta
                      </Button>

                      <Button
                        onClick={() => baixarTodosDocumentos(propostaDetalhada)}
                        className="bg-[#0F172A] hover:bg-[#0F172A] w-full md:w-auto"
                        disabled={downloadLoading}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        {downloadLoading ? "Baixando..." : "Baixar Docs (ZIP)"}
                      </Button>

                      <Button
                        onClick={() => gerarPDFCompletoComDocumentos(propostaDetalhada)}
                        className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto"
                        disabled={pdfCompletoLoading}
                      >
                        <FileDigit className="h-4 w-4 mr-2" />
                        {pdfCompletoLoading ? "Gerando..." : "PDF Completo com Docs"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
