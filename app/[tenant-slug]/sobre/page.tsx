"use client"

import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { Tenant } from "@/lib/tenant-utils"
import TenantLayout from "@/components/tenant/tenant-layout"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useTenantTheme } from "@/components/tenant/tenant-theme-provider"
import { useEffect, useState } from "react"

interface PageProps {
  params: {
    "tenant-slug": string
  }
}

function SobreContent({ tenantSlug }: { tenantSlug: string }) {
  const { theme } = useTenantTheme()
  const primaryColor = theme.colors.primary
  const secoes = theme.config?.secoes || {}
  const sobre = secoes.sobre || {}

  const cotacaoHref = `/${tenantSlug}/cotacao`

  return (
    <>
      {/* Hero Section */}
      <section className="text-white py-20" style={{ backgroundColor: primaryColor }}>
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {sobre.titulo || `Sobre a ${theme.branding.nomeMarca}`}
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              {sobre.subtitulo || "Te ajudamos a encontrar o plano de saúde ideal para suas necessidades."}
            </p>
          </div>
        </div>
      </section>

      {/* Conteúdo */}
      <section className="py-16 bg-white">
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="md:w-1/2">
                <h2 className="text-3xl font-bold mb-6" style={{ color: primaryColor }}>
                  Nossa História
                </h2>
                <div
                  className="text-gray-600 mb-4 prose prose-lg"
                  dangerouslySetInnerHTML={{
                    __html: sobre.conteudo || `<p>A ${theme.branding.nomeMarca} nasceu com o propósito de simplificar o acesso à saúde privada no Brasil.</p>`,
                  }}
                />
              </div>
              {sobre.imagem && (
                <div className="md:w-1/2">
                  <img
                    src={sobre.imagem}
                    alt={`Sobre ${theme.branding.nomeMarca}`}
                    className="rounded-lg shadow-lg w-full"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 md:px-6 text-center">
          <Button asChild size="lg" style={{ backgroundColor: primaryColor }} className="text-white">
            <Link href={cotacaoHref}>
              Fazer cotação agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}

export default function SobrePage({ params }: PageProps) {
  const tenantSlug = params["tenant-slug"]
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTenant = async () => {
      try {
        // Usar supabase client-side
        const { supabase } = await import("@/lib/supabase")
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .eq("slug", tenantSlug)
          .eq("status", "ativo")
          .single()

        if (error || !data) {
          setTenant(null)
        } else {
          setTenant(data as Tenant)
        }
      } catch (error) {
        console.error("Erro ao buscar tenant:", error)
        setTenant(null)
      } finally {
        setLoading(false)
      }
    }

    loadTenant()
  }, [tenantSlug])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!tenant) {
    notFound()
  }

  return (
    <TenantLayout tenantSlug={tenantSlug} initialTenant={tenant}>
      <SobreContent tenantSlug={tenantSlug} />
    </TenantLayout>
  )
}

