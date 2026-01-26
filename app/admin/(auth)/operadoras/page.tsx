"use client"

import { useState, useEffect } from "react"
import { OperadorasService, type Operadora, type CriarOperadoraData } from "@/services/operadoras-service"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
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
import ModalNovaOperadora from "@/components/admin/modals/modal-nova-operadora"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Função para formatar CNPJ
function formatarCNPJ(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, "")
  return apenasNumeros
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

// Função para formatar CEP
function formatarCEP(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, "")
  return apenasNumeros.replace(/^(\d{5})(\d)/, "$1-$2")
}

// Função para formatar telefone
function formatarTelefone(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, "")
  if (apenasNumeros.length <= 10) {
    return apenasNumeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  } else {
    return apenasNumeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
  }
}

// Estados brasileiros
const ESTADOS = [
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

export default function OperadorasPage() {
  const [operadoras, setOperadoras] = useState<Operadora[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [operadoraEditando, setOperadoraEditando] = useState<Operadora | null>(null)
  const [saving, setSaving] = useState(false)

  // Estados do formulário
  const [formData, setFormData] = useState<CriarOperadoraData>({
    nome: "",
    fantasia: "",
    cnpj: "",
    ans: "",
    email: "",
    telefone: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  })

  // Estados para cidades (será carregado baseado no UF selecionado)
  const [cidades, setCidades] = useState<string[]>([])
  const [carregandoCidades, setCarregandoCidades] = useState(false)

  useEffect(() => {
    carregarOperadoras()
  }, [])

  // Buscar cidades quando UF for selecionado
  useEffect(() => {
    if (formData.uf && formData.uf.length === 2) {
      buscarCidades(formData.uf)
    } else {
      setCidades([])
    }
  }, [formData.uf])

  // Buscar CEP quando preenchido
  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "")
    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
        const data = await response.json()
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf,
          }))
          // Buscar cidades do estado após preencher UF via CEP
          if (data.uf) {
            buscarCidades(data.uf)
          }
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error)
      }
    }
  }

  // Buscar cidades do IBGE baseado no UF
  const buscarCidades = async (uf: string) => {
    if (!uf || uf.length !== 2) {
      setCidades([])
      return
    }

    try {
      setCarregandoCidades(true)
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      const data = await response.json()
      
      if (Array.isArray(data)) {
        const nomesCidades = data.map((municipio: any) => municipio.nome).sort()
        setCidades(nomesCidades)
      } else {
        setCidades([])
      }
    } catch (error) {
      console.error("Erro ao buscar cidades:", error)
      setCidades([])
      toast.error("Erro ao carregar cidades. Você pode digitar a cidade manualmente.")
    } finally {
      setCarregandoCidades(false)
    }
  }

  async function carregarOperadoras() {
    try {
      setLoading(true)
      const data = await OperadorasService.buscarTodas()
      setOperadoras(data)
    } catch (error: any) {
      console.error("❌ Erro ao carregar operadoras:", error)
      toast.error("Erro ao carregar operadoras")
    } finally {
      setLoading(false)
    }
  }

  function limparFormulario() {
    setFormData({
      nome: "",
      fantasia: "",
      cnpj: "",
      ans: "",
      email: "",
      telefone: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
    })
    setCidades([])
  }

  function abrirModalNova() {
    setIsEditing(false)
    setOperadoraEditando(null)
    limparFormulario()
    setIsDialogOpen(true)
  }

  async function abrirModalEditar(operadora: Operadora) {
    setIsEditing(true)
    setOperadoraEditando(operadora)
    setFormData({
      nome: operadora.nome,
      fantasia: operadora.fantasia,
      cnpj: formatarCNPJ(operadora.cnpj),
      ans: operadora.ans,
      email: operadora.email || "",
      telefone: operadora.telefone ? formatarTelefone(operadora.telefone) : "",
      cep: formatarCEP(operadora.cep),
      endereco: operadora.endereco,
      numero: operadora.numero || "",
      complemento: operadora.complemento || "",
      bairro: operadora.bairro || "",
      cidade: operadora.cidade,
      uf: operadora.uf,
    })
    // Carregar cidades do estado ao editar
    if (operadora.uf) {
      await buscarCidades(operadora.uf)
    }
    setIsDialogOpen(true)
  }

  async function handleSalvar() {
    try {
      setSaving(true)

      // Validações
      if (!formData.nome || !formData.fantasia || !formData.cnpj || !formData.ans || !formData.cep || !formData.endereco || !formData.cidade || !formData.uf) {
        toast.error("Preencha todos os campos obrigatórios")
        return
      }

      if (isEditing && operadoraEditando) {
        await OperadorasService.atualizar(operadoraEditando.id, formData)
        toast.success("Operadora atualizada com sucesso!")
      } else {
        await OperadorasService.criar(formData)
        toast.success("Operadora criada com sucesso!")
      }

      setIsDialogOpen(false)
      carregarOperadoras()
    } catch (error: any) {
      console.error("❌ Erro ao salvar operadora:", error)
      toast.error(error.message || "Erro ao salvar operadora")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletar(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta operadora?")) return

    try {
      await OperadorasService.deletar(id)
      toast.success("Operadora excluída com sucesso!")
      carregarOperadoras()
    } catch (error: any) {
      console.error("❌ Erro ao deletar operadora:", error)
      toast.error(error.message || "Erro ao deletar operadora")
    }
  }

  const operadorasFiltradas = operadoras.filter((operadora) => {
    const termo = searchTerm.toLowerCase()
    return (
      operadora.nome.toLowerCase().includes(termo) ||
      operadora.fantasia.toLowerCase().includes(termo) ||
      operadora.cnpj.includes(termo) ||
      operadora.ans.toLowerCase().includes(termo) ||
      operadora.cidade.toLowerCase().includes(termo) ||
      operadora.uf.toLowerCase().includes(termo)
    )
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Operadoras</h1>
          <p className="text-sm text-gray-600 mt-1">Gerencie as operadoras de saúde</p>
        </div>
        <Button onClick={abrirModalNova} className="bg-[#0F172A] hover:bg-[#1E293B]">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Operadora
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome, fantasia, CNPJ, ANS, cidade ou UF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-2 border-gray-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : operadorasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "Nenhuma operadora encontrada" : "Nenhuma operadora cadastrada"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Fantasia</TableHead>
                    <TableHead className="font-bold">Nome</TableHead>
                    <TableHead className="font-bold">CNPJ</TableHead>
                    <TableHead className="font-bold">ANS</TableHead>
                    <TableHead className="font-bold">Cidade/UF</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operadorasFiltradas.map((operadora) => (
                    <TableRow key={operadora.id}>
                      <TableCell className="font-bold">{operadora.fantasia}</TableCell>
                      <TableCell className="font-medium">{operadora.nome}</TableCell>
                      <TableCell>{formatarCNPJ(operadora.cnpj)}</TableCell>
                      <TableCell>{operadora.ans}</TableCell>
                      <TableCell>
                        {operadora.cidade}/{operadora.uf}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirModalEditar(operadora)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletar(operadora.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro */}
      {!isEditing && (
        <ModalNovaOperadora
          isOpen={isDialogOpen && !isEditing}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSalvar}
          saving={saving}
          formData={formData}
          setFormData={setFormData}
          formatarCNPJ={formatarCNPJ}
          formatarCEP={formatarCEP}
          formatarTelefone={formatarTelefone}
          buscarCEP={buscarCEP}
          cidades={cidades}
          carregandoCidades={carregandoCidades}
          estados={ESTADOS}
          limparFormulario={limparFormulario}
        />
      )}

      {/* Modal de Edição - manter Dialog antigo por enquanto */}
      {isEditing && (
      <Dialog open={isDialogOpen && isEditing} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">
              Editar Operadora
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              Campos obrigatórios marcados com o símbolo: *
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="font-bold">
                  CNPJ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => {
                    const valor = formatarCNPJ(e.target.value)
                    setFormData({ ...formData, cnpj: valor })
                  }}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="border-2 border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ans" className="font-bold">
                  ANS <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ans"
                  value={formData.ans}
                  onChange={(e) => setFormData({ ...formData, ans: e.target.value })}
                  placeholder="Número ANS"
                  className="border-2 border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="font-bold">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => {
                    const valor = formatarTelefone(e.target.value)
                    setFormData({ ...formData, telefone: valor })
                  }}
                  placeholder="(00) 00000-0000"
                  className="border-2 border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cep" className="font-bold">
                  CEP <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => {
                    const valor = formatarCEP(e.target.value)
                    setFormData({ ...formData, cep: valor })
                    buscarCEP(valor)
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                  className="border-2 border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complemento" className="font-bold">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  placeholder="Apto, Bloco, etc"
                  className="border-2 border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uf" className="font-bold">UF</Label>
                <Select
                  value={formData.uf}
                  onValueChange={(value) => {
                    setFormData({ ...formData, uf: value, cidade: "" })
                    setCidades([]) // Resetar cidades quando UF mudar
                  }}
                >
                  <SelectTrigger className="border-2 border-gray-300">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value}>
                        {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="font-bold">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome da operadora"
                  className="border-2 border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fantasia" className="font-bold">
                  Fantasia <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fantasia"
                  value={formData.fantasia}
                  onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })}
                  placeholder="Nome fantasia"
                  className="border-2 border-gray-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="border-2 border-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="endereco" className="font-bold">
                    Endereço <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, Avenida, etc"
                    className="border-2 border-gray-300"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero" className="font-bold">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="123"
                    className="border-2 border-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro" className="font-bold">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Nome do bairro"
                  className="border-2 border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade" className="font-bold">
                  Cidade <span className="text-red-500">*</span>
                </Label>
                {formData.uf ? (
                  <Select
                    value={formData.cidade}
                    onValueChange={(value) => setFormData({ ...formData, cidade: value })}
                    disabled={carregandoCidades}
                  >
                    <SelectTrigger className="border-2 border-gray-300">
                      <SelectValue placeholder={carregandoCidades ? "Carregando cidades..." : "Selecione a cidade"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {carregandoCidades ? (
                        <div className="p-2 text-sm text-gray-500">Carregando cidades...</div>
                      ) : cidades.length > 0 ? (
                        cidades.map((cidade) => (
                          <SelectItem key={cidade} value={cidade}>
                            {cidade}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500">Selecione um estado primeiro</div>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Selecione o estado primeiro"
                    className="border-2 border-gray-300"
                    disabled
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={saving}
              className="bg-[#0F172A] hover:bg-[#1E293B]"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  )
}


