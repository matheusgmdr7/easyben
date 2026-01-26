"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, X, Table2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buscarTabelasPrecos } from "@/services/tabelas-service"

interface Step2TabelaPrecosProps {
  formData: any
  updateFormData: (data: any) => void
}

export default function Step2TabelaPrecos({
  formData,
  updateFormData,
}: Step2TabelaPrecosProps) {
  const [tabelas, setTabelas] = useState<any[]>([])
  const [carregandoTabelas, setCarregandoTabelas] = useState(false)
  const [usarTabelaExistente, setUsarTabelaExistente] = useState(!!formData.tabela_id)

  useEffect(() => {
    carregarTabelas()
  }, [])

  async function carregarTabelas() {
    try {
      setCarregandoTabelas(true)
      const data = await buscarTabelasPrecos()
      setTabelas(data.filter((t) => t.ativo))
    } catch (error) {
      console.error("Erro ao carregar tabelas:", error)
    } finally {
      setCarregandoTabelas(false)
    }
  }

  const handleFaixaEtariaChange = (index: number, field: "faixa_etaria" | "valor", value: string) => {
    const novasFaixas = [...formData.faixasEtarias]
    novasFaixas[index][field] = value
    updateFormData({ faixasEtarias: novasFaixas })
  }

  const handleAddFaixaEtaria = () => {
    updateFormData({
      faixasEtarias: [...formData.faixasEtarias, { faixa_etaria: "", valor: "" }],
    })
  }

  const handleRemoveFaixaEtaria = (index: number) => {
    const novasFaixas = formData.faixasEtarias.filter((_: any, i: number) => i !== index)
    updateFormData({ faixasEtarias: novasFaixas })
  }

  const handleTabelaChange = (value: string) => {
    if (value === "nova") {
      setUsarTabelaExistente(false)
      updateFormData({ tabela_id: null })
    } else {
      setUsarTabelaExistente(true)
      updateFormData({ tabela_id: value })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Tabela de Preços</h3>
        <p className="text-sm text-gray-600 mb-6">
          Vincule uma tabela existente ou configure uma nova tabela de preços para o produto
        </p>
      </div>

      {/* Seleção de Tabela */}
      <div className="space-y-2">
        <Label className="font-semibold">Vincular Tabela</Label>
        <div className="relative">
          <Table2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
          <Select
            value={usarTabelaExistente && formData.tabela_id ? formData.tabela_id : "nova"}
            onValueChange={handleTabelaChange}
            disabled={carregandoTabelas}
          >
            <SelectTrigger className="pl-10 w-full border-2 border-gray-300">
              <SelectValue placeholder={carregandoTabelas ? "Carregando..." : "Selecione uma tabela ou crie nova"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nova">Criar nova tabela de preços</SelectItem>
              {tabelas.map((tabela) => (
                <SelectItem key={tabela.id} value={tabela.id}>
                  {tabela.titulo} - {tabela.operadora || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {usarTabelaExistente
            ? "O produto será vinculado à tabela selecionada. Você pode vincular a uma tabela diferente posteriormente."
            : "Configure as faixas etárias e valores abaixo para criar uma nova tabela de preços."}
        </p>
      </div>

      {/* Configuração de Nova Tabela */}
      {!usarTabelaExistente && (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Faixas Etárias e Valores</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddFaixaEtaria}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Faixa
          </Button>
        </div>

        <div className="space-y-3">
          {formData.faixasEtarias.map((faixa: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  value={faixa.faixa_etaria}
                  onChange={(e) => handleFaixaEtariaChange(index, "faixa_etaria", e.target.value)}
                  placeholder="Faixa etária (ex: 0-18, 19-23, 59+)"
                  className="border-2 border-gray-300"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={faixa.valor}
                  onChange={(e) => handleFaixaEtariaChange(index, "valor", e.target.value)}
                  placeholder="Valor (R$)"
                  className="border-2 border-gray-300"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveFaixaEtaria(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

          {formData.faixasEtarias.length === 0 && (
            <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
              <p>Nenhuma faixa etária adicionada</p>
              <p className="text-sm mt-1">Clique em "Adicionar Faixa" para começar</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
