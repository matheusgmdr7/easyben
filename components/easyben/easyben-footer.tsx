"use client"

import Link from "next/link"
import { Mail, Instagram, Linkedin, Facebook } from "lucide-react"

export default function EasyBenFooter() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Logo e Slogan */}
          <div className="md:col-span-2">
            <img
              src="https://i.ibb.co/M5KDz5k2/Easy-Ben-Logo-8-1.png"
              alt="EasyBen"
              className="h-12 w-auto mb-4"
            />
            <p className="text-gray-400 text-sm mb-4" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>
              Benefícios Flexíveis & Simples
            </p>
            <p className="text-gray-400 text-sm leading-relaxed" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>
              Plataforma white-label completa para venda e gestão de planos de saúde e benefícios.
            </p>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="font-bold mb-4 text-white" style={{ fontFamily: "'Lato', sans-serif" }}>
              Links Rápidos
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="#funcionalidades" className="text-gray-400 hover:text-[#00C6FF] transition-colors text-sm" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>
                  Funcionalidades
                </Link>
              </li>
              <li>
                <Link href="#como-funciona" className="text-gray-400 hover:text-[#00C6FF] transition-colors text-sm" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>
                  Como Funciona
                </Link>
              </li>
              <li>
                <Link href="/contato" className="text-gray-400 hover:text-[#00C6FF] transition-colors text-sm" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>
                  Contato
                </Link>
              </li>
              <li>
                <Link href="/easyben-admin/login" className="text-gray-400 hover:text-[#00C6FF] transition-colors text-sm" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>
                  Administração
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-bold mb-4 text-white" style={{ fontFamily: "'Lato', sans-serif" }}>
              Contato
            </h3>
            <ul className="space-y-2">
              <li className="flex items-center text-gray-400 text-sm" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>
                <Mail className="h-4 w-4 mr-2" />
                contato@easyben.com.br
              </li>
            </ul>
            <div className="flex space-x-4 mt-4">
              <a
                href="#"
                className="text-gray-400 hover:text-[#00C6FF] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-[#00C6FF] transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-[#00C6FF] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-400 text-sm" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>
            © {new Date().getFullYear()} EasyBen. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
