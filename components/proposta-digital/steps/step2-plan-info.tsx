"use client"

import { useState, useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { buscarProdutosCorretoresAtivos } from "@/services/produtos-corretores-service"
import { obterValorProdutoPorIdade } from "@/services/produtos-corretores-service"
import { calcularIdade } from "@/utils/formatters"
import type { ProdutoCorretor } from "@/types/corretores"

interface Step2PlanInfoProps {
  onNext: () => void
  onBack: () => void
}

export default function Step2PlanInfo({ onNext, onBack }: Step2PlanInfoProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext()
  const [produtos, setProdutos] = useState<ProdutoCorretor[]>([])
  const [carregando, setCarregando] = useState(true)
  const [calculandoValor, setCalculandoValor] = useState(false)
  const [valorCalculadoAutomaticamente, setValorCalculadoAutomaticamente] = useState(false)

  const produtoSelecionado = watch("produto_id")
  const dataNascimento = watch("data_nascimento")
  const valorPlano = watch("valor_plano")

  useEffect(() => {
    carregarProdutos()
  }, [])

  useEffect(() => {
    if (produtoSelecionado && dataNascimento) {
      calcularValorAutomatico()
    }
  }, [produtoSelecionado, dataNascimento])

  const carregarProdutos = async () => {
    setCarregando(true)
    try {
      const dados = await buscarProdutosCorretoresAtivos()
      setProdutos(dados)
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
    } finally {
      setCarregando(false)
    }
  }

  const calcularValorAutomatico = async () => {
    if (!produtoSelecionado || !dataNascimento) return

    setCalculandoValor(true)
    try {
      const idade = calcularIdade(new Date(dataNascimento))
      const valor = await obterValorProdutoPorIdade(produtoSelecionado, idade)

      if (valor > 0) {
        setValue("valor_plano", valor)
        setValorCalculadoAutomaticamente(true)
      } else {
        setValorCalculadoAutomaticamente(false)
      }
    } catch (error) {
      console.error("Erro ao calcular valor automático:", error)
      setValorCalculadoAutomaticamente(false)
    } finally {
      setCalculandoValor(false)
    }
  }

  const handleProdutoChange = (produtoId: string) => {
    setValue("produto_id", produtoId)

    // Encontrar o produto selecionado e definir o nome
    const produtoEncontrado = produtos.find((p) => p.id === produtoId)
    if (produtoEncontrado) {
      setValue("produto_nome", produtoEncontrado.nome)
      setValue("operadora", produtoEncontrado.operadora)
    }
  }

  const produtoTemTabela = () => {
    if (!produtoSelecionado) return false
    const produto = produtos.find((p) => p.id === produtoSelecionado)
    return produto?.tabela_id ? true : false
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Informações do Plano</h2>

      <div className="grid gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="produto_id">Produto</Label>
                <Select onValueChange={handleProdutoChange} value={produtoSelecionado} disabled={carregando}>
                  <SelectTrigger id="produto_id" className={errors.produto_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} - {produto.operadora}
                        {produto.tabela_id ? " (✓ Tabela)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.produto_id && <p className="text-sm text-red-500">{errors.produto_id.message as string}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valor_plano">Valor do Plano</Label>
                <div className="relative">
                  <Input
                    id="valor_plano"
                    placeholder="0,00"
                    {...register("valor_plano")}
                    className={`pl-8 ${errors.valor_plano ? "border-red-500" : ""} ${valorCalculadoAutomaticamente ? "bg-[#7BD9F6] bg-opacity-20 border-green-300" : ""}`}
                    onChange={(e) => {
                      // Remover formatação ao editar manualmente
                      setValorCalculadoAutomaticamente(false)
                    }}
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                  {calculandoValor && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />
                  )}
                </div>
                {errors.valor_plano && <p className="text-sm text-red-500">{errors.valor_plano.message as string}</p>}
                {valorCalculadoAutomaticamente && (
                  <p className="text-xs text-[#0F172A]">Valor calculado automaticamente pela tabela</p>
                )}
                {produtoSelecionado && !produtoTemTabela() && (
                  <p className="text-xs text-amber-600">Este produto não possui tabela de preços vinculada</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Informações adicionais sobre o plano"
                  {...register("observacoes")}
                  className={errors.observacoes ? "border-red-500" : ""}
                />
                {errors.observacoes && <p className="text-sm text-red-500">{errors.observacoes.message as string}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button type="button" onClick={onNext}>
            Próximo
          </Button>
        </div>
      </div>
    </div>
  )
}
