"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ExternalLink, CheckCircle, AlertCircle, Copy } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function TestarLinkPropostaPage() {
  const [loading, setLoading] = useState(false)
  const [propostaId, setPropostaId] = useState("")
  const [resultado, setResultado] = useState<any>(null)
  const [ultimasPropostas, setUltimasPropostas] = useState<any[]>([])

  const buscarUltimasPropostas = async () => {
    try {
      setLoading(true)

      // Buscar das duas tabelas
      const [{ data: propostas1 }, { data: propostas2 }] = await Promise.all([
        supabase
          .from("propostas_corretores")
          .select("id, cliente, email_cliente, created_at, status")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("propostas")
          .select("id, nome_cliente, email, created_at, status")
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      const todasPropostas = [
        ...(propostas1 || []).map((p) => ({
          ...p,
          tabela: "propostas_corretores",
          nome: p.cliente,
          email: p.email_cliente,
        })),
        ...(propostas2 || []).map((p) => ({ ...p, tabela: "propostas", nome: p.nome_cliente, email: p.email })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setUltimasPropostas(todasPropostas.slice(0, 10))
    } catch (error) {
      console.error("Erro ao buscar propostas:", error)
      toast.error("Erro ao buscar propostas")
    } finally {
      setLoading(false)
    }
  }

  const testarProposta = async (id: string) => {
    try {
      setLoading(true)
      setResultado(null)

      console.log("🔍 Testando proposta:", id)

      // Buscar proposta nas duas tabelas
      let proposta = null
      let tabela = ""

      // Tentar propostas_corretores primeiro
      const { data: prop1, error: err1 } = await supabase.from("propostas_corretores").select("*").eq("id", id).single()

      if (prop1 && !err1) {
        proposta = prop1
        tabela = "propostas_corretores"
      } else {
        // Tentar propostas
        const { data: prop2, error: err2 } = await supabase.from("propostas").select("*").eq("id", id).single()

        if (prop2 && !err2) {
          proposta = prop2
          tabela = "propostas"
        }
      }

      if (!proposta) {
        setResultado({
          sucesso: false,
          erro: "Proposta não encontrada em nenhuma tabela",
          detalhes: { id, tabelas_verificadas: ["propostas_corretores", "propostas"] },
        })
        return
      }

      // Buscar dependentes se for propostas_corretores
      let dependentes = []
      if (tabela === "propostas_corretores") {
        const { data: deps } = await supabase
          .from("dependentes_propostas_corretores")
          .select("*")
          .eq("proposta_corretor_id", id)

        dependentes = deps || []
      } else {
        const { data: deps } = await supabase.from("dependentes").select("*").eq("proposta_id", id)

        dependentes = deps || []
      }

      // Buscar questionário de saúde
      let questionario = []
      if (tabela === "propostas_corretores") {
        const { data: quest } = await supabase
          .from("questionario_saude_corretores")
          .select("*")
          .eq("proposta_corretor_id", id)

        questionario = quest || []
      } else {
        const { data: quest } = await supabase.from("questionario_saude").select("*").eq("proposta_id", id)

        questionario = quest || []
      }

      // Gerar link de teste
      const linkTeste = `${window.location.origin}/proposta-digital/completar/${id}`

      setResultado({
        sucesso: true,
        proposta,
        tabela,
        dependentes,
        questionario,
        linkTeste,
        detalhes: {
          id,
          nome: proposta.cliente || proposta.nome_cliente || proposta.nome,
          email: proposta.email_cliente || proposta.email,
          status: proposta.status,
          tem_dependentes: dependentes.length > 0,
          questionario_respondido: questionario.length > 0,
          assinado: !!proposta.assinatura,
          peso_altura: !!(proposta.peso && proposta.altura),
        },
      })
    } catch (error) {
      console.error("Erro ao testar proposta:", error)
      setResultado({
        sucesso: false,
        erro: error.message,
        detalhes: { id, erro_completo: error },
      })
    } finally {
      setLoading(false)
    }
  }

  const copiarLink = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success("Link copiado!")
  }

  const abrirLink = (link: string) => {
    window.open(link, "_blank")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔗 Testar Links de Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="proposta-id">ID da Proposta</Label>
                <Input
                  id="proposta-id"
                  value={propostaId}
                  onChange={(e) => setPropostaId(e.target.value)}
                  placeholder="Digite o ID da proposta"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => testarProposta(propostaId)}
                  disabled={loading || !propostaId}
                  className="bg-[#0F172A] hover:bg-[#1E293B]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar"}
                </Button>
                <Button onClick={buscarUltimasPropostas} disabled={loading} variant="outline">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar Últimas"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Últimas Propostas */}
        {ultimasPropostas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📋 Últimas Propostas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ultimasPropostas.map((prop) => (
                  <div key={prop.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{prop.nome}</p>
                      <p className="text-sm text-gray-500">{prop.email}</p>
                      <p className="text-xs text-gray-400">
                        {prop.tabela} • {new Date(prop.created_at).toLocaleString()} • {prop.status}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setPropostaId(prop.id)
                        testarProposta(prop.id)
                      }}
                      className="bg-[#0F172A] hover:bg-[#1E293B]"
                    >
                      Testar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resultado do Teste */}
        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center ${resultado.sucesso ? "text-[#0F172A]" : "text-red-600"}`}>
                {resultado.sucesso ? (
                  <CheckCircle className="mr-2 h-5 w-5" />
                ) : (
                  <AlertCircle className="mr-2 h-5 w-5" />
                )}
                {resultado.sucesso ? "Teste Bem-sucedido" : "Erro no Teste"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resultado.sucesso ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Cliente</Label>
                      <p className="font-medium">{resultado.detalhes.nome}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="font-medium">{resultado.detalhes.email}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <p className="font-medium">{resultado.detalhes.status}</p>
                    </div>
                    <div>
                      <Label>Tabela</Label>
                      <p className="font-medium">{resultado.tabela}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Dependentes</Label>
                      <p className={resultado.detalhes.tem_dependentes ? "text-[#0F172A]" : "text-gray-500"}>
                        {resultado.dependentes.length} dependente(s)
                      </p>
                    </div>
                    <div>
                      <Label>Questionário</Label>
                      <p className={resultado.detalhes.questionario_respondido ? "text-[#0F172A]" : "text-gray-500"}>
                        {resultado.detalhes.questionario_respondido ? "Respondido" : "Não respondido"}
                      </p>
                    </div>
                    <div>
                      <Label>Assinatura</Label>
                      <p className={resultado.detalhes.assinado ? "text-[#0F172A]" : "text-gray-500"}>
                        {resultado.detalhes.assinado ? "Assinado" : "Não assinado"}
                      </p>
                    </div>
                    <div>
                      <Label>Peso/Altura</Label>
                      <p className={resultado.detalhes.peso_altura ? "text-[#0F172A]" : "text-gray-500"}>
                        {resultado.detalhes.peso_altura ? "Preenchido" : "Não preenchido"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Label>Link de Teste</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input value={resultado.linkTeste} readOnly className="flex-1" />
                      <Button size="sm" onClick={() => copiarLink(resultado.linkTeste)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => abrirLink(resultado.linkTeste)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-red-600">
                  <p className="font-medium">Erro: {resultado.erro}</p>
                  <pre className="mt-2 text-xs bg-red-50 p-2 rounded">
                    {JSON.stringify(resultado.detalhes, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
