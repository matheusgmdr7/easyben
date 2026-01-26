"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Building2, Plus, Eye, XCircle, Users, User, CreditCard } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { buscarCorretores } from "@/services/corretores-service"
import type { Corretor } from "@/types/corretores"
import ModalNovaCorretora from "@/components/admin/modals/modal-nova-corretora"
import ModalGerenciarCorretora from "@/components/admin/modals/modal-gerenciar-corretora"
import { Settings } from "lucide-react"

export default function CorretorasPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [gestores, setGestores] = useState<Corretor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalVisualizarOpen, setModalVisualizarOpen] = useState(false)
  const [modalGerenciarOpen, setModalGerenciarOpen] = useState(false)
  const [corretorVisualizar, setCorretorVisualizar] = useState<Corretor | null>(null)
  const [corretoraGerenciar, setCorretoraGerenciar] = useState<Corretor | null>(null)
  const [filtroCorretora, setFiltroCorretora] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState("corretoras")

  useEffect(() => {
    carregarGestores()
  }, [])

  async function carregarGestores() {
    try {
      setLoading(true)
      const todosCorretores = await buscarCorretores()
      
      // Filtrar gestores (corretoras)
      const gestoresFiltrados = todosCorretores.filter(
        (corretor) => corretor.is_gestor || corretor.link_cadastro_equipe
      )
      
      setGestores(gestoresFiltrados)
      setCorretores(todosCorretores)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const gestoresFiltrados = gestores.filter((gestor) =>
    gestor.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gestor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const corretoresFiltrados = corretores.filter((corretor) => {
    const matchSearch =
      corretor.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      corretor.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchCorretora = filtroCorretora ? corretor.gestor_id === filtroCorretora : true
    
    return matchSearch && matchCorretora
  })

  function abrirModalVisualizar(corretor: Corretor) {
    setCorretorVisualizar(corretor)
    setModalVisualizarOpen(true)
  }

  function verCorretores(gestorId: string) {
    setFiltroCorretora(gestorId)
    setAbaAtiva("corretores")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corretoras"
        description="Gerencie corretoras (gestores) e corretores cadastrados no sistema"
        icon={Building2}
      />

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-4">
        <TabsList>
          <TabsTrigger value="corretoras">Corretoras</TabsTrigger>
          <TabsTrigger value="corretores">Corretores</TabsTrigger>
        </TabsList>

        {/* Aba Corretoras */}
        <TabsContent value="corretoras" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Corretoras</CardTitle>
                  <CardDescription>
                    Gestores cadastrados no sistema que podem gerenciar equipes de corretores
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar corretoras..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={() => setIsModalOpen(true)} className="bg-[#0F172A] hover:bg-[#1E293B]">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Corretora
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : gestoresFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma corretora encontrada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Nome</TableHead>
                        <TableHead className="font-bold">Email</TableHead>
                        <TableHead className="font-bold">Telefone</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                        <TableHead className="font-bold">Link de Cadastro</TableHead>
                        <TableHead className="text-right font-bold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gestoresFiltrados.map((gestor) => (
                        <TableRow key={gestor.id}>
                          <TableCell className="font-bold">{gestor.nome?.toUpperCase() || "-"}</TableCell>
                          <TableCell>{gestor.email}</TableCell>
                          <TableCell>{gestor.telefone || gestor.whatsapp || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={gestor.ativo ? "default" : "secondary"}
                              className={
                                gestor.ativo
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {gestor.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {gestor.link_cadastro_equipe ? (
                              <Badge variant="outline" className="font-mono text-xs">
                                {gestor.link_cadastro_equipe}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {gestor.ativo && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => verCorretores(gestor.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver Corretores
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCorretoraGerenciar(gestor)
                                  setModalGerenciarOpen(true)
                                }}
                                className="text-[#0F172A] hover:bg-[#0F172A]/10"
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Gerenciar
                              </Button>
                            </div>
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

        {/* Aba Corretores */}
        <TabsContent value="corretores" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Corretores</CardTitle>
                  <CardDescription>
                    Todos os corretores cadastrados no sistema, incluindo os não vinculados a corretoras
                    {filtroCorretora && (
                      <span className="ml-2 text-blue-600 font-semibold">
                        - Filtrando por: {gestores.find((g) => g.id === filtroCorretora)?.nome?.toUpperCase() || "Corretora"}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar corretores..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {filtroCorretora && (
                    <Button
                      variant="outline"
                      onClick={() => setFiltroCorretora(null)}
                    >
                      Limpar Filtro
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : corretoresFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum corretor encontrado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Nome</TableHead>
                        <TableHead className="font-bold">Email</TableHead>
                        <TableHead className="font-bold">CPF</TableHead>
                        <TableHead className="font-bold">Cidade/UF</TableHead>
                        <TableHead className="font-bold">Corretora</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                        <TableHead className="text-right font-bold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {corretoresFiltrados.map((corretor) => {
                        const gestor = gestores.find((g) => g.id === corretor.gestor_id)
                        return (
                          <TableRow key={corretor.id}>
                            <TableCell className="font-bold">{corretor.nome?.toUpperCase() || "-"}</TableCell>
                            <TableCell>{corretor.email}</TableCell>
                            <TableCell>{corretor.cpf || "-"}</TableCell>
                            <TableCell>
                              {corretor.cidade && corretor.estado
                                ? `${corretor.cidade}/${corretor.estado}`
                                : corretor.cidade || corretor.estado || "-"}
                            </TableCell>
                            <TableCell>{gestor?.nome?.toUpperCase() || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={corretor.ativo ? "default" : "secondary"}
                                className={
                                  corretor.ativo
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {corretor.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirModalVisualizar(corretor)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Nova Corretora */}
      <ModalNovaCorretora
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async () => {
          await carregarGestores()
        }}
      />

      {/* Modal Gerenciar Corretora */}
      <ModalGerenciarCorretora
        isOpen={modalGerenciarOpen}
        onClose={() => {
          setModalGerenciarOpen(false)
          setCorretoraGerenciar(null)
        }}
        corretora={corretoraGerenciar}
        onSave={async () => {
          await carregarGestores()
        }}
      />

      {/* Modal Visualizar Corretor */}
      {modalVisualizarOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
          {/* Backdrop com blur */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99]"
            onClick={() => setModalVisualizarOpen(false)}
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-[100]">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-white" />
                  <h2 className="text-xl font-bold text-white">Detalhes do Corretor</h2>
                </div>
                <button
                  onClick={() => setModalVisualizarOpen(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {corretorVisualizar && (
                <div className="space-y-6">
                  {/* Dados Pessoais */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-[#0F172A]" />
                      Dados Pessoais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.nome?.toUpperCase() || "-"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.email || "-"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                          {corretorVisualizar.telefone || corretorVisualizar.whatsapp || "-"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">CPF</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.cpf || "-"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Data de Nascimento</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                          {corretorVisualizar.data_nascimento
                            ? new Date(corretorVisualizar.data_nascimento).toLocaleDateString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Estado</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.estado || "-"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Cidade</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.cidade || "-"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                        <div className="mt-1">
                          <Badge
                            variant={corretorVisualizar.ativo ? "default" : "secondary"}
                            className={
                              corretorVisualizar.ativo
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {corretorVisualizar.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dados Empresariais */}
                  {corretorVisualizar.cnpj && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#0F172A]" />
                        Dados Empresariais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label>
                          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.cnpj}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dados Financeiros */}
                  {(corretorVisualizar.chave_pix || corretorVisualizar.banco) && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-[#0F172A]" />
                        Dados Financeiros
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {corretorVisualizar.chave_pix && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Chave PIX</label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.chave_pix}</p>
                          </div>
                        )}
                        {corretorVisualizar.tipo_chave_pix && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Chave PIX</label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.tipo_chave_pix}</p>
                          </div>
                        )}
                        {corretorVisualizar.banco && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Banco</label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.banco}</p>
                          </div>
                        )}
                        {corretorVisualizar.agencia && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Agência</label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.agencia}</p>
                          </div>
                        )}
                        {corretorVisualizar.conta && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Conta</label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.conta}</p>
                          </div>
                        )}
                        {corretorVisualizar.tipo_conta && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Conta</label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.tipo_conta}</p>
                          </div>
                        )}
                        {corretorVisualizar.nome_titular_conta && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Titular</label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.nome_titular_conta?.toUpperCase() || "-"}</p>
                          </div>
                        )}
                        {corretorVisualizar.cpf_cnpj_titular_conta && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">CPF/CNPJ do Titular</label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded-md">{corretorVisualizar.cpf_cnpj_titular_conta}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end">
                <Button
                  onClick={() => setModalVisualizarOpen(false)}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
