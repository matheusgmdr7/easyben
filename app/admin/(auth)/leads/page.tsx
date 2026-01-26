"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, Eye, Mail, Phone, ChevronLeft, ChevronRight, Users, CheckCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { buscarLeads, atualizarLead } from "@/services/leads-service"
import type { Lead } from "@/services/leads-service"
// XLSX será importado dinamicamente quando necessário

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("Todos")
  const [filtroData, setFiltroData] = useState("Todos")
  const [filtroEstado, setFiltroEstado] = useState("Todos")
  const [filtroFaixaEtaria, setFiltroFaixaEtaria] = useState("Todos")
  const [filtroOperadora, setFiltroOperadora] = useState("Todos")
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [carregando, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina] = useState(20)

  useEffect(() => {
    carregarLeads()
  }, [])

  async function carregarLeads() {
    try {
      const dados = await buscarLeads()
      setLeads(dados)
    } catch (error) {
      console.error("Erro ao carregar leads:", error)
      setErro("Falha ao carregar os leads. Por favor, tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleViewLead = (lead: Lead) => {
    setLeadSelecionado(lead)
    setIsDialogOpen(true)
  }

  const handleStatusChange = async (leadId: number, novoStatus: string) => {
    try {
      await atualizarLead(leadId.toString(), { status: novoStatus })
      await carregarLeads()
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      setErro("Falha ao atualizar o status. Por favor, tente novamente.")
    }
  }

  const leadsFiltrados = leads.filter((lead) => {
    const matchesSearch =
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.whatsapp.includes(searchTerm)
    const matchesStatus = filtroStatus === "Todos" || lead.status === filtroStatus
    const matchesEstado = filtroEstado === "Todos" || lead.estado === filtroEstado
    const matchesFaixaEtaria = filtroFaixaEtaria === "Todos" || lead.faixa_etaria === filtroFaixaEtaria
    const matchesOperadora = filtroOperadora === "Todos" || lead.plano_operadora === filtroOperadora

    // Filtro de data
    let matchesData = true
    if (filtroData !== "Todos") {
      const hoje = new Date()
      const dataLead = new Date(lead.data_registro)
      const diffTime = Math.abs(hoje.getTime() - dataLead.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      switch (filtroData) {
        case "Hoje":
          matchesData = diffDays === 0
          break
        case "Esta semana":
          matchesData = diffDays <= 7
          break
        case "Este mês":
          matchesData = diffDays <= 30
          break
        case "Este ano":
          matchesData = diffDays <= 365
          break
      }
    }

    return matchesSearch && matchesStatus && matchesEstado && matchesFaixaEtaria && matchesOperadora && matchesData
  })

  // Extrair valores únicos para os filtros
  const estados = Array.from(new Set(leads.map((lead) => lead.estado)))
  const faixasEtarias = Array.from(new Set(leads.map((lead) => lead.faixa_etaria)))
  const operadoras = Array.from(new Set(leads.map((lead) => lead.plano_operadora)))

  // Cálculos de paginação
  const totalItens = leadsFiltrados.length
  const totalPaginas = Math.ceil(totalItens / itensPorPagina)
  const indiceInicio = (paginaAtual - 1) * itensPorPagina
  const indiceFim = indiceInicio + itensPorPagina
  const leadsExibidos = leadsFiltrados.slice(indiceInicio, indiceFim)

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPaginaAtual(1)
  }, [searchTerm, filtroStatus, filtroData, filtroEstado, filtroFaixaEtaria, filtroOperadora])

  const exportarParaExcel = async () => {
    // Preparar dados para exportação
    const dadosParaExportar = leads.map((lead) => ({
      Nome: lead.nome,
      Email: lead.email,
      WhatsApp: lead.whatsapp,
      Plano: lead.plano_nome,
      Operadora: lead.plano_operadora,
      "Faixa Etária": lead.faixa_etaria,
      Estado: lead.estado,
      "Data de Registro": new Date(lead.data_registro).toLocaleDateString(),
      Status: lead.status,
      Observações: lead.observacoes || "",
    }))

    // Importar XLSX dinamicamente
    const XLSX = await import("xlsx")
    
    // Criar planilha
    const ws = XLSX.utils.json_to_sheet(dadosParaExportar)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Leads")

    // Gerar arquivo
    XLSX.writeFile(wb, "leads.xlsx")
  }

  if (carregando) {
    return (
      <div className="flex justify-center items-center h-64 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="loading-corporate mx-auto"></div>
          <span className="block mt-4 loading-text-corporate">Carregando leads...</span>
          <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Gerenciamento de Leads</h1>
            <p className="text-gray-600 mt-1 font-medium">Gerencie e acompanhe todos os leads</p>
          </div>
          <Button onClick={exportarParaExcel} className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-6 py-2 btn-corporate shadow-corporate">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total de Leads</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{leads.length}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total acumulado</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Novos</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{leads.filter((l) => l.status === "Novo").length}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Aguardando contato</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Em Contato</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{leads.filter((l) => l.status === "Em contato").length}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Em negociação</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg">
          <div className="flex flex-row items-center justify-between pb-3 pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 opacity-60" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Convertidos</h3>
              </div>
              <div className="text-xl sm:text-3xl font-bold text-[#0F172A] mt-1 sm:mt-2">{leads.filter((l) => l.status === "Convertido").length}</div>
            </div>
          </div>
          <div className="pb-4 sm:pb-6 px-3 sm:px-6">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Vendas efetivadas</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm rounded-lg">
        <div className="bg-gray-50 rounded-t-lg p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 font-sans">Filtros de Busca</h3>
          <p className="text-gray-600 text-sm font-medium mt-1">Refine sua pesquisa</p>
        </div>
        <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Nome, email ou telefone..."
                className="pl-9 text-sm h-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todos</option>
              <option value="Novo">Novo</option>
              <option value="Em contato">Em contato</option>
              <option value="Convertido">Convertido</option>
              <option value="Perdido">Perdido</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Período</label>
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todos</option>
              <option value="Hoje">Hoje</option>
              <option value="Esta semana">Esta semana</option>
              <option value="Este mês">Este mês</option>
              <option value="Este ano">Este ano</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todos</option>
              {estados.map((estado) => (
                <option key={estado} value={estado || "N/A"}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Faixa Etária</label>
            <select
              value={filtroFaixaEtaria}
              onChange={(e) => setFiltroFaixaEtaria(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todas</option>
              {faixasEtarias.map((faixa) => (
                <option key={faixa} value={faixa || "N/A"}>
                  {faixa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Operadora</label>
            <select
              value={filtroOperadora}
              onChange={(e) => setFiltroOperadora(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-8"
            >
              <option value="Todos">Todas</option>
              {operadoras.map((operadora) => (
                <option key={operadora} value={operadora || "N/A"}>
                  {operadora}
                </option>
              ))}
            </select>
          </div>
        </div>
        </div>
      </div>

      {/* Lista de Leads */}
      <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm rounded-lg">
        <div className="bg-gray-50 rounded-t-lg p-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-sans">Lista de Leads</h2>
              <p className="text-gray-600 text-sm font-medium mt-1">Todos os leads cadastrados</p>
            </div>
            <div className="text-sm text-gray-600 font-medium">
              Mostrando {indiceInicio + 1}-{Math.min(indiceFim, totalItens)} de {totalItens} leads
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">Nome</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Contato
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Plano
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Faixa Etária
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Estado
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">Data</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {erro ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-red-500">
                    {erro}
                  </td>
                </tr>
              ) : leadsExibidos.length > 0 ? (
                leadsExibidos.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="text-sm font-bold text-gray-900 truncate max-w-[150px] font-sans" title={lead.nome}>
                        {lead.nome}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col text-xs space-y-1">
                        <span className="flex items-center truncate max-w-[120px]" title={lead.email}>
                          <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </span>
                        <span className="flex items-center">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" /> {lead.whatsapp}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col text-xs">
                        <span className="truncate max-w-[100px]" title={lead.plano_nome}>
                          {lead.plano_nome}
                        </span>
                        <span className="text-gray-500 truncate max-w-[100px]" title={lead.plano_operadora}>
                          {lead.plano_operadora}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">{lead.faixa_etaria}</td>
                    <td className="px-4 py-4 text-xs">{lead.estado}</td>
                    <td className="px-4 py-4 text-xs">{new Date(lead.data_registro).toLocaleDateString()}</td>
                    <td className="px-4 py-4">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-7"
                      >
                        <option value="Novo">Novo</option>
                        <option value="Em contato">Em contato</option>
                        <option value="Convertido">Convertido</option>
                        <option value="Perdido">Perdido</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-1 btn-corporate-sm" onClick={() => handleViewLead(lead)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver detalhes</span>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <div className="text-gray-500 text-lg">Nenhum lead encontrado</div>
                    <div className="text-gray-400 text-sm mt-2">
                      {searchTerm ||
                      filtroStatus !== "Todos" ||
                      filtroData !== "Todos" ||
                      filtroEstado !== "Todos" ||
                      filtroFaixaEtaria !== "Todos" ||
                      filtroOperadora !== "Todos"
                        ? "Tente ajustar os filtros de busca"
                        : "Aguardando novos leads"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-700">
                Página {paginaAtual} de {totalPaginas}
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                  disabled={paginaAtual === 1}
                  className="h-8 sm:h-9 text-xs sm:text-sm rounded-none"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="ml-1">Anterior</span>
                </Button>

                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pageNum
                    if (totalPaginas <= 5) {
                      pageNum = i + 1
                    } else if (paginaAtual <= 3) {
                      pageNum = i + 1
                    } else if (paginaAtual >= totalPaginas - 2) {
                      pageNum = totalPaginas - 4 + i
                    } else {
                      pageNum = paginaAtual - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={paginaAtual === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaginaAtual(pageNum)}
                        className="h-8 sm:h-9 w-8 sm:w-9 p-0 text-xs sm:text-sm rounded-none"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="h-8 sm:h-9 text-xs sm:text-sm rounded-none"
                >
                  <span className="mr-1">Próxima</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
            <DialogDescription>Informações completas do lead selecionado.</DialogDescription>
          </DialogHeader>

          {leadSelecionado && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Nome completo</h3>
                  <p className="mt-1">{leadSelecionado.nome}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        leadSelecionado.status === "Novo"
                          ? "bg-blue-100 text-blue-800"
                          : leadSelecionado.status === "Em contato"
                            ? "bg-yellow-100 text-yellow-800"
                            : leadSelecionado.status === "Convertido"
                              ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {leadSelecionado.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">E-mail</h3>
                  <p className="mt-1">{leadSelecionado.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">WhatsApp</h3>
                  <p className="mt-1">{leadSelecionado.whatsapp}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Plano selecionado</h3>
                  <p className="mt-1">{leadSelecionado.plano_nome}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Operadora</h3>
                  <p className="mt-1">{leadSelecionado.plano_operadora}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Faixa Etária</h3>
                <p className="mt-1">{leadSelecionado.faixa_etaria}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                <p className="mt-1">{leadSelecionado.estado}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Data de registro</h3>
                <p className="mt-1">{new Date(leadSelecionado.data_registro).toLocaleDateString()}</p>
              </div>

              <div className="flex justify-between mt-4">
                <Button variant="outline" asChild>
                  <a href={`mailto:${leadSelecionado.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar e-mail
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={`https://wa.me/${leadSelecionado.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Contatar via WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
