"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Table2, Loader2, AlertCircle } from "lucide-react"
import { buscarTabelasPrecosPorProduto } from "@/services/tabelas-service"
import { obterProdutoCorretor } from "@/services/produtos-corretores-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProdutoTabelasPage() {
  const params = useParams()
  const router = useRouter()
  const [produto, setProduto] = useState(null)
  const [tabelas, setTabelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [segmentacaoAtiva, setSegmentacaoAtiva] = useState(null)

  useEffect(() => {
    async function carregarDados() {
      try {
        if (typeof params.id !== "string") {
          throw new Error("ID do produto inválido")
        }

        setLoading(true)

        // Carregar dados do produto
        const produtoData = await obterProdutoCorretor(params.id)
        setProduto(produtoData)

        // Carregar tabelas vinculadas ao produto
        const tabelasData = await buscarTabelasPrecosPorProduto(params.id)
        setTabelas(tabelasData)

        // Definir a primeira segmentação como ativa, se houver tabelas
        if (tabelasData.length > 0) {
          const segmentacoes = [...new Set(tabelasData.map((t) => t.segmentacao))]
          setSegmentacaoAtiva(segmentacoes[0])
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        setError("Não foi possível carregar as tabelas deste produto")
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [params.id])

  // Agrupar tabelas por segmentação
  const tabelasPorSegmentacao = tabelas.reduce((acc, tabela) => {
    if (!acc[tabela.segmentacao]) {
      acc[tabela.segmentacao] = []
    }
    acc[tabela.segmentacao].push(tabela)
    return acc
  }, {})

  // Lista de segmentações únicas
  const segmentacoes = Object.keys(tabelasPorSegmentacao)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando tabelas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Produto não encontrado</AlertTitle>
          <AlertDescription>Não foi possível encontrar o produto solicitado.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
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
              <h1 className="text-2xl font-bold">{produto.nome}</h1>
              <p className="text-muted-foreground">{produto.operadora}</p>
            </div>
          </div>
        </div>
      </div>

      {tabelas.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sem tabelas</AlertTitle>
          <AlertDescription>Este produto não possui tabelas de preços vinculadas.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center">
            <Table2 className="h-5 w-5 mr-2 text-primary" />
            <h2 className="text-xl font-semibold">Tabelas de Preços Disponíveis</h2>
          </div>

          {segmentacoes.length > 1 ? (
            <Tabs defaultValue={segmentacoes[0]} onValueChange={setSegmentacaoAtiva}>
              <TabsList className="mb-4">
                {segmentacoes.map((segmentacao) => (
                  <TabsTrigger key={segmentacao} value={segmentacao}>
                    {segmentacao}
                  </TabsTrigger>
                ))}
              </TabsList>

              {segmentacoes.map((segmentacao) => (
                <TabsContent key={segmentacao} value={segmentacao}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tabelasPorSegmentacao[segmentacao].map((tabela) => (
                      <Card key={tabela.relacao_id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{tabela.tabela_titulo}</CardTitle>
                          {tabela.descricao && <CardDescription>{tabela.descricao}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                          <Badge className="mb-2">{segmentacao}</Badge>
                          <p className="text-sm text-muted-foreground">
                            Esta tabela contém os valores para a segmentação {segmentacao}.
                          </p>
                        </CardContent>
                        <CardFooter>
                          <Button
                            onClick={() => router.push(`/corretor/tabelas/${tabela.tabela_id}`)}
                            className="w-full bg-[#0F172A] hover:bg-[#1E293B]"
                          >
                            Visualizar Tabela
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tabelas.map((tabela) => (
                <Card key={tabela.relacao_id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{tabela.tabela_titulo}</CardTitle>
                    {tabela.descricao && <CardDescription>{tabela.descricao}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <Badge className="mb-2">{tabela.segmentacao}</Badge>
                    <p className="text-sm text-muted-foreground">
                      Esta tabela contém os valores para a segmentação {tabela.segmentacao}.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => router.push(`/corretor/tabelas/${tabela.tabela_id}`)}
                      className="w-full bg-[#0F172A] hover:bg-[#1E293B]"
                    >
                      Visualizar Tabela
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
