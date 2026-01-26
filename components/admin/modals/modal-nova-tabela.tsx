"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Table2, 
  XCircle, 
  Building2,
  Package,
  Calendar,
  FileText
} from "lucide-react"
import type React from "react"
import { useModalOverlay } from "@/hooks/use-modal-overlay"
import { OperadorasService } from "@/services/operadoras-service"
import { obterProdutosCorretores } from "@/services/produtos-corretores-service"

interface ModalNovaTabelaProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  saving: boolean
}

export default function ModalNovaTabela({
  isOpen,
  onClose,
  onSave,
  saving
}: ModalNovaTabelaProps) {
  useModalOverlay(isOpen)
  
  const [operadoras, setOperadoras] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [produtosFiltrados, setProdutosFiltrados] = useState<any[]>([])
  const [carregandoOperadoras, setCarregandoOperadoras] = useState(false)
  const [carregandoProdutos, setCarregandoProdutos] = useState(false)

  const [formData, setFormData] = useState({
    operadora_id: "",
    produto_id: "",
    nome: "",
    acomodacao: "",
    data_fechamento: "",
    data_vencimento: "",
    data_vigencia: "",
  })

  const ACOMODACOES = [
    { value: "Enfermaria", label: "Enfermaria" },
    { value: "Apartamento", label: "Apartamento" },
    { value: "Coletivo", label: "Coletivo" },
  ]

  useEffect(() => {
    if (isOpen) {
      carregarOperadoras()
      carregarProdutos()
    }
  }, [isOpen])

  useEffect(() => {
    if (formData.operadora_id) {
      filtrarProdutosPorOperadora()
    } else {
      setProdutosFiltrados([])
      setFormData(prev => ({ ...prev, produto_id: "" }))
    }
  }, [formData.operadora_id, produtos])

  async function carregarOperadoras() {
    try {
      setCarregandoOperadoras(true)
      const data = await OperadorasService.buscarTodas()
      setOperadoras(data)
    } catch (error) {
      console.error("Erro ao carregar operadoras:", error)
    } finally {
      setCarregandoOperadoras(false)
    }
  }

  async function carregarProdutos() {
    try {
      setCarregandoProdutos(true)
      const data = await obterProdutosCorretores()
      setProdutos(data)
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
    } finally {
      setCarregandoProdutos(false)
    }
  }

  function filtrarProdutosPorOperadora() {
    if (!formData.operadora_id) {
      setProdutosFiltrados([])
      return
    }

    const operadoraSelecionada = operadoras.find(op => op.id === formData.operadora_id)
    if (!operadoraSelecionada) {
      setProdutosFiltrados([])
      return
    }

    // Filtrar produtos pela operadora (pode ser pelo nome ou por operadora_id se existir)
    const filtrados = produtos.filter(produto => 
      produto.operadora === operadoraSelecionada.nome || 
      produto.operadora_id === operadoraSelecionada.id
    )
    setProdutosFiltrados(filtrados)
  }

  const handleSave = async () => {
    if (!formData.operadora_id || !formData.produto_id || !formData.nome || 
        !formData.acomodacao || !formData.data_fechamento || !formData.data_vencimento || !formData.data_vigencia) {
      return
    }

    const operadoraSelecionada = operadoras.find(op => op.id === formData.operadora_id)
    const produtoSelecionado = produtosFiltrados.find(p => p.id === formData.produto_id)

    const dadosParaSalvar = {
      titulo: formData.nome,
      operadora: operadoraSelecionada?.nome || "",
      operadora_id: formData.operadora_id,
      produto_id: formData.produto_id,
      produto_nome: produtoSelecionado?.nome || "",
      segmentacao: formData.acomodacao, // Salvar como segmentacao no banco
      acomodacao: formData.acomodacao,
      data_fechamento: formData.data_fechamento,
      data_vencimento: formData.data_vencimento,
      data_vigencia: formData.data_vigencia,
      data: formData.data_fechamento, // Para compatibilidade
      ativo: true,
    }

    await onSave(dadosParaSalvar)
  }

  const handleClose = () => {
    setFormData({
      operadora_id: "",
      produto_id: "",
      nome: "",
      acomodacao: "",
      data_fechamento: "",
      data_vencimento: "",
      data_vigencia: "",
    })
    setProdutosFiltrados([])
    onClose()
  }

  if (!isOpen) return null

  const isFormValid = formData.operadora_id && formData.produto_id && formData.nome && 
                      formData.acomodacao && formData.data_fechamento && formData.data_vencimento && formData.data_vigencia

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Table2 className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Nova Tabela de Preços</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Operadora */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Operadora <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                <Select
                  value={formData.operadora_id}
                  onValueChange={(value) => setFormData({ ...formData, operadora_id: value, produto_id: "" })}
                  disabled={carregandoOperadoras}
                >
                  <SelectTrigger className="pl-10 w-full border-2 border-gray-300">
                    <SelectValue placeholder={carregandoOperadoras ? "Carregando..." : "Selecione a operadora"} />
                  </SelectTrigger>
                  <SelectContent>
                    {operadoras.map((operadora) => (
                      <SelectItem key={operadora.id} value={operadora.id}>
                        {operadora.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Produto */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Produto <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                <Select
                  value={formData.produto_id}
                  onValueChange={(value) => setFormData({ ...formData, produto_id: value })}
                  disabled={!formData.operadora_id || carregandoProdutos || produtosFiltrados.length === 0}
                >
                  <SelectTrigger className="pl-10 w-full border-2 border-gray-300">
                    <SelectValue 
                      placeholder={
                        !formData.operadora_id 
                          ? "Selecione a operadora primeiro" 
                          : carregandoProdutos 
                            ? "Carregando..." 
                            : produtosFiltrados.length === 0
                              ? "Nenhum produto disponível"
                              : "Selecione o produto"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {produtosFiltrados.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nome da Tabela */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nome da Tabela <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                <Input
                  type="text"
                  placeholder="Digite o nome da tabela"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="pl-10 w-full border-2 border-gray-300"
                />
              </div>
            </div>

            {/* Acomodação */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Acomodação <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.acomodacao}
                onValueChange={(value) => setFormData({ ...formData, acomodacao: value })}
              >
                <SelectTrigger className="w-full border-2 border-gray-300">
                  <SelectValue placeholder="Selecione a acomodação" />
                </SelectTrigger>
                <SelectContent>
                  {ACOMODACOES.map((acomodacao) => (
                    <SelectItem key={acomodacao.value} value={acomodacao.value}>
                      {acomodacao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Data de Fechamento <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                  <Input
                    type="date"
                    value={formData.data_fechamento}
                    onChange={(e) => setFormData({ ...formData, data_fechamento: e.target.value })}
                    className="pl-10 w-full border-2 border-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Data de Vencimento <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                  <Input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="pl-10 w-full border-2 border-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Data de Vigência <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                  <Input
                    type="date"
                    value={formData.data_vigencia}
                    onChange={(e) => setFormData({ ...formData, data_vigencia: e.target.value })}
                    className="pl-10 w-full border-2 border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={saving}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid || saving}
              className="bg-[#0F172A] hover:bg-[#1E293B] text-white"
            >
              {saving ? "Salvando..." : "Criar Tabela"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

