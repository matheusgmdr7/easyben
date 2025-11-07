"use client"

import { useState, useMemo } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Users, 
  XCircle, 
  Edit2, 
  Mail, 
  User, 
  Shield, 
  CheckCircle,
  FileText,
  Lock,
  Eye,
  EyeOff
} from "lucide-react"
import UsuariosAdminService, { PERFIS_LABELS, PERMISSOES_LABELS, type Permissao } from "@/services/usuarios-admin-service"
import { useModalOverlay } from "@/hooks/use-modal-overlay"

interface ModalEditarUsuarioProps {
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
    ativo: boolean
  }
  setFormData: (data: any) => void
  limparFormulario: () => void
  usuarioOriginal?: any
}

export default function ModalEditarUsuario({
  isOpen,
  onClose,
  onSave,
  saving,
  formData,
  setFormData,
  limparFormulario,
  usuarioOriginal
}: ModalEditarUsuarioProps) {
  const [showPassword, setShowPassword] = useState(false)
  
  useModalOverlay(isOpen)
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
    // Apenas atualizar o perfil, NÃO sobrescrever permissões personalizadas
    // As permissões só devem ser atualizadas se o usuário clicar explicitamente em "Aplicar permissões do perfil"
    setFormData({ ...formData, perfil })
  }

  const togglePermissao = (permissao: Permissao) => {
    const novasPermissoes = formData.permissoes.includes(permissao)
      ? formData.permissoes.filter(p => p !== permissao)
      : [...formData.permissoes, permissao]
    setFormData({ ...formData, permissoes: novasPermissoes })
  }

  const toggleAtivo = () => {
    setFormData({ ...formData, ativo: !formData.ativo })
  }

  const isFormValid = formData.nome && formData.email && formData.perfil
  const hasChanges = usuarioOriginal && (
    formData.nome !== usuarioOriginal.nome ||
    formData.email !== usuarioOriginal.email ||
    formData.senha !== '' ||
    formData.perfil !== usuarioOriginal.perfil ||
    JSON.stringify(formData.permissoes.slice().sort()) !== JSON.stringify((Array.isArray(usuarioOriginal.permissoes) ? usuarioOriginal.permissoes : []).slice().sort()) ||
    formData.ativo !== usuarioOriginal.ativo
  )

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#168979] to-[#13786a] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Edit2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Editar Usuário</h3>
                <p className="text-white/80 text-sm">Atualize os dados e permissões do usuário</p>
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
                    Nova Senha
                    <span className="text-gray-500 font-normal text-xs ml-2">(Deixe em branco para manter a atual)</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      className="h-12 border-2 border-gray-200 focus:border-[#168979] rounded-lg pr-10"
                      placeholder="Nova senha (opcional)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${formData.ativo ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Status do Usuário
                    </div>
                    <div className="text-sm text-gray-600">
                      {formData.ativo ? 'Usuário ativo no sistema' : 'Usuário desativado'}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={toggleAtivo}
                  variant={formData.ativo ? "destructive" : "default"}
                  size="sm"
                  className={formData.ativo ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                >
                  {formData.ativo ? 'Desativar' : 'Ativar'}
                </Button>
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
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Permissões Específicas
                    <span className="text-gray-500 font-normal text-xs ml-2">
                      (Personalize as permissões do usuário)
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const permissoesPadrao = UsuariosAdminService.obterPermissoesPadrao(formData.perfil as any)
                      setFormData({ ...formData, permissoes: permissoesPadrao })
                    }}
                    className="text-xs"
                  >
                    Aplicar permissões do perfil
                  </Button>
                </div>
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
                    🔐 Informações de Atualização
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span>Alterações serão salvas imediatamente</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span>Senha em branco mantém a atual</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <span>Status ativo/inativo controla acesso</span>
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
            {hasChanges && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Edit2 className="h-5 w-5 text-green-600" />
                  </div>
                  <h4 className="text-sm font-bold text-green-900">
                    📊 Alterações a serem Salvas
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
                    <div className="font-semibold text-green-800">Status</div>
                    <div className="text-green-700 mt-1">{formData.ativo ? 'Ativo' : 'Inativo'}</div>
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
              disabled={saving || !isFormValid || !hasChanges}
              className="h-12 px-8 bg-gradient-to-r from-[#168979] to-[#13786a] hover:from-[#13786a] hover:to-[#0f6b5c] text-white font-bold shadow-lg"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="loading-corporate-small"></div>
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4" />
                  Salvar Alterações
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}