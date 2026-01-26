"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  GraduationCap, 
  XCircle, 
  FileText
} from "lucide-react"
import type React from "react"
import { useModalOverlay } from "@/hooks/use-modal-overlay"

interface ModalNovaEntidadeProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  saving: boolean
  formData: {
    sigla: string
    nome: string
  }
  setFormData: (data: any) => void
  limparFormulario: () => void
  isEditing?: boolean
}

export default function ModalNovaEntidade({
  isOpen,
  onClose,
  onSave,
  saving,
  formData,
  setFormData,
  limparFormulario,
  isEditing = false
}: ModalNovaEntidadeProps) {
  useModalOverlay(isOpen)

  if (!isOpen) return null

  const handleSave = async () => {
    await onSave(formData)
  }

  const handleClose = () => {
    limparFormulario()
    onClose()
  }

  const handleSiglaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, sigla: e.target.value.toUpperCase() })
  }

  const isFormValid = formData.sigla && formData.nome

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">
                {isEditing ? "Editar Entidade" : "Nova Entidade"}
              </h2>
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
              Sigla <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Ex: ABC"
              value={formData.sigla}
              onChange={handleSiglaChange}
              maxLength={10}
              className="w-full uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nome <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Nome completo da entidade"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="pl-10 w-full"
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
