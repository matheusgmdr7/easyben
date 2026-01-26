"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function InvestigarFluxoDocumentosPage() {
  const [loading, setLoading] = useState(false)
  const [resultados, setResultados] = useState(null)

  async function investigarFluxoCompleto() {
    setLoading(true)
    try {
      console.log("🔍 INICIANDO INVESTIGAÇÃO COMPLETA DO FLUXO DE DOCUMENTOS")
      console.log("=".repeat(70))

      const investigacao = {
        estruturas: {},
        propostas_recentes: {},
        storage: {},
        analise: {},
      }

      // 1. VERIFICAR ESTRUTURA DAS TABELAS
      console.log("\n1️⃣ VERIFICANDO ESTRUTURAS DAS TABELAS...")

      // Estrutura propostas_corretores
      const { data: estruturaCorretores, error: errorCorretores } = await supabase.rpc("sql", {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'propostas_corretores' 
            AND table_schema = 'public'
          ORDER BY ordinal_position
        `,
      })

      if (!errorCorretores) {
        investigacao.estruturas.propostas_corretores = estruturaCorretores
        console.log("✅ Estrutura propostas_corretores:", estruturaCorretores?.length, "colunas")
      }

      // Estrutura propostas
      const { data: estruturaPropostas, error: errorPropostas } = await supabase.rpc("sql", {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'propostas' 
            AND table_schema = 'public'
          ORDER BY ordinal_position
        `,
      })

      if (!errorPropostas) {
        investigacao.estruturas.propostas = estruturaPropostas
        console.log("✅ Estrutura propostas:", estruturaPropostas?.length, "colunas")
      }

      // 2. BUSCAR PROPOSTAS RECENTES COM ANÁLISE DE DOCUMENTOS
      console.log("\n2️⃣ ANALISANDO PROPOSTAS RECENTES...")

      // Propostas de corretores
      const { data: propostasCorretores } = await supabase
        .from("propostas_corretores")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      if (propostasCorretores) {
        investigacao.propostas_recentes.corretores = propostasCorretores.map((p) => ({
          id: p.id,
          cliente: p.cliente,
          status: p.status,
          created_at: p.created_at,
          tem_documentos_urls: !!p.documentos_urls,
          tem_documentos: !!p.documentos,
          tem_anexos: !!p.anexos,
          tem_arquivos: !!p.arquivos,
          tem_rg_frente: !!p.rg_frente_url,
          tem_cpf: !!p.cpf_url,
          documentos_urls_content: p.documentos_urls,
          documentos_dependentes_content: p.documentos_dependentes_urls,
        }))

        console.log("✅ Propostas corretores analisadas:", propostasCorretores.length)
        propostasCorretores.forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.cliente} - Docs: ${!!p.documentos_urls ? "SIM" : "NÃO"}`)
        })
      }

      // Propostas diretas
      const { data: propostasDirectas } = await supabase
        .from("propostas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      if (propostasDirectas) {
        investigacao.propostas_recentes.diretas = propostasDirectas.map((p) => ({
          id: p.id,
          nome: p.nome_cliente || p.nome,
          status: p.status,
          created_at: p.created_at,
          tem_documentos_urls: !!p.documentos_urls,
          tem_documentos: !!p.documentos,
          documentos_urls_content: p.documentos_urls,
        }))

        console.log("✅ Propostas diretas analisadas:", propostasDirectas.length)
        propostasDirectas.forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.nome_cliente || p.nome} - Docs: ${!!p.documentos_urls ? "SIM" : "NÃO"}`)
        })
      }

      // 3. VERIFICAR STORAGE
      console.log("\n3️⃣ VERIFICANDO STORAGE...")

      const { data: buckets } = await supabase.storage.listBuckets()
      if (buckets) {
        investigacao.storage.buckets = buckets
        console.log("✅ Buckets encontrados:", buckets.map((b) => b.name).join(", "))

        // Verificar arquivos no bucket de documentos
        for (const bucket of buckets) {
          if (bucket.name.includes("documento") || bucket.name.includes("proposta")) {
            const { data: files } = await supabase.storage.from(bucket.name).list("", { limit: 10 })
            if (files) {
              investigacao.storage[bucket.name] = files
              console.log(`   📁 ${bucket.name}: ${files.length} arquivos`)
            }
          }
        }
      }

      // 4. ANÁLISE ESTATÍSTICA
      console.log("\n4️⃣ ANÁLISE ESTATÍSTICA...")

      // Contar propostas com documentos
      const { data: statsCorretores } = await supabase
        .from("propostas_corretores")
        .select("id, documentos_urls, documentos_dependentes_urls")

      if (statsCorretores) {
        const comDocumentos = statsCorretores.filter((p) => p.documentos_urls).length
        const comDocsDependentes = statsCorretores.filter((p) => p.documentos_dependentes_urls).length

        investigacao.analise.corretores = {
          total: statsCorretores.length,
          com_documentos: comDocumentos,
          com_docs_dependentes: comDocsDependentes,
          percentual_com_docs: ((comDocumentos / statsCorretores.length) * 100).toFixed(1),
        }

        console.log(`✅ Estatísticas Corretores:`)
        console.log(`   Total: ${statsCorretores.length}`)
        console.log(`   Com documentos: ${comDocumentos} (${investigacao.analise.corretores.percentual_com_docs}%)`)
        console.log(`   Com docs dependentes: ${comDocsDependentes}`)
      }

      const { data: statsDirectas } = await supabase.from("propostas").select("id, documentos_urls")

      if (statsDirectas) {
        const comDocumentos = statsDirectas.filter((p) => p.documentos_urls).length

        investigacao.analise.diretas = {
          total: statsDirectas.length,
          com_documentos: comDocumentos,
          percentual_com_docs: ((comDocumentos / statsDirectas.length) * 100).toFixed(1),
        }

        console.log(`✅ Estatísticas Diretas:`)
        console.log(`   Total: ${statsDirectas.length}`)
        console.log(`   Com documentos: ${comDocumentos} (${investigacao.analise.diretas.percentual_com_docs}%)`)
      }

      // 5. VERIFICAR CÓDIGO DE UPLOAD
      console.log("\n5️⃣ ANALISANDO FLUXO DE UPLOAD...")

      // Buscar uma proposta com documentos para análise detalhada
      const { data: propostaComDocs } = await supabase
        .from("propostas_corretores")
        .select("*")
        .not("documentos_urls", "is", null)
        .limit(1)
        .single()

      if (propostaComDocs) {
        investigacao.analise.exemplo_com_documentos = {
          id: propostaComDocs.id,
          cliente: propostaComDocs.cliente,
          documentos_urls: propostaComDocs.documentos_urls,
          documentos_dependentes_urls: propostaComDocs.documentos_dependentes_urls,
          estrutura_documentos: Object.keys(propostaComDocs.documentos_urls || {}),
        }

        console.log("✅ Exemplo com documentos encontrado:")
        console.log(`   Cliente: ${propostaComDocs.cliente}`)
        console.log(`   Documentos: ${Object.keys(propostaComDocs.documentos_urls || {}).join(", ")}`)
      }

      console.log("\n🎉 INVESTIGAÇÃO COMPLETA FINALIZADA!")
      setResultados(investigacao)
    } catch (error) {
      console.error("❌ Erro na investigação:", error)
      setResultados({ erro: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Investigar Fluxo de Documentos</h1>
        <button
          onClick={investigarFluxoCompleto}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "🔍 Investigando..." : "🔍 Iniciar Investigação"}
        </button>
      </div>

      {resultados && (
        <div className="space-y-6">
          {/* Estruturas das Tabelas */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📋 Estruturas das Tabelas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">propostas_corretores</h3>
                <div className="text-sm bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                  {resultados.estruturas?.propostas_corretores?.map((col, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{col.column_name}</span>
                      <span className="text-gray-500">{col.data_type}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">propostas</h3>
                <div className="text-sm bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                  {resultados.estruturas?.propostas?.map((col, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{col.column_name}</span>
                      <span className="text-gray-500">{col.data_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Análise Estatística */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📊 Análise Estatística</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {resultados.analise?.corretores && (
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-medium mb-2">Propostas de Corretores</h3>
                  <div className="space-y-1 text-sm">
                    <div>Total: {resultados.analise.corretores.total}</div>
                    <div>Com documentos: {resultados.analise.corretores.com_documentos}</div>
                    <div>Percentual: {resultados.analise.corretores.percentual_com_docs}%</div>
                    <div>Com docs dependentes: {resultados.analise.corretores.com_docs_dependentes}</div>
                  </div>
                </div>
              )}
              {resultados.analise?.diretas && (
                <div className="bg-[#7BD9F6] bg-opacity-20 p-4 rounded">
                  <h3 className="font-medium mb-2">Propostas Diretas</h3>
                  <div className="space-y-1 text-sm">
                    <div>Total: {resultados.analise.diretas.total}</div>
                    <div>Com documentos: {resultados.analise.diretas.com_documentos}</div>
                    <div>Percentual: {resultados.analise.diretas.percentual_com_docs}%</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Propostas Recentes */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📋 Propostas Recentes</h2>
            <div className="space-y-4">
              {resultados.propostas_recentes?.corretores && (
                <div>
                  <h3 className="font-medium mb-2">Propostas de Corretores</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-2 text-left">Cliente</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Docs URLs</th>
                          <th className="p-2 text-left">Docs Deps</th>
                          <th className="p-2 text-left">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.propostas_recentes.corretores.map((p, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-2">{p.cliente}</td>
                            <td className="p-2">{p.status}</td>
                            <td className="p-2">{p.tem_documentos_urls ? "✅" : "❌"}</td>
                            <td className="p-2">{p.tem_documentos_dependentes ? "✅" : "❌"}</td>
                            <td className="p-2">{new Date(p.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">💾 Storage</h2>
            <div className="space-y-2">
              {resultados.storage?.buckets?.map((bucket, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>{bucket.name}</span>
                  <span className="text-sm text-gray-500">{bucket.public ? "Público" : "Privado"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exemplo com Documentos */}
          {resultados.analise?.exemplo_com_documentos && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">📄 Exemplo com Documentos</h2>
              <div className="bg-[#7BD9F6] bg-opacity-20 p-4 rounded">
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Cliente:</strong> {resultados.analise.exemplo_com_documentos.cliente}
                  </div>
                  <div>
                    <strong>ID:</strong> {resultados.analise.exemplo_com_documentos.id}
                  </div>
                  <div>
                    <strong>Documentos:</strong>{" "}
                    {resultados.analise.exemplo_com_documentos.estrutura_documentos.join(", ")}
                  </div>
                  <div className="mt-3">
                    <strong>URLs dos Documentos:</strong>
                    <pre className="bg-white p-2 rounded text-xs mt-1 overflow-x-auto">
                      {JSON.stringify(resultados.analise.exemplo_com_documentos.documentos_urls, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Completo */}
          <div className="bg-yellow-50 p-6 rounded-lg shadow border-2 border-yellow-200">
            <h2 className="text-xl font-semibold mb-4 text-yellow-800">🐛 Debug Completo</h2>
            <pre className="text-xs bg-white p-4 rounded overflow-x-auto max-h-96">
              {JSON.stringify(resultados, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
