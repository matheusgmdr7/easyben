"use client"

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
  Building2, 
  XCircle, 
  Mail, 
  Phone,
  MapPin,
  FileText
} from "lucide-react"
import type React from "react"
import { useModalOverlay } from "@/hooks/use-modal-overlay"

interface ModalNovaOperadoraProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  saving: boolean
  formData: {
    nome: string
    fantasia: string
    cnpj: string
    ans: string
    email?: string
    telefone?: string
    cep: string
    endereco: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade: string
    uf: string
  }
  setFormData: (data: any) => void
  formatarCNPJ: (valor: string) => string
  formatarCEP: (valor: string) => string
  formatarTelefone: (valor: string) => string
  buscarCEP: (cep: string) => Promise<void>
  cidades: string[]
  carregandoCidades: boolean
  estados: Array<{ value: string; label: string }>
  limparFormulario: () => void
}

export default function ModalNovaOperadora({
  isOpen,
  onClose,
  onSave,
  saving,
  formData,
  setFormData,
  formatarCNPJ,
  formatarCEP,
  formatarTelefone,
  buscarCEP,
  cidades,
  carregandoCidades,
  estados,
  limparFormulario
}: ModalNovaOperadoraProps) {
  useModalOverlay(isOpen)

  if (!isOpen) return null

  const handleSave = async () => {
    await onSave(formData)
  }

  const handleClose = () => {
    limparFormulario()
    onClose()
  }

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = formatarCNPJ(e.target.value)
    setFormData({ ...formData, cnpj: valor })
  }

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = formatarCEP(e.target.value)
    setFormData({ ...formData, cep: valor })
    if (valor.replace(/\D/g, "").length === 8) {
      await buscarCEP(valor)
    }
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = formatarTelefone(e.target.value)
    setFormData({ ...formData, telefone: valor })
  }

  const isFormValid = formData.nome && formData.fantasia && formData.cnpj && formData.ans && formData.cep && formData.endereco && formData.cidade && formData.uf

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Nova Operadora</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  CNPJ <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={formData.cnpj}
                  onChange={handleCNPJChange}
                  maxLength={18}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ANS <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Número ANS"
                  value={formData.ans}
                  onChange={(e) => setFormData({ ...formData, ans: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onChange={handleTelefoneChange}
                    maxLength={15}
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  CEP <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="00000-000"
                    value={formData.cep}
                    onChange={handleCEPChange}
                    maxLength={9}
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Complemento
                </label>
                <Input
                  type="text"
                  placeholder="Apto, Bloco, etc"
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  UF <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.uf}
                  onValueChange={(value) => {
                    setFormData({ ...formData, uf: value, cidade: "" })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((estado) => (
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
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Nome da operadora"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Fantasia <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Nome fantasia"
                  value={formData.fantasia}
                  onChange={(e) => setFormData({ ...formData, fantasia: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Endereço <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Rua, Avenida, etc"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Número
                  </label>
                  <Input
                    type="text"
                    placeholder="123"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Bairro
                </label>
                <Input
                  type="text"
                  placeholder="Nome do bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Cidade <span className="text-red-500">*</span>
                </label>
                {formData.uf ? (
                  <Select
                    value={formData.cidade}
                    onValueChange={(value) => setFormData({ ...formData, cidade: value })}
                    disabled={carregandoCidades}
                  >
                    <SelectTrigger className="w-full">
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
                    type="text"
                    placeholder="Selecione o estado primeiro"
                    disabled
                    className="w-full"
                  />
                )}
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
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

