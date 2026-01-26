"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

export default function RecebidasTab() {
  const router = useRouter()

  const handleAcessar = () => {
    router.push("/admin/propostas")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Propostas Recebidas
        </CardTitle>
        <CardDescription>
          Todas as propostas recebidas no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Esta funcionalidade está sendo migrada para o Portal do Analista.
          </p>
          <Button onClick={handleAcessar}>
            Acessar Propostas Recebidas
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

