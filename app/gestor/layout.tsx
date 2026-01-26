"use client"

import type React from "react"

// Layout simples para rotas que não estão dentro de (dashboard)
// As rotas dentro de (dashboard) usam o GestorDashboardLayout
export default function GestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

