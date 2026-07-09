/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Evita WasmHash / "Cannot read properties of undefined (reading 'length')" no webpack em CI (Netlify).
  experimental: {
    webpackBuildWorker: false,
    outputFileTracingIncludes: {
      "/api/administradora/beneficiarios/vinculos/gerar-pdf": [
        "./assets/modelos/ficha-admissao-apti.pdf",
        "./public/modelos/ficha-admissao-apti.pdf",
      ],
      "/api/administradora/beneficiarios/vinculos/gerar-pdf-lote": [
        "./assets/modelos/ficha-admissao-apti.pdf",
        "./public/modelos/ficha-admissao-apti.pdf",
      ],
    },
  },
  // webpackBuildWorker (experimental) costuma quebrar build em CI (ex.: Netlify) com erros opacos do webpack.
  webpack: (config, { dev }) => {
    // Cache em disco no CI (Netlify) pode corromper e quebrar o WasmHash do webpack.
    if (!dev && (process.env.NETLIFY === "true" || process.env.CI === "true")) {
      config.cache = false
    }
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        // Evita estouro de watchers por dados de sessão do WhatsApp.
        ignored: [
          "**/sessions/**",
          "**/.next/**",
          "**/.git/**",
          "**/node_modules/**",
        ],
      }
    }
    return config
  },
  images: {
    domains: ['images.unsplash.com', 'plus.unsplash.com', 'jtzbuxoslaotpnwsphqv.supabase.co'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jtzbuxoslaotpnwsphqv.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0emJ1eG9zbGFvdHBud3NwaHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDU5MDEsImV4cCI6MjA1ODA4MTkwMX0.jmI-h8pKW00TN5uNpo3Q16GaZzOpFAnPUVO0yyNq54U",
  },
}

export default nextConfig
