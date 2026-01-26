"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/admin/page-header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatarMoeda } from "@/utils/formatters"
import { Eye, Download, Search, Filter, AlertTriangle, Archive, FileDigit } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { downloadPropostaComDocumentos } from "@/services/download-service"
import { gerarPDFCompleto } from "@/services/pdf-completo-service"
import FileSaver from "file-saver"
import { PdfDownloadButtons } from "@/components/pdf-utils/pdf-download-buttons"

export default function ContratosPage() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [isMobile, setIsMobile] = useState(false)
  const [error, setError] = useState(null)
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
    const fetchContratos = async () => {
      try {
        setLoading(true)
        setError(null)

        // Buscar apenas propostas digitais aprovadas
        const { data, error } = await supabase
          .from("propostas")
          .select("*")
          .eq("status", "aprovada")
          .order("created_at", { ascending: false })

        if (error) throw error

        // Formatar dados das propostas digitais para o formato de contratos
        const contratosFormatados = (data || []).map((proposta) => ({
          id: proposta.id,
          numero_contrato: `PD-${proposta.id.substring(0, 8)}`,
          nome_cliente: proposta.nome_cliente,
          plano: proposta.sigla_plano || "Não especificado",
          valor_mensal: Number.parseFloat(proposta.valor) || 0,
          data_inicio: proposta.created_at,
          status: "ativo",
          documento_url: proposta.pdf_url || null,
          corretor_nome: proposta.corretor_nome || "Direto",
          tipo: "digital",
          documentos_urls: proposta.documentos_urls || {},
        }))

        setContratos(contratosFormatados)
      } catch (error) {
        console.error("Erro ao buscar contratos:", error)
        setError({
          title: "Erro ao carregar contratos",
          message: "Ocorreu um erro ao buscar os contratos. Por favor, tente novamente mais tarde.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchContratos()
  }, [])

  async function baixarTodosDocumentos(contrato) {
    try {
      setDownloadLoading(true)

      // Verificar se o contrato tem PDF
      if (!contrato.documento_url) {
        toast.error("PDF do contrato não disponível")
        return
      }

      // Obter documentos do contrato
      let docs = contrato.documentos_urls || {}

      // Se não tiver documentos no objeto contrato, buscar do banco de dados
      if (Object.keys(docs).length === 0) {
        // Buscar proposta completa para obter documentos
        const { data, error } = await supabase
          .from("propostas")
          .select("documentos_urls")
          .eq("id", contrato.id)
          .single()

        if (error) throw error
        if (data && data.documentos_urls) {
          docs = data.documentos_urls
        }
      }

      await downloadPropostaComDocumentos(contrato.id, contrato.nome_cliente, docs, contrato.documento_url)

      toast.success("Download iniciado com sucesso")
    } catch (error) {
      console.error("Erro ao baixar documentos:", error)
      toast.error("Erro ao baixar documentos")
    } finally {
      setDownloadLoading(false)
    }
  }

  async function gerarPDFCompletoComDocumentos(contrato) {
    try {
      setPdfCompletoLoading(true)

      // Verificar se o contrato tem PDF
      if (!contrato.documento_url) {
        toast.error("PDF do contrato não disponível")
        return
      }

      // Obter documentos do contrato
      let docs = contrato.documentos_urls || {}

      // Se não tiver documentos no objeto contrato, buscar do banco de dados
      if (Object.keys(docs).length === 0) {
        // Buscar proposta completa para obter documentos
        const { data, error } = await supabase
          .from("propostas")
          .select("documentos_urls")
          .eq("id", contrato.id)
          .single()

        if (error) throw error
        if (data && data.documentos_urls) {
          docs = data.documentos_urls
        }
      }

      // Gerar o PDF completo
      const pdfBlob = await gerarPDFCompleto(contrato.id, contrato.nome_cliente, docs, contrato.documento_url)

      // Formatar o nome do cliente para o nome do arquivo
      const nomeFormatado = contrato.nome_cliente
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")

      // Salvar o PDF
      FileSaver.saveAs(pdfBlob, `Contrato_Completo_${nomeFormatado}_${contrato.id.substring(0, 8)}.pdf`)

      toast.success("PDF completo gerado com sucesso")
    } catch (error) {
      console.error("Erro ao gerar PDF completo:", error)
      toast.error("Erro ao gerar PDF completo")
    } finally {
      setPdfCompletoLoading(false)
    }
  }

  const contratosFiltrados = contratos.filter((contrato) => {
    const matchFiltro =
      contrato.nome_cliente?.toLowerCase().includes(filtro.toLowerCase()) ||
      contrato.numero_contrato?.toLowerCase().includes(filtro.toLowerCase()) ||
      contrato.plano?.toLowerCase().includes(filtro.toLowerCase()) ||
      contrato.corretor_nome?.toLowerCase().includes(filtro.toLowerCase())

    if (statusFiltro === "todos") return matchFiltro
    return matchFiltro && contrato.status === statusFiltro
  })

  const formatarData = (dataString) => {
    if (!dataString) return "N/A"
    const data = new Date(dataString)
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "ativo":
        return "bg-gray-100 text-[#0F172A]"
      case "pendente":
        return "bg-gray-100 text-yellow-600"
      case "cancelado":
        return "bg-gray-100 text-orange-600"
      case "suspenso":
        return "bg-gray-100 text-orange-600"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "ativo":
        return "ATIVO"
      case "pendente":
        return "PENDENTE"
      case "cancelado":
        return "CANCELADO"
      case "suspenso":
        return "SUSPENSO"
      default:
        return status
    }
  }

  const calcularValorMensalTotal = () => {
    return contratos.reduce((total, contrato) => total + Number(contrato.valor_mensal || 0), 0)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Contratos" description="Gerencie os contratos ativos de propostas aprovadas." />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-600">Total de Contratos</p>
              <p className="text-2xl font-bold">{contratos.length}</p>
            </Card>
            <Card className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-600">Contratos Ativos</p>
              <p className="text-2xl font-bold text-[#0F172A]">
                {contratos.filter((c) => c.status === "ativo").length}
              </p>
            </Card>
            <Card className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
              <p className="text-sm text-gray-600">Valor Mensal Total</p>
              <p className="text-2xl font-bold text-[#0F172A]">{formatarMoeda(calcularValorMensalTotal())}</p>
            </Card>
          </div>

          <Card className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between mb-6">
              <h2 className="text-lg font-semibold mb-4 md:mb-0">Lista de Contratos</h2>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome, número, plano ou corretor..."
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
                      <SelectItem value="ativo">Ativos</SelectItem>
                      <SelectItem value="pendente">Pendentes</SelectItem>
                      <SelectItem value="suspenso">Suspensos</SelectItem>
                      <SelectItem value="cancelado">Cancelados</SelectItem>
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
                        <th className="py-3 px-4 text-left">Nº Contrato</th>
                        <th className="py-3 px-4 text-left">Cliente</th>
                        <th className="py-3 px-4 text-left">Plano</th>
                        <th className="py-3 px-4 text-left">Corretor</th>
                        <th className="py-3 px-4 text-left">Valor Mensal</th>
                        <th className="py-3 px-4 text-left">Data Início</th>
                        <th className="py-3 px-4 text-left">Status</th>
                        <th className="py-3 px-4 text-left">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contratosFiltrados.length > 0 ? (
                        contratosFiltrados.map((contrato) => (
                          <tr key={contrato.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{contrato.numero_contrato || "-"}</td>
                            <td className="py-3 px-4">{contrato.nome_cliente}</td>
                            <td className="py-3 px-4">{contrato.plano}</td>
                            <td className="py-3 px-4">{contrato.corretor_nome}</td>
                            <td className="py-3 px-4">{formatarMoeda(contrato.valor_mensal || 0)}</td>
                            <td className="py-3 px-4">{formatarData(contrato.data_inicio)}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(contrato.status)}`}
                              >
                                {getStatusLabel(contrato.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-2">
                                <PdfDownloadButtons
                                  propostaId={contrato.id}
                                  nomeCliente={contrato.nome_cliente || "Cliente"}
                                  pdfUrl={contrato.pdf_url || ""}
                                  documentosUrls={contrato.documentos_urls || {}}
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-4 text-center text-gray-500">
                            Nenhum contrato encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Versão para mobile (cards) */}
                <div className="md:hidden space-y-4">
                  {contratosFiltrados.length > 0 ? (
                    contratosFiltrados.map((contrato) => (
                      <Card key={contrato.id} className="p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-medium">{contrato.nome_cliente}</h3>
                            <p className="text-sm text-gray-500">Nº {contrato.numero_contrato || "-"}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(contrato.status)}`}>
                            {getStatusLabel(contrato.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Plano</p>
                            <p className="text-sm">{contrato.plano}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Corretor</p>
                            <p className="text-sm">{contrato.corretor_nome}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Valor Mensal</p>
                            <p className="text-sm font-medium">{formatarMoeda(contrato.valor_mensal || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Data Início</p>
                            <p className="text-sm">{formatarData(contrato.data_inicio)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                          <Link href={`/admin/propostas-digitais/visualizar/${contrato.id}`} className="flex-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50 justify-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                          </Link>

                          {contrato.documento_url && (
                            <>
                              <Button
                                onClick={() => window.open(contrato.documento_url, "_blank")}
                                variant="ghost"
                                size="sm"
                                className="flex-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 justify-center"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>

                              <Button
                                onClick={() => baixarTodosDocumentos(contrato)}
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 text-[#0F172A] hover:text-[#0F172A] hover:bg-[#7BD9F6] bg-opacity-20 justify-center"
                                disabled={downloadLoading}
                              >
                                <Archive className="h-4 w-4 mr-1" />
                                Baixar Docs (ZIP)
                              </Button>

                              <Button
                                onClick={() => gerarPDFCompletoComDocumentos(contrato)}
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
                    <div className="py-4 text-center text-gray-500">Nenhum contrato encontrado</div>
                  )}
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
