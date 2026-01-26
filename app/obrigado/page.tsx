import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function ObrigadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-[#0F172A]" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Proposta Enviada!</h2>
          <p className="mt-2 text-sm text-gray-600">
            Agradecemos o seu interesse. Em breve nossa equipe entrará em contato.
          </p>
        </div>
        <div className="mt-8">
          <Link href="/">
            <Button className="w-full">Voltar para a Página Inicial</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
