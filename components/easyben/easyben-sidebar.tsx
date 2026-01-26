"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Building2,
  Settings,
  Users,
  BarChart3,
  Globe,
  FileText,
  Package,
  CreditCard,
  Mail,
  Bell,
} from "lucide-react"

const menuItems = [
  {
    title: "Plataformas",
    href: "/easyben/admin",
    icon: Building2,
    description: "Gerenciar clientes white-label",
  },
  {
    title: "Configurações",
    href: "/easyben/admin/configuracoes",
    icon: Settings,
    description: "Configurações gerais do sistema",
  },
  {
    title: "Usuários",
    href: "/easyben/admin/usuarios",
    icon: Users,
    description: "Gerenciar usuários administradores",
  },
  {
    title: "Relatórios",
    href: "/easyben/admin/relatorios",
    icon: BarChart3,
    description: "Relatórios e analytics",
  },
]

export default function EasyBenSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/easyben/admin") {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 pt-16">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                active
                  ? "bg-[#0F172A]/10 text-[#0F172A] font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-[#0F172A]" : "text-gray-500")} />
              <div className="flex-1">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

