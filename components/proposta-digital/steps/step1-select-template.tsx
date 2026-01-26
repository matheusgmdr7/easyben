"use client"

import { useState, useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Loader2, FileText, Building2, Shield, Star } from "lucide-react"
import { buscarModelosPropostasAtivos } from "@/services/modelos-propostas-service"
import type { ModeloProposta } from "@/types/modelos-propostas"

interface Step1SelectTemplateProps {
  onNext: () => void
  corretorPredefinido?: any
}

export default function Step1SelectTemplate({ onNext, corretorPredefinido }: Step1SelectTemplateProps) {
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const [modelos, setModelos] = useState<ModeloProposta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const modeloSelecionado = watch("modelo_id")
  const caracteristicasPlano = watch("caracteristicas_plano")

  useEffect(() => {
    carregarModelos()
  }, [])

  const carregarModelos = async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await buscarModelosPropostasAtivos()
      setModelos(dados)

      // Se houver apenas um modelo, selecionar automaticamente
      if (dados.length === 1) {
        setValue("modelo_id", dados[0].id)
        setValue("template_titulo", dados[0].titulo)
      }
    } catch (error) {
      console.error("Erro ao carregar modelos:", error)
      setErro("Erro ao carregar modelos de proposta. Tente novamente.")
    } finally {
      setCarregando(false)
    }
  }

  const selecionarModelo = (modelo: ModeloProposta) => {
    setValue("modelo_id", modelo.id)
    setValue("template_titulo", modelo.titulo)
  }

  const podeAvancar = modeloSelecionado && !carregando

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando modelos de proposta...</p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-600 mb-4">{erro}</p>
          <Button onClick={carregarModelos} variant="outline">
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  if (modelos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <FileText className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Nenhum modelo disponível</h3>
          <p className="text-yellow-600 mb-4">Não há modelos de proposta ativos no momento.</p>
          <Button onClick={carregarModelos} variant="outline">
            Recarregar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Selecione o Modelo de Proposta</h2>
        <p className="text-gray-600">Escolha o modelo que melhor se adequa ao seu plano de saúde</p>
      </div>

      {/* Modelos Disponíveis */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modelos.map((modelo) => (
          <Card
            key={modelo.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              modeloSelecionado === modelo.id
                ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50"
                : "hover:border-gray-300"
            }`}
            onClick={() => selecionarModelo(modelo)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{modelo.titulo}</CardTitle>
                </div>
                {modeloSelecionado === modelo.id && (
                  <Badge variant="default" className="bg-blue-600">
                    <Star className="h-3 w-3 mr-1" />
                    Selecionado
                  </Badge>
                )}
              </div>
              {modelo.descricao && <CardDescription className="text-sm">{modelo.descricao}</CardDescription>}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>Modelo Oficial</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
                  <span>PDF</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Características do Plano */}
      {modeloSelecionado && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Características do Plano</span>
            </CardTitle>
            <CardDescription>
              Descreva as características específicas e diferenciais do plano que será oferecido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="caracteristicas_plano"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Características e Diferenciais do Plano</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Cobertura nacional, rede credenciada ampla, atendimento 24h, telemedicina incluída, sem carência para emergências..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-gray-500 mt-1">
                    Essas informações aparecerão na proposta para destacar os benefícios do plano
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* Informações do Corretor */}
      {corretorPredefinido && (
        <Card className="bg-[#7BD9F6] bg-opacity-20 border-[#7BD9F6] border-opacity-30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#0F172A] flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Corretor Responsável</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-[#0F172A]">Nome:</span>
                <p className="text-[#0F172A]">{corretorPredefinido.nome}</p>
              </div>
              <div>
                <span className="font-medium text-[#0F172A]">Email:</span>
                <p className="text-[#0F172A]">{corretorPredefinido.email}</p>
              </div>
              <div>
                <span className="font-medium text-[#0F172A]">Telefone:</span>
                <p className="text-[#0F172A]">{corretorPredefinido.telefone}</p>
              </div>
              <div>
                <span className="font-medium text-[#0F172A]">SUSEP:</span>
                <p className="text-[#0F172A]">{corretorPredefinido.susep}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão de Avançar */}
      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!podeAvancar} className="px-8 py-2">
          {!modeloSelecionado ? "Selecione um modelo" : "Próximo: Dados do Plano"}
        </Button>
      </div>

      {/* Resumo da Seleção */}
      {modeloSelecionado && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-2 text-blue-800">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Modelo Selecionado:</span>
          </div>
          <p className="text-blue-700 mt-1">{modelos.find((m) => m.id === modeloSelecionado)?.titulo}</p>
          {caracteristicasPlano && (
            <div className="mt-3">
              <span className="font-medium text-blue-800">Características:</span>
              <p className="text-blue-700 text-sm mt-1 line-clamp-3">{caracteristicasPlano}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
