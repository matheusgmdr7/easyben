"use client"

import { Instagram, Mail, Facebook, Linkedin } from "lucide-react"
import { useTenantTheme } from "./tenant-theme-provider"

interface TenantFooterProps {
  tenantSlug?: string
}

export default function TenantFooter({ tenantSlug }: TenantFooterProps) {
  const { theme } = useTenantTheme()
  const primaryColor = theme.colors.primary

  const redesSociais = theme.config?.redesSociais || {}
  const email = theme.contact.email || "contato@contratandoplanos.com.br"
  const nomeMarca = theme.branding.nomeMarca || "Contratando Planos"
  const anoAtual = new Date().getFullYear()

  return (
    <footer style={{ backgroundColor: primaryColor }} className="text-white">
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6">
          {email && (
            <div className="flex items-center">
              <Mail className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <a
                href={`mailto:${email}`}
                className="text-white hover:text-white/80 transition-colors text-sm md:text-base"
              >
                {email}
              </a>
            </div>
          )}

          {/* Redes Sociais */}
          {redesSociais.instagram && (
            <a
              href={redesSociais.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-white hover:text-white/80 transition-colors text-sm md:text-base"
            >
              <Instagram className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span>@{redesSociais.instagram.split("/").pop()}</span>
            </a>
          )}

          {redesSociais.facebook && (
            <a
              href={redesSociais.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-white hover:text-white/80 transition-colors text-sm md:text-base"
            >
              <Facebook className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span>Facebook</span>
            </a>
          )}

          {redesSociais.linkedin && (
            <a
              href={redesSociais.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-white hover:text-white/80 transition-colors text-sm md:text-base"
            >
              <Linkedin className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span>LinkedIn</span>
            </a>
          )}
        </div>

        <div className="text-center mt-4 md:mt-6">
          <p className="text-white/80 text-xs md:text-sm">
            © {anoAtual} {nomeMarca}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

