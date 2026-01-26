"use client"

// Componente que reutiliza a lógica de em-analise
// Por enquanto, redireciona para a página existente
// Futuramente podemos extrair a lógica para um componente compartilhado

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"

export default function EmAnaliseTab() {
  const router = useRouter()

  // Por enquanto, redireciona para a página existente
  // Futuramente extrairemos a lógica para um componente compartilhado
  const handleAcessar = () => {
    router.push("/admin/em-analise")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Propostas em Análise
        </CardTitle>
        <CardDescription>
          Propostas com status "pendente" aguardando análise e aprovação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Esta funcionalidade está sendo migrada para o Portal do Analista.
          </p>
          <Button onClick={handleAcessar}>
            Acessar Propostas em Análise
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

