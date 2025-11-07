"use client"

import { useState, useEffect } from "react"
import { AdministradorasService, type Administradora } from "@/services/administradoras-service"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building, 
  Plus, 
  Search, 
  Edit2, 
  Eye, 
  Users,
  DollarSign,
  FileText,
  Settings,
  Mail,
  Phone,
  CheckCircle
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import ModalNovaAdministradora from "@/components/admin/modals/modal-nova-administradora"
import ModalEditarAdministradora from "@/components/admin/modals/modal-editar-administradora"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Função para formatar telefone
function formatarTelefone(valor: string): string {
  // Remove tudo que não é número
  const apenasNumeros = valor.replace(/\D/g, '')
  
  // Aplica a máscara
  if (apenasNumeros.length <= 10) {
    // Formato: (00) 0000-0000
    return apenasNumeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  } else {
    // Formato: (00) 00000-0000
    return apenasNumeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }
}

// Função para formatar CNPJ
function formatarCNPJ(valor: string): string {
  // Remove tudo que não é número
  const apenasNumeros = valor.replace(/\D/g, '')
  
  // Aplica a máscara: 00.000.000/0000-00
  return apenasNumeros
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function AdministradorasPage() {
  const router = useRouter()
  const [administradoras, setAdministradoras] = useState<Administradora[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [showModalNova, setShowModalNova] = useState(false)
  const [showModalEditar, setShowModalEditar] = useState(false)
  const [administradoraEditando, setAdministradoraEditando] = useState<Administradora | null>(null)
  const [saving, setSaving] = useState(false)

  // Estados para formulário
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    observacoes: "",
  })

  useEffect(() => {
    carregarAdministradoras()
  }, [])

  async function carregarAdministradoras() {
    try {
      setLoading(true)
      const data = await AdministradorasService.buscarTodas()
      setAdministradoras(data)
    } catch (error: any) {
      console.error("❌ Erro ao carregar administradoras:", error)
      toast.error("Erro ao carregar administradoras")
    } finally {
      setLoading(false)
    }
  }

  async function handleCriar() {
    try {
      setSaving(true)

      // Validações básicas
      if (!formData.nome || !formData.cnpj) {
        toast.error("Preencha os campos obrigatórios")
        return
      }

      await AdministradorasService.criar(formData)
      toast.success("Administradora criada com sucesso!")
      setShowModalNova(false)
      limparFormulario()
      carregarAdministradoras()
    } catch (error: any) {
      console.error("❌ Erro ao criar administradora:", error)
      toast.error("Erro ao criar administradora: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAtualizar() {
    if (!administradoraEditando) return

    try {
      setSaving(true)
      await AdministradorasService.atualizar(administradoraEditando.id, formData)
      toast.success("Administradora atualizada com sucesso!")
      setShowModalEditar(false)
      setAdministradoraEditando(null)
      limparFormulario()
      carregarAdministradoras()
    } catch (error: any) {
      console.error("❌ Erro ao atualizar administradora:", error)
      toast.error("Erro ao atualizar administradora: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  function abrirModalEditar(administradora: Administradora) {
    setAdministradoraEditando(administradora)
    setFormData({
      nome: administradora.nome,
      cnpj: administradora.cnpj,
      email: administradora.email || "",
      telefone: administradora.telefone || "",
      observacoes: administradora.observacoes || "",
    })
    setShowModalEditar(true)
  }

  function limparFormulario() {
    setFormData({
      nome: "",
      cnpj: "",
      email: "",
      telefone: "",
      observacoes: "",
    })
  }

  async function handleInativar(id: string) {
    if (!confirm("Tem certeza que deseja inativar esta administradora?")) return

    try {
      await AdministradorasService.alterarStatus(id, "inativa")
      toast.success("Administradora inativada com sucesso!")
      carregarAdministradoras()
    } catch (error) {
      console.error("❌ Erro ao inativar:", error)
      toast.error("Erro ao inativar administradora")
    }
  }

  function verDetalhes(id: string) {
    router.push(`/admin/administradoras/${id}`)
  }

  // Filtrar administradoras
  const administradorasFiltradas = administradoras.filter((adm) => {
    const matchNome = adm.nome.toLowerCase().includes(filtro.toLowerCase())
    const matchCnpj = adm.cnpj.includes(filtro)
    const matchStatus = statusFiltro === "todos" || adm.status === statusFiltro

    return (matchNome || matchCnpj) && matchStatus
  })

  const getStatusBadge = (status: string) => {
    const badges = {
      ativa: "bg-green-50 text-green-700 border border-green-200",
      inativa: "bg-gray-50 text-gray-700 border border-gray-200",
      suspensa: "bg-red-50 text-red-700 border border-red-200",
    }
    return badges[status as keyof typeof badges] || badges.inativa
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans flex items-center gap-2">
              <Building className="h-6 w-6 text-[#168979]" />
              Administradoras
            </h1>
            <p className="text-gray-600 mt-1 font-medium">
              Gerencie as administradoras de planos de saúde
            </p>
          </div>
          <Button
            onClick={() => setShowModalNova(true)}
            className="bg-[#168979] hover:bg-[#13786a] text-white font-bold px-6 py-2 btn-corporate shadow-corporate flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Administradora
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
          <div className="flex-1 w-full sm:w-auto">
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Nome ou CNPJ..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Status
            </label>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
                <SelectItem value="suspensa">Suspensa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista de Administradoras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {administradorasFiltradas.map((administradora) => (
          <div 
            key={administradora.id} 
            className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-5 w-5 text-[#168979]" />
                    <h3 className="text-lg font-bold text-gray-900 font-sans">
                      {administradora.nome}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    CNPJ: {administradora.cnpj}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(
                    administradora.status
                  )}`}
                >
                  {administradora.status}
                </span>
              </div>

              <div className="space-y-2 mb-6 min-h-[60px]">
                {administradora.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{administradora.email}</span>
                  </div>
                )}
                {administradora.telefone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{administradora.telefone}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => verDetalhes(administradora.id)}
                  className="flex-1 bg-[#168979] hover:bg-[#13786a] text-white font-bold btn-corporate-sm"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalhes
                </Button>
                <Button
                  onClick={() => abrirModalEditar(administradora)}
                  variant="outline"
                  size="sm"
                  className="border-[#168979] text-[#168979] hover:bg-[#168979] hover:text-white transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {administradorasFiltradas.length === 0 && (
        <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm rounded-lg p-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhuma administradora encontrada</h3>
            <p className="text-gray-500 text-sm mb-4">
              {filtro || statusFiltro !== "todos"
                ? "Tente ajustar os filtros de busca"
                : "Comece cadastrando uma nova administradora"}
            </p>
            {!filtro && statusFiltro === "todos" && (
              <Button
                onClick={() => setShowModalNova(true)}
                className="bg-[#168979] hover:bg-[#13786a] text-white font-bold btn-corporate shadow-corporate"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Administradora
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Modal Nova Administradora */}
      <ModalNovaAdministradora
        isOpen={showModalNova}
        onClose={() => setShowModalNova(false)}
        onSave={handleCriar}
        saving={saving}
        formData={formData}
        setFormData={setFormData}
        formatarCNPJ={formatarCNPJ}
        formatarTelefone={formatarTelefone}
        limparFormulario={limparFormulario}
      />

      {/* Modal Editar Administradora */}
      <ModalEditarAdministradora
        isOpen={showModalEditar}
        onClose={() => {
          setShowModalEditar(false)
          setAdministradoraEditando(null)
        }}
        onSave={handleAtualizar}
        saving={saving}
        formData={formData}
        setFormData={setFormData}
        formatarCNPJ={formatarCNPJ}
        formatarTelefone={formatarTelefone}
        limparFormulario={limparFormulario}
      />
    </div>
  )
}
