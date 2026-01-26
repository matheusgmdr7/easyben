"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Edit, Link, Plus, Trash2, CheckCircle, XCircle, Search, Filter } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  obterProdutosCorretores,
  criarProdutoCorretor,
  atualizarStatusProdutoCorretor,
  excluirProdutoCorretor,
} from "@/services/produtos-corretores-service"
import { verificarChavesAPI } from "@/lib/supabase-client"
import type { ProdutoCorretor } from "@/types/corretores"

export default function ProdutosCorretoresPage() {
  const router = useRouter()
  const [produtos, setProdutos] = useState<ProdutoCorretor[]>([])
  const [produtosFiltrados, setProdutosFiltrados] = useState<ProdutoCorretor[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [busca, setBusca] = useState<string>("")
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [statusSupabase, setStatusSupabase] = useState<{
    testado: boolean
    conectado: boolean
    mensagem: string
  }>({
    testado: false,
    conectado: false,
    mensagem: "Verificando conexão...",
  })
  const [novoProduto, setNovoProduto] = useState<Partial<ProdutoCorretor>>({
    nome: "",
    operadora: "",
    tipo: "",
    comissao: "",
    descricao: "",
    disponivel: true,
  })

  // Verificar conexão com Supabase
  const verificarConexao = async () => {
    try {
      const resultado = await verificarChavesAPI()
      setStatusSupabase({
        testado: true,
        conectado: resultado.success,
        mensagem: resultado.message,
      })
      return resultado.success
    } catch (error) {
      console.error("Erro ao verificar conexão:", error)
      setStatusSupabase({
        testado: true,
        conectado: false,
        mensagem: `Erro ao verificar conexão: ${error.message || "Erro desconhecido"}`,
      })
      return false
    }
  }

  // Carregar produtos
  const carregarProdutos = async () => {
    try {
      setIsLoading(true)

      // Verificar conexão antes de carregar produtos
      const conexaoOk = await verificarConexao()
      if (!conexaoOk) {
        setError("Não foi possível conectar ao Supabase. Verifique as chaves de API.")
        return
      }

      const data = await obterProdutosCorretores()
      setProdutos(data)
      setProdutosFiltrados(data)
      setError(null)
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
      setError(`Não foi possível carregar os produtos: ${error.message || "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrar produtos
  useEffect(() => {
    let produtosFiltrados = produtos

    // Filtro por busca
    if (busca) {
      produtosFiltrados = produtosFiltrados.filter(
        (produto) =>
          produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
          produto.operadora.toLowerCase().includes(busca.toLowerCase()) ||
          produto.tipo.toLowerCase().includes(busca.toLowerCase()),
      )
    }

    // Filtro por status
    if (filtroStatus !== "todos") {
      produtosFiltrados = produtosFiltrados.filter((produto) =>
        filtroStatus === "ativo" ? produto.disponivel : !produto.disponivel,
      )
    }

    setProdutosFiltrados(produtosFiltrados)
  }, [produtos, busca, filtroStatus])

  // Criar novo produto
  const handleCriarProduto = async () => {
    try {
      setIsLoading(true)
      const produto = await criarProdutoCorretor(novoProduto as Omit<ProdutoCorretor, "id" | "created_at">)
      toast.success("Produto criado com sucesso!")
      setIsDialogOpen(false)
      setNovoProduto({
        nome: "",
        operadora: "",
        tipo: "",
        comissao: "",
        descricao: "",
        disponivel: true,
      })
      await carregarProdutos()
    } catch (error) {
      console.error("Erro ao criar produto:", error)
      toast.error(`Não foi possível criar o produto: ${error.message || "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Atualizar status do produto
  const handleToggleStatus = async (id: string | number, disponivel: boolean) => {
    try {
      setIsLoading(true)
      await atualizarStatusProdutoCorretor(id, !disponivel)
      toast.success(`Produto ${!disponivel ? "ativado" : "desativado"} com sucesso!`)
      await carregarProdutos()
    } catch (error) {
      console.error("Erro ao atualizar status do produto:", error)
      toast.error(`Não foi possível atualizar o status do produto: ${error.message || "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Excluir produto
  const handleExcluirProduto = async (id: string | number) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return

    try {
      setIsLoading(true)
      await excluirProdutoCorretor(id)
      toast.success("Produto excluído com sucesso!")
      await carregarProdutos()
    } catch (error) {
      console.error("Erro ao excluir produto:", error)
      toast.error(`Não foi possível excluir o produto: ${error.message || "Erro desconhecido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Editar produto
  const handleEditarProduto = (id: string | number) => {
    router.push(`/admin/produtos-corretores/${id}`)
  }

  // Carregar dados iniciais
  useEffect(() => {
    carregarProdutos()
  }, [])

  // Estatísticas rápidas
  const estatisticas = {
    total: produtos.length,
    ativos: produtos.filter((p) => p.disponivel).length,
    inativos: produtos.filter((p) => !p.disponivel).length,
    comTabela: produtos.filter((p) => p.tabelas_count && p.tabelas_count > 0).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos para Corretores</h1>
          <p className="text-sm text-gray-600 mt-1">Gerencie os produtos disponíveis para os corretores</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-800 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Produto</DialogTitle>
              <DialogDescription>Preencha os dados para criar um novo produto.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={novoProduto.nome}
                  onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                  disabled={isLoading}
                  placeholder="Ex: Plano Saúde Premium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="operadora">Operadora *</Label>
                  <Input
                    id="operadora"
                    value={novoProduto.operadora}
                    onChange={(e) => setNovoProduto({ ...novoProduto, operadora: e.target.value })}
                    disabled={isLoading}
                    placeholder="Ex: Amil"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Input
                    id="tipo"
                    value={novoProduto.tipo}
                    onChange={(e) => setNovoProduto({ ...novoProduto, tipo: e.target.value })}
                    disabled={isLoading}
                    placeholder="Ex: Individual"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comissao">Comissão (%) *</Label>
                <Input
                  id="comissao"
                  value={novoProduto.comissao}
                  onChange={(e) => setNovoProduto({ ...novoProduto, comissao: e.target.value })}
                  disabled={isLoading}
                  placeholder="Ex: 15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={novoProduto.descricao || ""}
                  onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
                  disabled={isLoading}
                  placeholder="Descrição opcional do produto"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleCriarProduto}
                disabled={
                  isLoading || !novoProduto.nome || !novoProduto.operadora || !novoProduto.tipo || !novoProduto.comissao
                }
                className="bg-gray-900 hover:bg-gray-800"
              >
                {isLoading ? "Criando..." : "Criar Produto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{estatisticas.total}</div>
            <p className="text-xs text-gray-600">Total de Produtos</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#0F172A]">{estatisticas.ativos}</div>
            <p className="text-xs text-gray-600">Produtos Ativos</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-700">{estatisticas.inativos}</div>
            <p className="text-xs text-gray-600">Produtos Inativos</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-700">{estatisticas.comTabela}</div>
            <p className="text-xs text-gray-600">Com Tabela de Preços</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {statusSupabase.testado && !statusSupabase.conectado && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de conexão com Supabase</AlertTitle>
          <AlertDescription>
            <p>{statusSupabase.mensagem}</p>
            <p className="mt-2">
              Verifique se as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão
              configuradas corretamente.
            </p>
            <Button className="mt-2" onClick={verificarConexao} variant="outline" size="sm">
              Testar conexão novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, operadora ou tipo..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativo">Apenas Ativos</option>
                <option value="inativo">Apenas Inativos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Lista de Produtos</CardTitle>
          <CardDescription>
            {produtosFiltrados.length} produto(s) encontrado(s)
            {busca && ` para "${busca}"`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && produtos.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-2">Nenhum produto encontrado</div>
              <p className="text-sm text-gray-400">
                {busca ? "Tente ajustar os filtros de busca" : "Clique em 'Novo Produto' para adicionar"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-medium text-gray-700">Produto</TableHead>
                    <TableHead className="font-medium text-gray-700">Operadora</TableHead>
                    <TableHead className="font-medium text-gray-700 hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="font-medium text-gray-700 hidden md:table-cell">Comissão</TableHead>
                    <TableHead className="font-medium text-gray-700 hidden lg:table-cell">Tabelas</TableHead>
                    <TableHead className="font-medium text-gray-700">Status</TableHead>
                    <TableHead className="font-medium text-gray-700 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosFiltrados.map((produto) => (
                    <TableRow key={produto.id} className="border-gray-100 hover:bg-gray-50">
                      <TableCell className="font-medium text-gray-900">
                        <div>
                          <div className="font-medium">{produto.nome}</div>
                          <div className="text-xs text-gray-500 sm:hidden">
                            {produto.operadora} • {produto.tipo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 hidden sm:table-cell">{produto.operadora}</TableCell>
                      <TableCell className="text-gray-700 hidden sm:table-cell">{produto.tipo}</TableCell>
                      <TableCell className="text-gray-700 hidden md:table-cell">{produto.comissao}%</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {produto.tabelas_count > 0 ? (
                          <Badge variant="default" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                            {produto.tabelas_count} tabela(s)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                            Sem tabela
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {produto.disponivel ? (
                          <Badge variant="default" className="bg-[#7BD9F6] bg-opacity-30 text-[#0F172A] hover:bg-[#7BD9F6] bg-opacity-30">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditarProduto(produto.id)}
                            title="Editar produto"
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/produtos-corretores/${produto.id}?tab=tabelas`)}
                            title="Vincular tabela"
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Link className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(produto.id, produto.disponivel)}
                            title={produto.disponivel ? "Desativar produto" : "Ativar produto"}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            {produto.disponivel ? (
                              <XCircle className="h-4 w-4 text-red-600" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-[#0F172A]" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluirProduto(produto.id)}
                            title="Excluir produto"
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
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
    </div>
  )
}
