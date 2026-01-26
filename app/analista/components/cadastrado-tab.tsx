"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCheck } from "lucide-react"

export default function CadastradoTab() {
  const router = useRouter()

  const handleAcessar = () => {
    router.push("/admin/cadastrado")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Propostas Aguardando Cadastro
        </CardTitle>
        <CardDescription>
          Propostas aprovadas aguardando cadastro no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Esta funcionalidade está sendo migrada para o Portal do Analista.
          </p>
          <Button onClick={handleAcessar}>
            Acessar Propostas Aguardando Cadastro
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

