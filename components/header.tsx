"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CustomButton } from "@/components/ui/custom-button"
import { Menu, X } from "lucide-react"

export default function Header() {
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

  // Fechar o menu quando a tela for redimensionada para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "shadow-md" : ""}`}>
      <div className="bg-[#0F172A] text-white">
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center z-20 relative">
              <img
                src="https://i.ibb.co/cpvGGHM/logo.png"
                alt="Contratandoplanos"
                className="h-8 md:h-10 w-auto"
                style={{ maxWidth: "160px" }}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4 lg:space-x-8">
              <Link
                href="/"
                className="text-white hover:text-white/80 font-medium text-sm tracking-wide transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all hover:after:w-full"
              >
                Início
              </Link>
              <Link
                href="/sobre"
                className="text-white hover:text-white/80 font-medium text-sm tracking-wide transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all hover:after:w-full"
              >
                Sobre nós
              </Link>
              <Link
                href="/contato"
                className="text-white hover:text-white/80 font-medium text-sm tracking-wide transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all hover:after:w-full"
              >
                Contato
              </Link>
              <Link
                href="/corretor/login"
                className="text-white hover:text-white/80 font-medium text-sm tracking-wide transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-white after:transition-all hover:after:w-full"
              >
                Corretores
              </Link>
              <CustomButton
                href="/cotacao"
                size="sm"
                className="bg-white text-[#0F172A] hover:bg-white/90 font-medium rounded-full px-4 lg:px-6"
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
            <nav className="md:hidden fixed inset-0 bg-[#0F172A] z-10 pt-20 px-4">
              <div className="flex flex-col space-y-4">
                <Link
                  href="/"
                  className="text-white font-medium py-2 hover:translate-x-1 transition-transform text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Início
                </Link>
                <Link
                  href="/sobre"
                  className="text-white font-medium py-2 hover:translate-x-1 transition-transform text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sobre nós
                </Link>
                <Link
                  href="/contato"
                  className="text-white font-medium py-2 hover:translate-x-1 transition-transform text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contato
                </Link>
                <Link
                  href="/corretor/login"
                  className="text-white font-medium py-2 hover:translate-x-1 transition-transform text-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Corretores
                </Link>
                <CustomButton
                  href="/cotacao"
                  className="bg-white text-[#0F172A] hover:bg-white/90 w-full mt-2 rounded-full py-3 text-lg"
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
