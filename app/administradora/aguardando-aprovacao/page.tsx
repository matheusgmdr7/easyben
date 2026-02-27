"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building, Clock, CheckCircle, XCircle } from "lucide-react"
import { getAdministradoraLogada } from "@/services/auth-administradoras-service"
import { supabase } from "@/lib/supabase"

export default function AguardandoAprovacaoPage() {
  const router = useRouter()
  const [administradora, setAdministradora] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const administradoraLogada = getAdministradoraLogada()
    
    if (!administradoraLogada) {
      router.push("/administradora/login")
      return
    }

    setAdministradora(administradoraLogada)
    setLoading(false)

    // Verificar status periodicamente
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("administradoras")
          .select("status_login")
          .eq("id", administradoraLogada.id)
          .single()

        if (data && data.status_login === "ativo") {
          // Atualizar localStorage
          const administradoraAtualizada = {
            ...administradoraLogada,
            status_login: "ativo",
          }
          localStorage.setItem("administradoraLogada", JSON.stringify(administradoraAtualizada))
          
          // Redirecionar para dashboard
          router.push("/administradora/dashboard")
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error)
      }
    }, 5000) // Verificar a cada 5 segundos

    return () => clearInterval(interval)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-corporate"></div>
        </div>
      </div>
    )
  }

  const getStatusInfo = () => {
    const status = administradora?.status_login || "pendente"
    
    switch (status) {
      case "ativo":
        return {
          icon: CheckCircle,
          color: "text-[#0F172A]",
          bgColor: "bg-[#7BD9F6] bg-opacity-20",
          title: "Conta Ativada",
          message: "Sua conta foi ativada! Você será redirecionado em instantes...",
        }
      case "bloqueado":
        return {
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          title: "Conta Bloqueada",
          message: "Sua conta foi bloqueada. Entre em contato com o suporte.",
        }
      default:
        return {
          icon: Clock,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          title: "Aguardando Aprovação",
          message: "Seu cadastro está aguardando aprovação do administrador. Você receberá um email quando sua conta for ativada.",
        }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className={`${statusInfo.bgColor} rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4`}>
          <StatusIcon className={`h-10 w-10 ${statusInfo.color}`} />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{statusInfo.title}</h1>
        <p className="text-gray-600 mb-6">{statusInfo.message}</p>

        {administradora && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-5 w-5 text-[#0F172A]" />
              <h3 className="font-semibold text-gray-900">{administradora.nome_fantasia || administradora.nome}</h3>
            </div>
            <p className="text-sm text-gray-600">CNPJ: {administradora.cnpj}</p>
            <p className="text-sm text-gray-600">Email: {administradora.email_login}</p>
            <p className="text-sm text-gray-600 mt-2">
              Status: <span className="font-medium capitalize">{administradora.status_login || "pendente"}</span>
            </p>
          </div>
        )}

        <div className="text-sm text-gray-500">
          Esta página será atualizada automaticamente quando seu status mudar.
        </div>
      </div>
    </div>
  )
}

