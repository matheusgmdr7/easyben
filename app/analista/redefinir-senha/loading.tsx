import { Spinner } from "@/components/ui/spinner"

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <Spinner className="h-10 w-10 text-[#0F172A] mb-4" />
      <p className="text-gray-600 font-medium">Carregando...</p>
      <p className="text-sm text-gray-500 mt-1">Aguarde, em instantes você poderá redefinir sua senha.</p>
    </div>
  )
}
