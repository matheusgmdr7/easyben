"use client"

import { ReactNode } from "react"
import EasyBenHeader from "@/components/easyben/easyben-header"
import EasyBenSidebar from "@/components/easyben/easyben-sidebar"
import AuthGuard from "@/components/admin/auth-guard"

export default function EasyBenAdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <EasyBenHeader />
        <div className="flex">
          <EasyBenSidebar />
          <main className="flex-1 md:ml-64 pt-16">
            <div className="p-6 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

