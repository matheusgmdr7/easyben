"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, PlusCircle, Eye, Mail, Phone, Users, UserCheck, FileText, Calendar, User } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { verificarAutenticacao } from "@/services/auth-corretores-simples"
import { buscarPropostasPorCorretor } from "@/services/propostas-service-unificado"

interface Cliente {
  id: string
  nome: string
  email: string
  telefone: string
  status: "ativo" | "pendente"
  data_cadastro: string
  ultima_proposta?: string
  propostas_count: number
  propostas_aprovadas: number
  valor_total: number
}

// Função para verificar se status é considerado aprovado (inclui cadastrados)
const isStatusAprovado = (status: string): boolean => {
  const statusAprovados = ['aprovada', 'aprovado', 'cadastrado', 'cadastrada']
  return statusAprovados.includes(status?.toLowerCase())
}

// Função para verificar se status é rejeitado/recusado
const isStatusRejeitado = (status: string): boolean => {
  const statusRejeitados = ['rejeitada', 'recusada', 'negada', 'cancelada', 'rejeitado', 'recusado']
  return statusRejeitados.includes(status?.toLowerCase())
}

// Função para processar propostas e gerar dados de clientes
const processarClientesDasPropostas = (propostas: any[]): Cliente[] => {
  console.log("🔍 Processando propostas para clientes:", propostas.length)
  
  if (!propostas || propostas.length === 0) {
    console.log("⚠️ Nenhuma proposta para processar")
    return []
  }
  
  // Filtrar apenas propostas que não foram rejeitadas/recusadas
  const propostasValidas = propostas.filter(proposta => {
    const isRejeitada = isStatusRejeitado(proposta.status)
    
    if (isRejeitada) {
      console.log(`❌ Proposta rejeitada/recusada ignorada: ${proposta.nome_cliente} (${proposta.status})`)
    }
    
    return !isRejeitada
  })
  
  console.log(`✅ Propostas válidas (não rejeitadas): ${propostasValidas.length} de ${propostas.length}`)
  
  const clientesMap = new Map<string, Cliente>()
  
  propostasValidas.forEach((proposta, index) => {
    console.log(`📝 [${index + 1}/${propostasValidas.length}] Processando:`, {
      id: proposta.id,
      nome: proposta.nome_cliente,
      email: proposta.email_cliente,
      telefone: proposta.telefone_cliente,
      status: proposta.status,
      created_at: proposta.created_at
    })
    
    // Usar email como chave primária, ou nome como fallback
    const clienteKey = proposta.email_cliente?.toLowerCase() || proposta.nome_cliente?.toLowerCase()
    
    if (!clienteKey || !proposta.nome_cliente) {
      console.log("⚠️ Proposta ignorada - dados insuficientes")
      return
    }
    
    const clienteExistente = clientesMap.get(clienteKey)
    
    if (clienteExistente) {
      // Atualizar cliente existente
      console.log(`🔄 Atualizando cliente existente: ${clienteExistente.nome}`)
      clienteExistente.propostas_count += 1
      if (isStatusAprovado(proposta.status)) {
        clienteExistente.propostas_aprovadas += 1
        clienteExistente.valor_total += Number(proposta.valor_total || 0)
        clienteExistente.status = "ativo"
        // Atualizar última proposta se for mais recente
        if (!clienteExistente.ultima_proposta || new Date(proposta.created_at) > new Date(clienteExistente.ultima_proposta)) {
          clienteExistente.ultima_proposta = proposta.created_at
        }
      }
      // Atualizar data de cadastro se for mais antiga
      if (new Date(proposta.created_at) < new Date(clienteExistente.data_cadastro)) {
        clienteExistente.data_cadastro = proposta.created_at
      }
    } else {
      // Criar novo cliente apenas se a proposta não foi rejeitada
      const novoCliente: Cliente = {
        id: `cliente_${proposta.id}`,
        nome: proposta.nome_cliente,
        email: proposta.email_cliente || "Email não informado",
        telefone: proposta.telefone_cliente || "Telefone não informado",
        status: isStatusAprovado(proposta.status) ? "ativo" : "pendente",
        data_cadastro: proposta.created_at || new Date().toISOString(),
        ultima_proposta: isStatusAprovado(proposta.status) ? proposta.created_at : undefined,
          propostas_count: 1,
        propostas_aprovadas: isStatusAprovado(proposta.status) ? 1 : 0,
        valor_total: isStatusAprovado(proposta.status) ? Number(proposta.valor_total || 0) : 0
      }
      clientesMap.set(clienteKey, novoCliente)
      console.log(`✅ Cliente criado:`, novoCliente)
    }
  })
  
  const clientesArray = Array.from(clientesMap.values())
  console.log(`🎯 Total de clientes processados: ${clientesArray.length}`)
  console.log("👥 Clientes finais (sem rejeitados):", clientesArray)
  
  return clientesArray
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [ordenacao, setOrdenacao] = useState("recentes")

  useEffect(() => {
    carregarClientes()
  }, [])

  async function carregarClientes() {
    try {
      setLoading(true)

      // Verificar autenticação do corretor
      const { autenticado, corretor } = verificarAutenticacao()

      if (!autenticado || !corretor) {
        toast.error("Sessão expirada. Por favor, faça login novamente.")
        // Redirecionar para login
        window.location.href = "/corretor/login"
        return
      }

      console.log("🔐 Corretor autenticado:", corretor)
      
      // Buscar propostas do corretor
      const propostas = await buscarPropostasPorCorretor(corretor.id)
      console.log("📊 Propostas carregadas:", propostas.length)
      
      if (propostas.length === 0) {
        console.log("⚠️ Nenhuma proposta encontrada para o corretor")
        setClientes([])
        return
      }
      
      // Processar propostas para gerar dados de clientes
      const clientesData = processarClientesDasPropostas(propostas)
      
      console.log("👥 Definindo clientes no estado:", clientesData)
      setClientes(clientesData)
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
      toast.error("Erro ao carregar clientes")
    } finally {
      setLoading(false)
    }
  }

  // Filtrar clientes
  let clientesFiltrados = clientes.filter(
    (cliente) =>
      (cliente.nome.toLowerCase().includes(filtro.toLowerCase()) ||
        cliente.email.toLowerCase().includes(filtro.toLowerCase()) ||
        cliente.telefone.includes(filtro)) &&
      (statusFiltro === "todos" || cliente.status === statusFiltro),
  )

  // Ordenar clientes
  clientesFiltrados = [...clientesFiltrados].sort((a, b) => {
    if (ordenacao === "recentes") {
      return new Date(b.data_cadastro).getTime() - new Date(a.data_cadastro).getTime()
    } else if (ordenacao === "antigos") {
      return new Date(a.data_cadastro).getTime() - new Date(b.data_cadastro).getTime()
    } else if (ordenacao === "nome-asc") {
      return a.nome.localeCompare(b.nome)
    } else if (ordenacao === "nome-desc") {
      return b.nome.localeCompare(a.nome)
    } else if (ordenacao === "propostas") {
      return b.propostas_count - a.propostas_count
    }
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Meus Clientes</h1>
            <p className="text-gray-600 mt-1 font-medium">Gerencie e acompanhe seus clientes</p>
          </div>
          <Button 
            onClick={() => (window.location.href = "/corretor/propostas/nova")} 
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white btn-corporate shadow-corporate"
          >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Proposta
        </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 dashboard-grid-4">
        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Total de Clientes</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">{clientes.length}</div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
              <Users className="h-7 w-7 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-xs text-gray-500 font-medium">Clientes cadastrados</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Clientes Ativos</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">
              {clientes.filter((c) => c.status === "ativo").length}
              </div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
              <UserCheck className="h-7 w-7 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-xs text-gray-500 font-medium">Com propostas aprovadas</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
            <div>
              <CardTitle className="text-sm font-bold text-gray-600 uppercase tracking-wider font-sans">Propostas Enviadas</CardTitle>
              <div className="text-3xl font-bold text-[#0F172A] mt-2">
              {clientes.reduce((acc, cliente) => acc + cliente.propostas_count, 0)}
              </div>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
              <FileText className="h-7 w-7 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-xs text-gray-500 font-medium">Total de propostas</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 font-sans">Lista de Clientes</CardTitle>
              <p className="text-gray-600 text-sm font-medium mt-1">Todos os seus clientes cadastrados</p>
            </div>
            <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, email..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-10 h-10 text-sm corporate-rounded"
                />
              </div>

              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="w-full lg:w-40 h-10 text-sm corporate-rounded">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="w-full lg:w-48 h-10 text-sm corporate-rounded">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recentes">Mais Recentes</SelectItem>
                  <SelectItem value="antigos">Mais Antigos</SelectItem>
                  <SelectItem value="nome-asc">Nome (A-Z)</SelectItem>
                  <SelectItem value="nome-desc">Nome (Z-A)</SelectItem>
                  <SelectItem value="propostas">Mais Propostas</SelectItem>
                </SelectContent>
              </Select>

            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <div className="loading-corporate mb-4"></div>
                <p className="loading-text-corporate">Carregando clientes...</p>
              </div>
            </div>
          ) : clientesFiltrados.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
              <Table>
                <TableHeader>
                    <TableRow className="bg-gray-100 hover:bg-gray-100">
                      <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wide">Cliente</TableHead>
                      <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wide">Contato</TableHead>
                      <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wide">Status</TableHead>
                      <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wide">Cadastro</TableHead>
                      <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wide text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map((cliente) => (
                      <TableRow key={cliente.id} className="hover:bg-gray-50">
                        <TableCell className="font-semibold">{cliente.nome}</TableCell>
                      <TableCell>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm font-medium">{cliente.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm font-medium">{cliente.telefone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`corporate-rounded font-semibold ${
                            cliente.status === "ativo"
                              ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A] hover:bg-[#7BD9F6] bg-opacity-30"
                                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          }`}
                        >
                          {cliente.status === "ativo" ? "Ativo" : "Pendente"}
                        </Badge>
                      </TableCell>
                        <TableCell className="font-medium">{new Date(cliente.data_cadastro).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                          <Button size="icon" variant="outline" className="btn-corporate-sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4">
                {clientesFiltrados.map((cliente) => (
                  <div key={cliente.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg">{cliente.nome}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Cadastrado em {new Date(cliente.data_cadastro).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          className={`corporate-rounded font-semibold whitespace-nowrap ${
                            cliente.status === "ativo"
                              ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {cliente.status === "ativo" ? "Ativo" : "Pendente"}
                        </Badge>
                        <Button size="icon" variant="outline" className="btn-corporate-sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Informações de Contato */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Contato</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{cliente.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{cliente.telefone}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Estatísticas */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-500 font-medium">PROPOSTAS ENVIADAS</span>
                        </div>
                        <div className="text-2xl font-bold text-[#0F172A]">
                          {cliente.propostas_aprovadas} / {cliente.propostas_count}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Aprovadas / Total</p>
                      </div>
                    </div>
                    
                    {/* Última Proposta (se houver) */}
                    {cliente.ultima_proposta && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">Ultima proposta: <span className="font-medium text-gray-700">{new Date(cliente.ultima_proposta).toLocaleDateString("pt-BR")}</span></span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-semibold">
                  {filtro || statusFiltro !== "todos" ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {filtro || statusFiltro !== "todos" ? "Tente ajustar os filtros de busca" : "Os clientes aparecerão aqui quando forem cadastrados"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
