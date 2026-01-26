import { Instagram, Mail } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white">
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6">
          <div className="flex items-center">
            <Mail className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            <a
              href="mailto:contato@contratandoplanos.com.br"
              className="text-white hover:text-white/80 transition-colors text-sm md:text-base"
            >
              contato@contratandoplanos.com.br
            </a>
          </div>

          <a
            href="#"
            className="flex items-center text-white hover:text-white/80 transition-colors text-sm md:text-base"
          >
            <Instagram className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            <span>@contratandoplanos</span>
          </a>
        </div>

        <div className="text-center mt-4 md:mt-6">
          <p className="text-white/80 text-xs md:text-sm">© 2025 Contratandoplanos. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
