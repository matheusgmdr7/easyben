"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Search, Check } from "lucide-react"
import { OperadorasService, type Operadora } from "@/services/operadoras-service"

export default function NovoContratoPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dados")
  const [loading, setLoading] = useState(false)
  const [operadoras, setOperadoras] = useState<Operadora[]>([])
  const [cnpjBusca, setCnpjBusca] = useState("")

  // Formulário
  const [formData, setFormData] = useState({
    cnpj_operadora: "",
    razao_social: "",
    nome_fantasia: "",
    logo: "",
    descricao: "",
    porcentagem_multa: "0,00",
    validade_carteira: "",
    numero: "",
    observacao: "",
  })

  useEffect(() => {
    carregarOperadoras()
  }, [])

  async function carregarOperadoras() {
    try {
      const data = await OperadorasService.buscarTodas()
      setOperadoras(data)
    } catch (error) {
      console.error("Erro ao carregar operadoras:", error)
    }
  }

  async function buscarOperadoraPorCNPJ() {
    if (!cnpjBusca) {
      toast.error("Digite um CNPJ para buscar")
      return
    }

    try {
      const cnpjLimpo = cnpjBusca.replace(/\D/g, "")
      const operadora = operadoras.find((op) => op.cnpj.replace(/\D/g, "") === cnpjLimpo)
      
      if (operadora) {
        setFormData({
          ...formData,
          cnpj_operadora: operadora.cnpj,
          razao_social: operadora.nome,
          nome_fantasia: operadora.fantasia,
        })
        toast.success("Operadora encontrada")
      } else {
        toast.error("Operadora não encontrada")
      }
    } catch (error) {
      console.error("Erro ao buscar operadora:", error)
      toast.error("Erro ao buscar operadora")
    }
  }

  async function salvarContrato() {
    try {
      setLoading(true)

      // Validações
      if (!formData.cnpj_operadora) {
        toast.error("CNPJ da Operadora é obrigatório")
        return
      }
      if (!formData.razao_social) {
        toast.error("Razão Social é obrigatória")
        return
      }
      if (!formData.nome_fantasia) {
        toast.error("Nome Fantasia é obrigatório")
        return
      }
      if (!formData.descricao) {
        toast.error("Descrição é obrigatória")
        return
      }
      if (!formData.validade_carteira) {
        toast.error("Validade Carteira é obrigatória")
        return
      }
      if (!formData.numero) {
        toast.error("Número é obrigatório")
        return
      }

      // TODO: Implementar criação do contrato
      toast.success("Contrato criado com sucesso!")
      router.push("/administradora/contrato/pesquisar")
    } catch (error: any) {
      console.error("Erro ao salvar contrato:", error)
      toast.error("Erro ao salvar contrato: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Cadastrar Contrato</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/administradora/contrato/pesquisar")}
            variant="outline"
            className="h-9 px-4 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-sm"
          >
            <Search className="h-4 w-4 mr-1" />
            Pesquisar
          </Button>
          <Button
            onClick={() => router.push("/administradora/contrato/novo")}
            className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
          >
            <span>+</span>
            Novo
          </Button>
        </div>
      </div>

      {/* Conteúdo com Abas */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-white border border-gray-200 rounded-sm">
            <TabsTrigger 
              value="dados" 
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white rounded-sm"
            >
              Dados
            </TabsTrigger>
            <TabsTrigger 
              value="produtos"
              className="data-[state=active]:bg-gray-700 data-[state=active]:text-white rounded-sm"
            >
              Produtos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-sm p-6 space-y-4">
              {/* Botão Salvar no topo */}
              <div className="flex justify-end">
                <Button
                  onClick={salvarContrato}
                  disabled={loading}
                  className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>

              {/* Campos do formulário */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    CNPJ da Operadora <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    <Input
                      value={cnpjBusca}
                      onChange={(e) => setCnpjBusca(e.target.value)}
                      placeholder="Digite o CNPJ"
                      className="h-9 text-sm border-gray-300 rounded-sm flex-1"
                    />
                    <Button
                      onClick={buscarOperadoraPorCNPJ}
                      size="sm"
                      className="h-9 px-2 bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
                      title="Buscar"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Razão Social <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value.toUpperCase() })}
                    placeholder="Razão Social"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Nome Fantasia <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value.toUpperCase() })}
                    placeholder="Nome Fantasia"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Logo <span className="text-red-500">*</span>
                  </label>
                  <Select value={formData.logo} onValueChange={(value) => setFormData({ ...formData, logo: value })}>
                    <SelectTrigger className="h-9 text-sm border-gray-300 rounded-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {/* TODO: Listar logos disponíveis */}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
                    placeholder="Descrição"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Porcentagem Multa</label>
                  <Input
                    value={formData.porcentagem_multa}
                    onChange={(e) => setFormData({ ...formData, porcentagem_multa: e.target.value })}
                    placeholder="0,00%"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Validade Carteira <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.validade_carteira}
                    onChange={(e) => setFormData({ ...formData, validade_carteira: e.target.value.toUpperCase() })}
                    placeholder="Validade Carteira"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value.toUpperCase() })}
                    placeholder="Número"
                    className="h-9 text-sm border-gray-300 rounded-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">Observação</label>
                  <Textarea
                    value={formData.observacao}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.length <= 500) {
                        setFormData({ ...formData, observacao: value.toUpperCase() })
                      }
                    }}
                    placeholder="Observação"
                    className="min-h-[100px] text-sm border-gray-300 rounded-sm"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Restam {500 - formData.observacao.length} caracteres.
                  </p>
                </div>
              </div>

              {/* Botão Salvar no final */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  onClick={salvarContrato}
                  disabled={loading}
                  className="h-9 px-4 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-sm"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="produtos" className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-sm p-6">
              <p className="text-sm text-gray-600">Conteúdo da aba Produtos em desenvolvimento</p>
              {/* TODO: Implementar aba de produtos */}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

