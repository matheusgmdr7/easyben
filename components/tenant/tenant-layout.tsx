"use client"

import { ReactNode } from "react"
import { TenantThemeProvider } from "./tenant-theme-provider"
import TenantHeader from "./tenant-header"
import TenantFooter from "./tenant-footer"
import type { Tenant } from "@/lib/tenant-utils"

interface TenantLayoutProps {
  children: ReactNode
  tenantSlug?: string
  initialTenant?: Tenant
}

export default function TenantLayout({
  children,
  tenantSlug,
  initialTenant,
}: TenantLayoutProps) {
  return (
    <TenantThemeProvider tenantSlug={tenantSlug} initialTenant={initialTenant}>
      <div className="flex flex-col min-h-screen">
        <TenantHeader tenantSlug={tenantSlug} />
        <main className="flex-grow">{children}</main>
        <TenantFooter tenantSlug={tenantSlug} />
      </div>
    </TenantThemeProvider>
  )
}

