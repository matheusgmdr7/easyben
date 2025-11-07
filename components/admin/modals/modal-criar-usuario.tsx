"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  XCircle, 
  Plus, 
  Mail, 
  User, 
  Shield, 
  CheckCircle,
  FileText,
  Lock
} from "lucide-react"
import UsuariosAdminService, { PERFIS_LABELS, PERMISSOES_LABELS, type Permissao } from "@/services/usuarios-admin-service"
import { useModalOverlay } from "@/hooks/use-modal-overlay"

interface ModalCriarUsuarioProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  saving: boolean
  formData: {
    nome: string
    email: string
    senha: string
    perfil: string
    permissoes: Permissao[]
  }
  setFormData: (data: any) => void
  limparFormulario: () => void
}

export default function ModalCriarUsuario({
  isOpen,
  onClose,
  onSave,
  saving,
  formData,
  setFormData,
  limparFormulario
}: ModalCriarUsuarioProps) {
 
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<string[]>(
    formData.permissoes?.length ? formData.permissoes : []
  )

  useModalOverlay(isOpen)

  useEffect(() => {
    if (isOpen) {
      setPermissoesSelecionadas(formData.permissoes?.length ? formData.permissoes : [])
    }
  }, [isOpen, formData.permissoes])

  if (!isOpen) {
    return null
  }

  const handleSave = async () => {
    await onSave(formData)
  }

  const handleClose = () => {
    limparFormulario()
    onClose()
  }

  const handlePerfilChange = (perfil: string) => {
    const permissoesPadrao = UsuariosAdminService.obterPermissoesPadrao(perfil as any)
    setFormData({ ...formData, perfil, permissoes: permissoesPadrao })
  }

  const togglePermissao = (permissao: Permissao) => {
    const novasPermissoes = formData.permissoes.includes(permissao)
      ? formData.permissoes.filter(p => p !== permissao)
      : [...formData.permissoes, permissao]
    setFormData({ ...formData, permissoes: novasPermissoes })
  }

  const isFormValid = formData.nome && formData.email && formData.senha && formData.perfil

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md" />
      <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#168979] to-[#13786a] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Novo Usuário Admin</h3>
                  <p className="text-white/80 text-sm">Crie um novo usuário para o sistema administrativo</p>
                </div>
              </div>
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Dados Básicos */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#168979]" />
                  Dados Básicos
                </h4>

                {/* Nome */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg"
                    placeholder="Nome completo do usuário"
                  />
                </div>

                {/* Grid Email e Senha */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg"
                      placeholder="usuario@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Senha <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="password"
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      className="h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg"
                      placeholder="Senha segura"
                    />
                  </div>
                </div>
              </div>

              {/* Perfil */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#168979]" />
                  Perfil e Permissões
                </h4>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Perfil <span className="text-red-500">*</span>
                  </label>
                  <Select value={formData.perfil} onValueChange={handlePerfilChange}>
                    <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg">
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERFIS_LABELS).map(([valor, label]) => (
                        <SelectItem key={valor} value={valor}>
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-[#168979]/10 rounded">
                              <Shield className="h-4 w-4 text-[#168979]" />
                            </div>
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Permissões */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Permissões Específicas
                    <span className="text-gray-500 font-normal text-xs ml-2">
                      (Personalize as permissões do usuário)
                    </span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(PERMISSOES_LABELS).map(([permissao, label]) => (
                      <div
                        key={permissao}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.permissoes.includes(permissao as Permissao)
                            ? 'border-[#168979] bg-[#168979]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => togglePermissao(permissao as Permissao)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            formData.permissoes.includes(permissao as Permissao)
                              ? 'border-[#168979] bg-[#168979]'
                              : 'border-gray-300'
                          }`}>
                            {formData.permissoes.includes(permissao as Permissao) && (
                              <CheckCircle className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Informações */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-blue-900 mb-3">
                      🔐 Informações de Segurança
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        <span>Nome e email são obrigatórios</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        <span>Senha deve ter pelo menos 6 caracteres</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        <span>Perfil define permissões padrão</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        <span>Permissões podem ser personalizadas</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview da operação */}
              {formData.nome && formData.email && formData.perfil && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <h4 className="text-sm font-bold text-green-900">
                      📊 Resumo do Novo Usuário
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="font-semibold text-green-800">Nome</div>
                      <div className="text-green-700 mt-1">{formData.nome}</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="font-semibold text-green-800">Email</div>
                      <div className="text-green-700 mt-1">{formData.email}</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="font-semibold text-green-800">Perfil</div>
                      <div className="text-green-700 mt-1">{PERFIS_LABELS[formData.perfil as keyof typeof PERFIS_LABELS]}</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="font-semibold text-green-800">Permissões</div>
                      <div className="text-green-700 mt-1">{formData.permissoes.length} permissões</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                onClick={handleClose}
                variant="outline"
                className="h-12 px-6 border-2 border-gray-300 hover:border-gray-400"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !isFormValid}
                className="h-12 px-8 bg-gradient-to-r from-[#168979] to-[#13786a] hover:from-[#13786a] hover:to-[#0f6b5c] text-white font-bold shadow-lg"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="loading-corporate-small"></div>
                    Criando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Usuário
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}