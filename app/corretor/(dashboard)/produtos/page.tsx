"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table2, Search } from "lucide-react"
import { obterProdutosCorretores } from "@/services/produtos-corretores-service"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CorretorProdutosPage() {
  const router = useRouter()
  const [produtos, setProdutos] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [tipoFiltro, setTipoFiltro] = useState("todos")

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true)
        setErro(null)

        const produtosData = await obterProdutosCorretores()
        setProdutos(produtosData)
      } catch (error) {
        console.error("Erro ao carregar produtos:", error)
        setErro("Não foi possível carregar os produtos. Por favor, tente novamente.")
      } finally {
        setCarregando(false)
      }
    }

    carregarDados()
  }, [])

  // Obter tipos únicos de produtos para o filtro
  const tiposProdutos = ["todos", ...new Set(produtos.map((produto) => produto.tipo))].filter(Boolean)

  const produtosFiltrados = produtos.filter((produto) => {
    const matchSearch =
      produto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.operadora?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.tipo?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchTipo = tipoFiltro === "todos" || produto.tipo === tipoFiltro

    return matchSearch && matchTipo && produto.disponivel
  })

  if (erro) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h1 className="text-xl font-semibold tracking-tight">Produtos</h1>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="text-center space-y-4">
              <p className="text-red-500">{erro}</p>
              <Button onClick={() => window.location.reload()} className="bg-[#0F172A] hover:bg-[#1E293B]">
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center border-b pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Produtos</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Tabs defaultValue="todos" className="w-full md:w-auto" onValueChange={setTipoFiltro}>
          <TabsList className="grid grid-cols-3 md:grid-cols-5 w-full md:w-auto">
            {tiposProdutos.slice(0, 5).map((tipo) => (
              <TabsTrigger key={tipo} value={tipo} className="text-xs capitalize">
                {tipo}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {carregando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </CardContent>
              <CardFooter>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">
            {searchTerm ? "Nenhum produto encontrado com os filtros aplicados" : "Nenhum produto disponível no momento"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {produtosFiltrados.map((produto) => (
            <Card key={produto.id} className="flex flex-col shadow-sm border-gray-200">
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 relative flex-shrink-0">
                    {produto.logo ? (
                      <img
                        src={produto.logo || "/placeholder.svg?height=80&width=80"}
                        alt={produto.operadora || "Logo"}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = "/placeholder.svg?height=80&width=80"
                          e.target.alt = "Logo indisponível"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                        <span className="text-gray-500 text-xs">
                          {produto.operadora ? produto.operadora.substring(0, 2).toUpperCase() : "PL"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base">{produto.nome}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      {produto.operadora}
                      <Badge variant="outline" className="text-xs font-normal capitalize">
                        {produto.tipo || "Plano de Saúde"}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pb-2">
                {produto.descricao ? (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{produto.descricao}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-4">Sem descrição disponível</p>
                )}

                {produto.area_comercializacao && (
                  <div className="mb-4">
                    <Badge variant="secondary" className="text-xs">
                      Área: {produto.area_comercializacao}
                    </Badge>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  onClick={() => router.push(`/corretor/produto-tabelas/${produto.id}`)}
                  className="w-full bg-[#0F172A] hover:bg-[#1E293B] h-9 text-sm"
                  disabled={produto.tabelas_count === 0}
                >
                  <Table2 className="mr-2 h-4 w-4" />
                  Ver Tabelas de Preços
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
