"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { OperadorasService } from "@/services/operadoras-service"
import { Building2 } from "lucide-react"

interface Step1DetalhesProdutoProps {
  formData: any
  updateFormData: (data: any) => void
}

const ESTADOS_BRASIL = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
]

export default function Step1DetalhesProduto({
  formData,
  updateFormData,
}: Step1DetalhesProdutoProps) {
  const [operadoras, setOperadoras] = useState<any[]>([])
  const [carregandoOperadoras, setCarregandoOperadoras] = useState(false)
  const [estadosSelecionados, setEstadosSelecionados] = useState<string[]>(
    formData.area_comercializacao ? (Array.isArray(formData.area_comercializacao) ? formData.area_comercializacao : formData.area_comercializacao.split(",").filter((e: string) => e)) : []
  )

  useEffect(() => {
    carregarOperadoras()
  }, [])

  useEffect(() => {
    updateFormData({ area_comercializacao: estadosSelecionados.join(",") })
  }, [estadosSelecionados])

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

  const handleChange = (field: string, value: any) => {
    updateFormData({ [field]: value })
  }

  const handleEstadoToggle = (estado: string) => {
    setEstadosSelecionados((prev) =>
      prev.includes(estado) ? prev.filter((e) => e !== estado) : [...prev, estado]
    )
  }

  const todosEstadosSelecionados = estadosSelecionados.length === ESTADOS_BRASIL.length
  const algunsEstadosSelecionados = estadosSelecionados.length > 0 && estadosSelecionados.length < ESTADOS_BRASIL.length

  const handleSelecionarTodos = () => {
    if (todosEstadosSelecionados) {
      setEstadosSelecionados([])
    } else {
      setEstadosSelecionados(ESTADOS_BRASIL.map((e) => e.value))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Informações Básicas do Produto</h3>
        <p className="text-sm text-gray-600 mb-6">
          Preencha os dados principais do produto conforme o formulário de referência
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="codigo" className="font-semibold">Código *</Label>
          <Input
            id="codigo"
            value={formData.codigo}
            onChange={(e) => handleChange("codigo", e.target.value)}
            placeholder="Ex: PROD001"
            required
            className="border-2 border-gray-300"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="codigo_externo" className="font-semibold">Código Externo</Label>
          <Input
            id="codigo_externo"
            value={formData.codigo_externo}
            onChange={(e) => handleChange("codigo_externo", e.target.value)}
            placeholder="Código externo do produto"
            className="border-2 border-gray-300"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome" className="font-semibold">Nome do Produto *</Label>
        <Input
          id="nome"
          value={formData.nome}
          onChange={(e) => handleChange("nome", e.target.value)}
          placeholder="Ex: Plano Saúde Total"
          required
          className="border-2 border-gray-300"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="operadora" className="font-semibold">Operadora *</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
            <Select
              value={formData.operadora_id || ""}
              onValueChange={(value) => {
                const operadoraSelecionada = operadoras.find((op) => op.id === value)
                handleChange("operadora_id", value)
                handleChange("operadora", operadoraSelecionada?.nome || "")
              }}
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

        <div className="space-y-2">
          <Label htmlFor="segmentacao" className="font-semibold">Segmentação *</Label>
          <Select
            value={formData.segmentacao}
            onValueChange={(value) => handleChange("segmentacao", value)}
          >
            <SelectTrigger className="w-full border-2 border-gray-300">
              <SelectValue placeholder="Selecione a segmentação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ambulatorial">Ambulatorial</SelectItem>
              <SelectItem value="Hospitalar sem Obstetrícia">Hospitalar sem Obstetrícia</SelectItem>
              <SelectItem value="Hospitalar com Obstetrícia">Hospitalar com Obstetrícia</SelectItem>
              <SelectItem value="Odontológico">Odontológico</SelectItem>
              <SelectItem value="Plano Referência (padrão mínimo da ANS)">Plano Referência (padrão mínimo da ANS)</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contratacao" className="font-semibold">Contratação</Label>
          <Select
            value={formData.contratacao}
            onValueChange={(value) => handleChange("contratacao", value)}
          >
            <SelectTrigger className="border-2 border-gray-300">
              <SelectValue placeholder="Selecione a contratação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Individual/Familiar">Individual/Familiar</SelectItem>
              <SelectItem value="Coletivo por Adesão">Coletivo por Adesão</SelectItem>
              <SelectItem value="Coletivo Empresarial">Coletivo Empresarial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="acomodacoes" className="font-semibold">Acomodações</Label>
          <Select
            value={formData.acomodacoes}
            onValueChange={(value) => handleChange("acomodacoes", value)}
          >
            <SelectTrigger className="border-2 border-gray-300">
              <SelectValue placeholder="Selecione as acomodações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Enfermaria">Enfermaria</SelectItem>
              <SelectItem value="Apartamento">Apartamento</SelectItem>
              <SelectItem value="Ambos">Ambos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="coparticipacao" className="font-semibold">Co-participação</Label>
          <Input
            id="coparticipacao"
            value={formData.coparticipacao}
            onChange={(e) => handleChange("coparticipacao", e.target.value)}
            placeholder="Ex: 30%, 40%"
            className="border-2 border-gray-300"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="abrangencia" className="font-semibold">Abrangência</Label>
          <Select
            value={formData.abrangencia}
            onValueChange={(value) => handleChange("abrangencia", value)}
          >
            <SelectTrigger className="border-2 border-gray-300">
              <SelectValue placeholder="Selecione a abrangência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Nacional">Nacional</SelectItem>
              <SelectItem value="Grupo de Municípios">Grupo de Municípios</SelectItem>
              <SelectItem value="Grupo de Estados">Grupo de Estados</SelectItem>
              <SelectItem value="Municipal">Municipal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="area_comercializacao" className="font-semibold">Área de Comercialização *</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="selecionar-todos"
              checked={todosEstadosSelecionados}
              onCheckedChange={handleSelecionarTodos}
            />
            <label
              htmlFor="selecionar-todos"
              className="text-sm font-medium leading-none cursor-pointer text-[#0F172A] hover:text-[#1E293B]"
            >
              Selecionar todos
            </label>
          </div>
        </div>
        <div className="border-2 border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ESTADOS_BRASIL.map((estado) => (
              <div key={estado.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`estado-${estado.value}`}
                  checked={estadosSelecionados.includes(estado.value)}
                  onCheckedChange={() => handleEstadoToggle(estado.value)}
                />
                <label
                  htmlFor={`estado-${estado.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {estado.label}
                </label>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Selecione os estados onde este produto pode ser comercializado. Use "Selecionar todos" para área nacional.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao" className="font-semibold">Descrição</Label>
        <Textarea
          id="descricao"
          value={formData.descricao}
          onChange={(e) => handleChange("descricao", e.target.value)}
          placeholder="Descrição detalhada do produto"
          rows={4}
          className="border-2 border-gray-300"
        />
      </div>
    </div>
  )
}

