"use client"

import { useState, useEffect } from "react"
import { AdministradorasService, type Administradora } from "@/services/administradoras-service"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import ModalNovaAdministradora from "@/components/admin/modals/modal-nova-administradora"
import ModalEditarAdministradora from "@/components/admin/modals/modal-editar-administradora"

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

  // Filtrar administradoras
  const administradorasFiltradas = administradoras.filter((adm) => {
    const matchNome = adm.nome.toLowerCase().includes(filtro.toLowerCase())
    const matchCnpj = adm.cnpj.includes(filtro)
    const matchStatus = statusFiltro === "todos" || adm.status === statusFiltro

    return (matchNome || matchCnpj) && matchStatus
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-corporate"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Administradoras</h1>
          <p className="text-sm text-gray-600 mt-1">Gerencie as administradoras de planos de saúde</p>
        </div>
        <Button onClick={() => setShowModalNova(true)} className="bg-[#0F172A] hover:bg-[#1E293B]">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Administradora
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
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
          ) : administradorasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {filtro ? "Nenhuma administradora encontrada" : "Nenhuma administradora cadastrada"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Nome</TableHead>
                    <TableHead className="font-bold">CNPJ</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Telefone</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {administradorasFiltradas.map((administradora) => (
                    <TableRow key={administradora.id}>
                      <TableCell className="font-bold">{administradora.nome}</TableCell>
                      <TableCell>{formatarCNPJ(administradora.cnpj)}</TableCell>
                      <TableCell>{administradora.email || "-"}</TableCell>
                      <TableCell>{administradora.telefone ? formatarTelefone(administradora.telefone) : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={administradora.status === "ativa" ? "default" : "secondary"}>
                          {administradora.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirModalEditar(administradora)}
                          >
                            <Edit2 className="h-4 w-4" />
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
