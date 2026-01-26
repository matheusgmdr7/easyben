"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Building, 
  XCircle, 
  Mail, 
  Phone,
  FileText
} from "lucide-react"
import type React from "react"
import { Label } from "@/components/ui/label"
import { useModalOverlay } from "@/hooks/use-modal-overlay"

interface ModalEditarAdministradoraProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  saving: boolean
  formData: {
    nome: string
    cnpj: string
    email: string
    telefone: string
    observacoes: string
  }
  setFormData: (data: any) => void
  formatarCNPJ: (valor: string) => string
  formatarTelefone: (valor: string) => string
  limparFormulario: () => void
}

export default function ModalEditarAdministradora({
  isOpen,
  onClose,
  onSave,
  saving,
  formData,
  setFormData,
  formatarCNPJ,
  formatarTelefone,
  limparFormulario
}: ModalEditarAdministradoraProps) {
  const [contatos, setContatos] = useState<Contact[]>([])

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
    const valor = e.target.value.replace(/\D/g, '')
    if (valor.length <= 14) {
      setFormData({ ...formData, cnpj: formatarCNPJ(valor) })
    }
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '')
    if (valor.length <= 11) {
      setFormData({ ...formData, telefone: formatarTelefone(valor) })
    }
  }

  const isFormValid = formData.nome && formData.cnpj

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Editar Administradora</h2>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nome da Administradora <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Digite o nome da administradora"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full"
            />
          </div>

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
              Observações
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
              <textarea
                placeholder="Informações adicionais sobre a administradora"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0F172A] focus:border-transparent min-h-[100px]"
                rows={4}
              />
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


