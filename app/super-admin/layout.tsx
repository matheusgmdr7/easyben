'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Building2, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/super-admin/tenants" className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-[#0F172A]" />
                <span className="text-xl font-bold text-gray-900">Super Admin</span>
              </Link>
              <nav className="hidden md:flex gap-4 ml-8">
                <Link
                  href="/super-admin/tenants"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/super-admin/tenants'
                      ? 'bg-[#0F172A] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Tenants
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

