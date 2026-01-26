"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowLeft, Edit } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buscarTabelaPrecoDetalhada } from "@/services/tabelas-service"
import type { TabelaPrecoDetalhada } from "@/types/tabelas"

export default function VisualizarTabelaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [tabelaDetalhada, setTabelaDetalhada] = useState<TabelaPrecoDetalhada | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar dados da tabela
  const carregarTabela = async () => {
    try {
      setIsLoading(true)
      const tabela = await buscarTabelaPrecoDetalhada(params.id)
      setTabelaDetalhada(tabela)
      setError(null)
    } catch (error) {
      console.error("Erro ao carregar tabela:", error)
      setError("Não foi possível carregar os dados da tabela.")
    } finally {
      setIsLoading(false)
    }
  }

  // Formatar valor para exibição
  const formatarValor = (valor: number): string => {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  // Carregar dados iniciais
  useEffect(() => {
    carregarTabela()
  }, [params.id])

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push("/admin/tabelas")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading || !tabelaDetalhada) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => router.push("/admin/tabelas")} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Visualizar Tabela de Preços</h1>
        </div>
        <Button variant="outline" onClick={() => router.push(`/admin/tabelas/${params.id}`)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar Tabela
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Informações da Tabela</CardTitle>
            <CardDescription>Detalhes básicos da tabela de preços.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Título</h3>
              <p className="text-lg">{tabelaDetalhada.tabela.titulo}</p>
            </div>

            {tabelaDetalhada.tabela.descricao && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Descrição</h3>
                <p>{tabelaDetalhada.tabela.descricao}</p>
              </div>
            )}

            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
              {tabelaDetalhada.tabela.ativo ? (
                <Badge variant="default" className="bg-[#7BD9F6] bg-opacity-30 text-[#0F172A] hover:bg-[#7BD9F6] bg-opacity-30">
                  Ativa
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                  Inativa
                </Badge>
              )}
            </div>

            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Última Atualização</h3>
              <p>
                {tabelaDetalhada.tabela.updated_at
                  ? new Date(tabelaDetalhada.tabela.updated_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Não disponível"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Faixas Etárias e Valores</CardTitle>
            <CardDescription>Valores por faixa etária definidos nesta tabela.</CardDescription>
          </CardHeader>
          <CardContent>
            {tabelaDetalhada.faixas.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nenhuma faixa etária</AlertTitle>
                <AlertDescription>Esta tabela não possui faixas etárias definidas.</AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faixa Etária</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabelaDetalhada.faixas
                    .sort((a, b) => {
                      // Ordenar faixas etárias de forma lógica
                      const getMinAge = (faixa: string) => {
                        if (faixa.includes("-")) {
                          return Number.parseInt(faixa.split("-")[0], 10)
                        }
                        if (faixa.includes("+")) {
                          return Number.parseInt(faixa.replace("+", ""), 10)
                        }
                        return Number.parseInt(faixa, 10)
                      }

                      return getMinAge(a.faixa_etaria) - getMinAge(b.faixa_etaria)
                    })
                    .map((faixa) => (
                      <TableRow key={faixa.id}>
                        <TableCell className="font-medium">{faixa.faixa_etaria}</TableCell>
                        <TableCell className="text-right">{formatarValor(faixa.valor)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
