"use client"

import { Toaster as SonnerToaster } from "sonner"

/**
 * Toaster raiz com "use client" para evitar "Unsupported Server Component type: undefined"
 * quando usado no layout raiz (Server Component). O Toaster do sonner precisa rodar só no cliente.
 */
export function ToasterRoot() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "#fff",
          border: "1px solid #e5e7eb",
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
        className: "toast-floating",
      }}
    />
  )
}
