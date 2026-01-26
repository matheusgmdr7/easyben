"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, Eye, Mail, Phone } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Dados de exemplo para os clientes
const clientesIniciais = [
  {
    id: 1,
    nome: "João Silva",
    email: "joao.silva@exemplo.com",
    whatsapp: "(11) 98765-4321",
    plano: "Plano Básico",
    operadora: "Operadora A",
    dataRegistro: "2023-03-15",
    status: "Ativo",
  },
  {
    id: 2,
    nome: "Maria Oliveira",
    email: "maria.oliveira@exemplo.com",
    whatsapp: "(11) 91234-5678",
    plano: "Plano Familiar Premium",
    operadora: "Operadora C",
    dataRegistro: "2023-03-10",
    status: "Ativo",
  },
  {
    id: 3,
    nome: "Pedro Santos",
    email: "pedro.santos@exemplo.com",
    whatsapp: "(21) 99876-5432",
    plano: "Plano Intermediário",
    operadora: "Operadora B",
    dataRegistro: "2023-02-28",
    status: "Pendente",
  },
  {
    id: 4,
    nome: "Ana Costa",
    email: "ana.costa@exemplo.com",
    whatsapp: "(11) 97654-3210",
    plano: "Plano Empresarial Básico",
    operadora: "Operadora B",
    dataRegistro: "2023-02-20",
    status: "Ativo",
  },
  {
    id: 5,
    nome: "Carlos Ferreira",
    email: "carlos.ferreira@exemplo.com",
    whatsapp: "(21) 98765-1234",
    plano: "Plano Premium",
    operadora: "Operadora C",
    dataRegistro: "2023-02-15",
    status: "Inativo",
  },
]

export default function ClientesPage() {
  const [clientes] = useState(clientesIniciais)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("Todos")
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleViewCliente = (cliente) => {
    setClienteSelecionado(cliente)
    setIsDialogOpen(true)
  }

  const clientesFiltrados = clientes.filter((cliente) => {
    const matchesSearch =
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.whatsapp.includes(searchTerm)
    const matchesStatus = filtroStatus === "Todos" || cliente.status === filtroStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciamento de Clientes</h1>
        <Button className="bg-brand-blue hover:bg-blue-800">
          <Download className="h-4 w-4 mr-2" />
          Exportar Dados
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Visualize e gerencie todos os clientes cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Data de Registro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" /> {cliente.email}
                          </span>
                          <span className="flex items-center mt-1">
                            <Phone className="h-3 w-3 mr-1" /> {cliente.whatsapp}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{cliente.plano}</span>
                          <span className="text-sm text-gray-500">{cliente.operadora}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(cliente.dataRegistro).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            cliente.status === "Ativo"
                              ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                              : cliente.status === "Pendente"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {cliente.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleViewCliente(cliente)}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalhes</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>Informações completas do cliente selecionado.</DialogDescription>
          </DialogHeader>

          {clienteSelecionado && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Nome completo</h3>
                  <p className="mt-1">{clienteSelecionado.nome}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        clienteSelecionado.status === "Ativo"
                          ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                          : clienteSelecionado.status === "Pendente"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {clienteSelecionado.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">E-mail</h3>
                  <p className="mt-1">{clienteSelecionado.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">WhatsApp</h3>
                  <p className="mt-1">{clienteSelecionado.whatsapp}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Plano contratado</h3>
                  <p className="mt-1">{clienteSelecionado.plano}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Operadora</h3>
                  <p className="mt-1">{clienteSelecionado.operadora}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Data de registro</h3>
                <p className="mt-1">{new Date(clienteSelecionado.dataRegistro).toLocaleDateString()}</p>
              </div>

              <div className="flex justify-between mt-4">
                <Button variant="outline" asChild>
                  <a href={`mailto:${clienteSelecionado.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar e-mail
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={`https://wa.me/${clienteSelecionado.whatsapp.replace(/\D/g, "")}`}
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
