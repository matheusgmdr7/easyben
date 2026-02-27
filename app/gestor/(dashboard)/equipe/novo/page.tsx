"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"

/**
 * Redireciona para a página de Link de Cadastro.
 * "Adicionar Corretor" e "Link de Cadastro" foram unificados em uma única página.
 */
export default function AdicionarCorretorRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/gestor/link-cadastro")
  }, [router])

  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <Spinner className="h-6 w-6" />
      <span className="ml-2 text-gray-600">Redirecionando...</span>
    </div>
  )
}
