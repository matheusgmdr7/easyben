"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, ArrowRight } from "lucide-react"

export default function EasyBenHeader() {
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-white shadow-md border-b border-gray-200" 
          : "bg-white"
      }`}
    >
      <div className="container mx-auto px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Aumentado e mais institucional */}
          <Link href="/" className="flex items-center z-20 relative">
            <img
              src="https://i.ibb.co/M5KDz5k2/Easy-Ben-Logo-8-1.png"
              alt="EasyBen"
              className="h-20 md:h-24 lg:h-28 w-auto transition-all duration-300"
            />
          </Link>

          {/* Desktop Navigation - Estilo Institucional/Java */}
          <nav className="hidden lg:flex items-center space-x-1">
            <Link
              href="#funcionalidades"
              className="px-4 py-2 text-gray-800 hover:text-[#00C6FF] font-medium text-sm transition-colors duration-200 rounded-md hover:bg-gray-50"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              Funcionalidades
            </Link>
            <Link
              href="#como-funciona"
              className="px-4 py-2 text-gray-800 hover:text-[#00C6FF] font-medium text-sm transition-colors duration-200 rounded-md hover:bg-gray-50"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              Como Funciona
            </Link>
            <Link
              href="/contato"
              className="px-4 py-2 text-gray-800 hover:text-[#00C6FF] font-medium text-sm transition-colors duration-200 rounded-md hover:bg-gray-50"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              Contato
            </Link>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <Button
              asChild
              className="bg-[#00C6FF] hover:bg-[#00B8E6] text-white rounded-md px-6 py-2.5 font-semibold shadow-sm hover:shadow-md transition-all duration-200 ml-2"
              style={{ fontFamily: "'Inter', sans-serif", borderRadius: '6px', fontWeight: 600 }}
            >
              <Link href="/easyben-admin/login" className="flex items-center">
                Acessar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>

          {/* Mobile/Tablet Menu Button */}
          <button
            className="lg:hidden z-20 relative text-gray-800 transition-colors p-2 rounded-md hover:bg-gray-100"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile/Tablet Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden fixed inset-0 bg-white z-10 pt-24 px-6">
            <div className="flex flex-col space-y-4">
              <Link
                href="#funcionalidades"
                className="text-gray-800 font-medium text-base hover:text-[#00C6FF] transition-colors py-3 border-b border-gray-100"
                onClick={() => setIsMenuOpen(false)}
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
              >
                Funcionalidades
              </Link>
              <Link
                href="#como-funciona"
                className="text-gray-800 font-medium text-base hover:text-[#00C6FF] transition-colors py-3 border-b border-gray-100"
                onClick={() => setIsMenuOpen(false)}
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
              >
                Como Funciona
              </Link>
              <Link
                href="/contato"
                className="text-gray-800 font-medium text-base hover:text-[#00C6FF] transition-colors py-3 border-b border-gray-100"
                onClick={() => setIsMenuOpen(false)}
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
              >
                Contato
              </Link>
              <div className="pt-4">
                <Button
                  asChild
                  className="bg-[#00C6FF] hover:bg-[#00B8E6] text-white rounded-md w-full py-3"
                  style={{ fontFamily: "'Inter', sans-serif", borderRadius: '6px', fontWeight: 600 }}
                >
                  <Link href="/easyben-admin/login" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center">
                    Acessar Administração
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
