"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { type Proposta, buscarPropostaPorId } from "@/services/propostas-corretores-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react"
import { formatarData, formatarValor, formatarTelefone } from "@/lib/formatters"

export default function DetalhesPropostaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [proposta, setProposta] = useState<Proposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      carregarProposta(Number.parseInt(params.id))
    }
  }, [params.id])

  const carregarProposta = async (id: number) => {
    setCarregando(true)
    setErro(null)

    try {
      const dados = await buscarPropostaPorId(id)
      setProposta(dados)
    } catch (error) {
      console.error("Erro ao carregar proposta:", error)
      setErro("Não foi possível carregar os detalhes da proposta. Tente novamente.")
    } finally {
      setCarregando(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovada":
        return <Badge className="bg-[#7BD9F6] bg-opacity-200">Aprovada</Badge>
      case "rejeitada":
        return <Badge variant="destructive">Rejeitada</Badge>
      default:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Pendente
          </Badge>
        )
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/corretor/propostas")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para propostas
      </Button>

      {erro && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-600">{erro}</p>
            </div>
            <Button variant="outline" className="mt-2" onClick={() => carregarProposta(Number.parseInt(params.id))}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {carregando ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : proposta ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{proposta.cliente_nome}</CardTitle>
                <CardDescription>{proposta.produto_nome}</CardDescription>
              </div>
              {getStatusBadge(proposta.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Informações do Cliente</h3>
                <div className="mt-2 space-y-2">
                  <p>
                    <span className="font-medium">Nome:</span> {proposta.cliente_nome}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {proposta.cliente_email}
                  </p>
                  <p>
                    <span className="font-medium">Telefone:</span> {formatarTelefone(proposta.cliente_telefone)}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Informações da Proposta</h3>
                <div className="mt-2 space-y-2">
                  <p>
                    <span className="font-medium">Produto:</span> {proposta.produto_nome}
                  </p>
                  <p>
                    <span className="font-medium">Valor:</span> {formatarValor(proposta.valor)}
                  </p>
                  <p>
                    <span className="font-medium">Data de criação:</span> {formatarData(proposta.data_criacao)}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {proposta.status.charAt(0).toUpperCase() + proposta.status.slice(1)}
                  </p>
                </div>
              </div>
            </div>

            {proposta.observacoes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Observações</h3>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p>{proposta.observacoes}</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/corretor/propostas")}>
              Voltar
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Proposta não encontrada.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/corretor/propostas")}>
              Voltar para propostas
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
