"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import type { Tenant } from "@/lib/tenant-utils"
import { getTenantSlugClient } from "@/lib/tenant-utils"
import { supabase } from "@/lib/supabase"

export interface TenantTheme {
  colors: {
    primary: string
    secondary: string
  }
  branding: {
    logo?: string
    favicon?: string
    nomeMarca: string
  }
  contact: {
    email?: string
    nome?: string
  }
  config: Record<string, any>
  tenant: Tenant | null
}

interface TenantThemeContextType {
  theme: TenantTheme
  loading: boolean
  error: string | null
}

const TenantThemeContext = createContext<TenantThemeContextType | undefined>(undefined)

const defaultTheme: TenantTheme = {
  colors: {
    primary: "#0F172A",
    secondary: "#1E293B",
  },
  branding: {
    logo: "https://i.ibb.co/cpvGGHM/logo.png",
    nomeMarca: "Contratando Planos",
  },
  contact: {
    email: "contato@contratandoplanos.com.br",
    nome: "Contratando Planos",
  },
  config: {},
  tenant: null,
}

interface TenantThemeProviderProps {
  children: ReactNode
  tenantSlug?: string
  initialTenant?: Tenant
}

export function TenantThemeProvider({
  children,
  tenantSlug,
  initialTenant,
}: TenantThemeProviderProps) {
  const [theme, setTheme] = useState<TenantTheme>(defaultTheme)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTenantTheme = async () => {
      try {
        setLoading(true)
        setError(null)

        // Se já temos o tenant inicial, usar ele
        if (initialTenant) {
          const tenantTheme = buildThemeFromTenant(initialTenant)
          setTheme(tenantTheme)
          applyThemeToDocument(tenantTheme)
          setLoading(false)
          return
        }

        // Caso contrário, buscar pelo slug
        const slug = tenantSlug || getTenantSlugClient()
        
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("slug", slug)
          .eq("status", "ativo")
          .single()

        if (tenantError || !tenant) {
          console.warn("Tenant não encontrado, usando tema padrão:", tenantError?.message)
          setTheme(defaultTheme)
          applyThemeToDocument(defaultTheme)
          setLoading(false)
          return
        }

        const tenantTheme = buildThemeFromTenant(tenant as Tenant)
        setTheme(tenantTheme)
        applyThemeToDocument(tenantTheme)
      } catch (err: any) {
        console.error("Erro ao carregar tema do tenant:", err)
        setError(err.message)
        setTheme(defaultTheme)
        applyThemeToDocument(defaultTheme)
      } finally {
        setLoading(false)
      }
    }

    loadTenantTheme()
  }, [tenantSlug, initialTenant])

  return (
    <TenantThemeContext.Provider value={{ theme, loading, error }}>
      {children}
    </TenantThemeContext.Provider>
  )
}

function buildThemeFromTenant(tenant: Tenant): TenantTheme {
  return {
    colors: {
      primary: tenant.cor_primaria || "#0F172A",
      secondary: tenant.cor_secundaria || "#1E293B",
    },
    branding: {
      logo: tenant.logo_url,
      favicon: tenant.favicon_url,
      nomeMarca: tenant.nome_marca || tenant.nome || "Contratando Planos",
    },
    contact: {
      email: tenant.email_remetente,
      nome: tenant.nome_remetente || tenant.nome,
    },
    config: tenant.configuracoes || {},
    tenant,
  }
}

function applyThemeToDocument(theme: TenantTheme) {
  if (typeof document === "undefined") return

  // Aplicar CSS variables para cores
  const root = document.documentElement
  root.style.setProperty("--tenant-color-primary", theme.colors.primary)
  root.style.setProperty("--tenant-color-secondary", theme.colors.secondary)

  // Aplicar favicon se disponível
  if (theme.branding.favicon) {
    const existingFavicon = document.querySelector('link[rel="icon"]')
    if (existingFavicon) {
      existingFavicon.setAttribute("href", theme.branding.favicon)
    } else {
      const link = document.createElement("link")
      link.rel = "icon"
      link.href = theme.branding.favicon
      document.head.appendChild(link)
    }
  }
}

export function useTenantTheme() {
  const context = useContext(TenantThemeContext)
  if (context === undefined) {
    throw new Error("useTenantTheme deve ser usado dentro de TenantThemeProvider")
  }
  return context
}

