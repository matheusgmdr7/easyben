import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { Tenant } from "@/lib/tenant-utils"
import TenantLayout from "@/components/tenant/tenant-layout"
import CotacaoTemplate from "@/app/templates/cotacao-template"

interface PageProps {
  params: {
    "tenant-slug": string
  }
}

async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("slug", slug)
      .eq("status", "ativo")
      .single()

    if (error || !data) {
      return null
    }

    return data as Tenant
  } catch (error) {
    console.error("Erro ao buscar tenant:", error)
    return null
  }
}

export default async function TenantPage({ params }: PageProps) {
  const tenantSlug = params["tenant-slug"]

  // Buscar dados do tenant
  const tenant = await getTenantBySlug(tenantSlug)

  // Se não encontrar tenant, retornar 404
  if (!tenant) {
    notFound()
  }

  return (
    <TenantLayout tenantSlug={tenantSlug} initialTenant={tenant}>
      <CotacaoTemplate tenantSlug={tenantSlug} />
    </TenantLayout>
  )
}

// Gerar metadata dinâmica para SEO
export async function generateMetadata({ params }: PageProps) {
  const tenant = await getTenantBySlug(params["tenant-slug"])

  if (!tenant) {
    return {
      title: "Página não encontrada",
    }
  }

  return {
    title: `${tenant.nome_marca || tenant.nome} - Planos de Saúde`,
    description: `Compare preços e coberturas dos melhores planos de saúde com ${tenant.nome_marca || tenant.nome}.`,
    icons: tenant.favicon_url ? [{ rel: "icon", url: tenant.favicon_url }] : undefined,
  }
}

