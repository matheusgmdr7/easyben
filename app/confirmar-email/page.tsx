"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase-auth"

export default function ConfirmarEmail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Obter token e tipo da URL
        const token_hash = searchParams.get("token_hash")
        const type = searchParams.get("type")

        if (!token_hash || !type) {
          setStatus("error")
          setMessage("Link de confirmação inválido. Verifique se você usou o link correto do e-mail.")
          return
        }

        // Confirmar o e-mail usando o Supabase
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        })

        if (error) {
          setStatus("error")
          setMessage(`Erro ao confirmar e-mail: ${error.message}`)
        } else {
          setStatus("success")
          setMessage("Seu e-mail foi confirmado com sucesso!")
        }
      } catch (error) {
        setStatus("error")
        setMessage("Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.")
        console.error("Erro na confirmação de e-mail:", error)
      }
    }

    confirmEmail()
  }, [searchParams])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="Contratando Planos" width={180} height={40} className="h-10 w-auto" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            {status === "loading" && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-gray-800">Verificando seu e-mail...</h2>
                <p className="text-gray-600 mt-2">Aguarde enquanto processamos sua confirmação.</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto mb-4 bg-[#7BD9F6] bg-opacity-30 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-[#0F172A]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">E-mail Confirmado!</h2>
                <p className="text-gray-600 mt-2">{message}</p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto mb-4 bg-red-100 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Erro na Confirmação</h2>
                <p className="text-gray-600 mt-2">{message}</p>
              </>
            )}
          </div>

          <div className="mt-6">
            {status === "success" && (
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition duration-300"
              >
                Fazer Login
              </button>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition duration-300"
                >
                  Tentar Novamente
                </button>
                <Link
                  href="/login"
                  className="block w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-md transition duration-300"
                >
                  Voltar para Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-sm">© {new Date().getFullYear()} Contratando Planos. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
