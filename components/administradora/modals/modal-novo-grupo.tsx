"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { XCircle, Users } from "lucide-react"
import { useModalOverlay } from "@/hooks/use-modal-overlay"
import { toast } from "sonner"
import {
  GruposBeneficiariosService,
  type GrupoBeneficiarios,
} from "@/services/grupos-beneficiarios-service"

interface ModalNovoGrupoProps {
  open: boolean
  onClose: () => void
  administradoraId: string
  grupoEditando?: GrupoBeneficiarios | null
}

export default function ModalNovoGrupo({
  open,
  onClose,
  administradoraId,
  grupoEditando,
}: ModalNovoGrupoProps) {
  useModalOverlay(open)

  const [saving, setSaving] = useState(false)

  // Dados do grupo
  const [nomeGrupo, setNomeGrupo] = useState("")
  const [descricaoGrupo, setDescricaoGrupo] = useState("")

  useEffect(() => {
    if (open) {
      if (grupoEditando) {
        setNomeGrupo(grupoEditando.nome)
        setDescricaoGrupo(grupoEditando.descricao || "")
      } else {
        limparFormulario()
      }
    }
  }, [open, grupoEditando])

  function limparFormulario() {
    setNomeGrupo("")
    setDescricaoGrupo("")
  }

  async function handleSalvar() {
    if (!nomeGrupo) {
      toast.error("Preencha o nome do grupo")
      return
    }

    try {
      setSaving(true)

      if (grupoEditando) {
        await GruposBeneficiariosService.atualizar(grupoEditando.id, {
          nome: nomeGrupo,
          descricao: descricaoGrupo || undefined,
        })
        toast.success("Grupo atualizado com sucesso!")
      } else {
        await GruposBeneficiariosService.criar(administradoraId, {
          nome: nomeGrupo,
          descricao: descricaoGrupo || undefined,
        })
        toast.success("Grupo criado com sucesso!")
      }

      limparFormulario()
      onClose()
    } catch (error: any) {
      console.error("Erro ao salvar grupo:", error)
      toast.error("Erro ao salvar grupo: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">
                {grupoEditando ? "Editar Grupo" : "Novo Grupo de Beneficiários"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-sm p-2 transition-colors"
              aria-label="Fechar"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="grupo-nome" className="text-sm font-semibold text-gray-700">
                Nome do Grupo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="grupo-nome"
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value.toUpperCase())}
                placeholder="Ex: GRUPO EMPRESARIAL ABC"
                className="h-11 border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="grupo-desc" className="text-sm font-semibold text-gray-700">
                Descrição
              </Label>
              <Textarea
                id="grupo-desc"
                value={descricaoGrupo}
                onChange={(e) => setDescricaoGrupo(e.target.value)}
                placeholder="Descrição do grupo de beneficiários..."
                className="min-h-[100px] border border-gray-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] rounded-sm resize-y"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 border border-gray-300 rounded-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={saving || !nomeGrupo}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white h-11 px-6 rounded-sm"
          >
            {saving ? "Salvando..." : grupoEditando ? "Atualizar" : "Criar Grupo"}
          </Button>
        </div>
      </div>
    </div>
  )
}

