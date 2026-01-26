"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import { listarModelosPropostasAtivos } from "@/services/modelos-propostas-service"
import type { ModeloProposta } from "@/types/modelos-propostas"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export default function ModelosPropostasPage() {
  const [modelos, setModelos] = useState<ModeloProposta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function carregarModelos() {
      try {
        setLoading(true)
        const data = await listarModelosPropostasAtivos()
        setModelos(data)
      } catch (error) {
        console.error("Erro ao carregar modelos de propostas:", error)
        setError("Não foi possível carregar os modelos de propostas")
        toast.error("Erro ao carregar modelos de propostas")
      } finally {
        setLoading(false)
      }
    }

    carregarModelos()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modelos de Propostas</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Erro ao carregar modelos</h3>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : modelos.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum modelo disponível</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Ainda não há modelos de propostas disponíveis para você.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modelos.map((modelo) => (
            <Card key={modelo.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{modelo.titulo}</CardTitle>
                <CardDescription>{modelo.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-500">Produto: {modelo.produto_nome}</p>
              </CardContent>
              {modelo.arquivo_url && (
                <Button asChild className="mt-auto bg-[#0F172A] hover:bg-[#1E293B]">
                  <a href={modelo.arquivo_url} target="_blank" rel="noopener noreferrer">
                    Visualizar Modelo
                  </a>
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
