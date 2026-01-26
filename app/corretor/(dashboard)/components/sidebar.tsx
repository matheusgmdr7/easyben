"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileText, Package, DollarSign, LogOut, Menu, X, Settings, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const routes = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/corretor/dashboard",
      active: pathname === "/corretor/dashboard",
    },
    {
      label: "Propostas",
      icon: FileText,
      href: "/corretor/propostas",
      active: pathname.includes("/corretor/propostas"),
    },
    {
      label: "Produtos",
      icon: Package,
      href: "/corretor/produtos",
      active: pathname.includes("/corretor/produtos"),
    },
    {
      label: "Comissões",
      icon: DollarSign,
      href: "/corretor/comissoes",
      active: pathname.includes("/corretor/comissoes"),
    },
    {
      label: "Clientes",
      icon: Users,
      href: "/corretor/clientes",
      active: pathname.includes("/corretor/clientes"),
    },
    {
      label: "Configurações",
      icon: Settings,
      href: "/corretor/configuracoes",
      active: pathname === "/corretor/configuracoes",
    },
  ]

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-14 px-4 border-b">
              <Link href="/corretor/dashboard" className="flex items-center gap-2">
                <span className="font-semibold text-lg">Corretor Portal</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-2 py-4">
                <nav className="space-y-1">
                  {routes.map((route) => (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        route.active
                          ? "bg-[#0F172A] text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      )}
                    >
                      <route.icon className={cn("h-4 w-4", route.active ? "text-white" : "text-gray-500")} />
                      {route.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </ScrollArea>
            <div className="border-t p-4">
              <Link
                href="/corretor/logout"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <aside className={cn("fixed left-0 top-0 z-30 hidden h-screen w-64 border-r bg-white lg:block", className)}>
        <div className="flex flex-col h-full">
          <div className="flex items-center h-14 px-4 border-b">
            <Link href="/corretor/dashboard" className="flex items-center gap-2">
              <span className="font-semibold text-lg">Corretor Portal</span>
            </Link>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-2 py-4">
              <nav className="space-y-1">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      route.active ? "bg-[#0F172A] text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    )}
                  >
                    <route.icon className={cn("h-4 w-4", route.active ? "text-white" : "text-gray-500")} />
                    {route.label}
                  </Link>
                ))}
              </nav>
            </div>
          </ScrollArea>
          <div className="border-t p-4">
            <Link
              href="/corretor/logout"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
