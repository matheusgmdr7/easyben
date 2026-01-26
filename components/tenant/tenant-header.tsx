"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CustomButton } from "@/components/ui/custom-button"
import { Menu, X } from "lucide-react"
import { useTenantTheme } from "./tenant-theme-provider"

interface TenantHeaderProps {
  tenantSlug?: string
}

export default function TenantHeader({ tenantSlug }: TenantHeaderProps) {
  const { theme, loading } = useTenantTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Obter configurações do menu do tenant
  const menuItems = theme.config?.menuItems || [
    { label: "Início", href: tenantSlug ? `/${tenantSlug}` : "/", visible: true },
    { label: "Sobre nós", href: tenantSlug ? `/${tenantSlug}/sobre` : "/sobre", visible: true },
    { label: "Contato", href: tenantSlug ? `/${tenantSlug}/contato` : "/contato", visible: true },
  ]

  // Verificar se deve mostrar link de corretores
  const mostrarCorretores = theme.config?.funcionalidades?.mostrarCorretores !== false

  const primaryColor = theme.colors.primary
  const cotacaoHref = tenantSlug ? `/${tenantSlug}/cotacao` : "/cotacao"
  const corretorHref = tenantSlug ? `/${tenantSlug}/corretor/login` : "/corretor/login"

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "shadow-md" : ""}`}>
      <div style={{ backgroundColor: primaryColor }} className="text-white">
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href={tenantSlug ? `/${tenantSlug}` : "/"} className="flex items-center z-20 relative">
              {theme.branding.logo ? (
                <img
                  src={theme.branding.logo}
                  alt={theme.branding.nomeMarca}
                  className="h-8 md:h-10 w-auto"
                  style={{ maxWidth: "160px" }}
                />
              ) : (
                <span className="text-xl md:text-2xl font-bold">{theme.branding.nomeMarca}</span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4 lg:space-x-8">
              {menuItems
                .filter((item) => item.visible !== false)
                .map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-white hover:text-white/80 font-medium text-sm tracking-wide transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all hover:after:w-full"
                  >
                    {item.label}
                  </Link>
                ))}
              {mostrarCorretores && (
                <Link
                  href={corretorHref}
                  className="text-white hover:text-white/80 font-medium text-sm tracking-wide transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all hover:after:w-full"
                >
                  Corretores
                </Link>
              )}
              <CustomButton
                href={cotacaoHref}
                size="sm"
                className="bg-white hover:bg-white/90 font-medium rounded-full px-4 lg:px-6"
                style={{ color: primaryColor }}
              >
                Fazer cotação
              </CustomButton>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white z-20 relative"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav
              className="md:hidden fixed inset-0 z-10 pt-20 px-4"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex flex-col space-y-4">
                {menuItems
                  .filter((item) => item.visible !== false)
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-white font-medium py-2 hover:translate-x-1 transition-transform text-lg"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                {mostrarCorretores && (
                  <Link
                    href={corretorHref}
                    className="text-white font-medium py-2 hover:translate-x-1 transition-transform text-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Corretores
                  </Link>
                )}
                <CustomButton
                  href={cotacaoHref}
                  className="bg-white hover:bg-white/90 w-full mt-2 rounded-full py-3 text-lg"
                  style={{ color: primaryColor }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Fazer cotação
                </CustomButton>
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

