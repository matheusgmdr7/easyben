"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Key, 
  XCircle, 
  Mail,
  Eye,
  EyeOff
} from "lucide-react"
import { useModalOverlay } from "@/hooks/use-modal-overlay"

interface ModalConfigurarLoginAdministradoraProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { email_login: string; senha: string }) => Promise<void>
  saving: boolean
  administradoraNome: string
  emailAtual?: string
  isRedefinicaoSenha?: boolean // Se true, apenas redefinir senha (email já existe)
}

export default function ModalConfigurarLoginAdministradora({
  isOpen,
  onClose,
  onSave,
  saving,
  administradoraNome,
  emailAtual,
  isRedefinicaoSenha = false
}: ModalConfigurarLoginAdministradoraProps) {
  const [emailLogin, setEmailLogin] = useState(emailAtual || "")
  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [erro, setErro] = useState("")

  useModalOverlay(isOpen)

  // Resetar estados quando modal abrir
  useEffect(() => {
    if (isOpen) {
      setEmailLogin(emailAtual || "")
      setSenha("")
      setConfirmarSenha("")
      setErro("")
    }
  }, [isOpen, emailAtual])

  if (!isOpen) return null

  const handleSave = async () => {
    setErro("")

    // Validações
    if (!isRedefinicaoSenha && (!emailLogin || !emailLogin.trim())) {
      setErro("Email de login é obrigatório")
      return
    }

    // Se for redefinição, usar email atual
    const emailParaSalvar = isRedefinicaoSenha ? (emailAtual || emailLogin) : emailLogin.trim().toLowerCase()

    if (!senha || senha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres")
      return
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem")
      return
    }

    // Validar formato de email (apenas se não for redefinição ou se email foi alterado)
    if (!isRedefinicaoSenha) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailLogin)) {
        setErro("Email inválido")
        return
      }
    }

    try {
      await onSave({ email_login: emailParaSalvar, senha })
      // Limpar formulário após sucesso
      setSenha("")
      setConfirmarSenha("")
      setErro("")
    } catch (error: any) {
      setErro(error.message || "Erro ao configurar login")
    }
  }

  const handleClose = () => {
    setEmailLogin(emailAtual || "")
    setSenha("")
    setConfirmarSenha("")
    setErro("")
    onClose()
  }

  const isFormValid = 
    (isRedefinicaoSenha || emailLogin) && 
    senha && 
    confirmarSenha && 
    senha === confirmarSenha && 
    senha.length >= 6

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">
                {isRedefinicaoSenha ? "Redefinir Senha" : "Configurar Acesso"}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <p className="text-white/90 text-sm mt-2">{administradoraNome}</p>
          {isRedefinicaoSenha && emailAtual && (
            <p className="text-white/80 text-xs mt-1">Email: {emailAtual}</p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {erro}
            </div>
          )}

          {!isRedefinicaoSenha && (
            <div>
              <Label className="block text-sm font-bold text-gray-700 mb-2">
                Email de Login <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Este email será usado para fazer login no portal da administradora
              </p>
            </div>
          )}

          <div>
            <Label className="block text-sm font-bold text-gray-700 mb-2">
              Senha <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type={mostrarSenha ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="pl-10 pr-10 w-full"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              A senha deve ter no mínimo 6 caracteres
            </p>
          </div>

          <div>
            <Label className="block text-sm font-bold text-gray-700 mb-2">
              Confirmar Senha <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type={mostrarConfirmarSenha ? "text" : "password"}
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="pl-10 pr-10 w-full"
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
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
              {saving 
                ? (isRedefinicaoSenha ? "Redefinindo..." : "Configurando...") 
                : (isRedefinicaoSenha ? "Redefinir Senha" : "Configurar Acesso")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

