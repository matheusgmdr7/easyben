"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Eye, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { obterProdutosCorretores } from "@/services/produtos-corretores-service"
import { toast } from "sonner"
import NovoProdutoModal from "./components/novo-produto-modal"
import { CubeIcon } from "@heroicons/react/24/outline"

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<any>(null)

  useEffect(() => {
    carregarProdutos()
  }, [])

  async function carregarProdutos() {
    try {
      setLoading(true)
      const data = await obterProdutosCorretores()
      setProdutos(data)
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
      toast.error("Erro ao carregar produtos")
    } finally {
      setLoading(false)
    }
  }

  const produtosFiltrados = produtos.filter((produto) =>
    produto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.operadora?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleNovoProduto = () => {
    setProdutoEditando(null)
    setModalOpen(true)
  }

  const handleEditarProduto = (produto: any) => {
    setProdutoEditando(produto)
    setModalOpen(true)
  }

  const handleSalvarProduto = () => {
    carregarProdutos()
    setModalOpen(false)
    setProdutoEditando(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Gerencie todos os produtos, tabelas de preços, bonificações e comissionamentos"
        icon={CubeIcon}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar produtos..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button onClick={handleNovoProduto} className="bg-[#0F172A] hover:bg-[#1E293B]">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">Carregando produtos...</div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Cadastrados</CardTitle>
            <CardDescription>
              Lista de todos os produtos com suas configurações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {produtosFiltrados.length === 0 ? (
              <div className="text-center py-10">
                <h3 className="text-lg font-semibold">Nenhum produto encontrado</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchTerm
                    ? "Não encontramos produtos correspondentes à sua busca."
                    : "Clique em 'Novo Produto' para adicionar um produto."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Operadora</TableHead>
                    <TableHead>Segmentação</TableHead>
                    <TableHead>Área Comercialização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosFiltrados.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">
                        {produto.codigo || "-"}
                      </TableCell>
                      <TableCell>{produto.nome}</TableCell>
                      <TableCell>{produto.operadora || "-"}</TableCell>
                      <TableCell>{produto.segmentacao || "-"}</TableCell>
                      <TableCell>
                        {produto.area_comercializacao ? (
                          <Badge variant="outline">{produto.area_comercializacao}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={produto.disponivel ? "default" : "secondary"}>
                          {produto.disponivel ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditarProduto(produto)}
                            title="Editar produto"
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

      <NovoProdutoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        produto={produtoEditando}
        onSuccess={handleSalvarProduto}
      />
    </div>
  )
}








