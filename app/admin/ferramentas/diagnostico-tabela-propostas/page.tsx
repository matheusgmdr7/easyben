"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { AlertCircle, CheckCircle, Database, FileText, Search, Copy } from "lucide-react"
import { toast } from "sonner"

interface ColunaAnalise {
  nome: string
  tipo: string
  nulo_permitido: boolean
  valor_padrao: any
  total_registros: number
  registros_vazios: number
  registros_nulos: number
  percentual_vazio: number
  exemplos_valores: any[]
  status: "critico" | "atencao" | "ok"
}

interface PropostaCompleta {
  [key: string]: any
}

export default function DiagnosticoTabelaPropostasPage() {
  const [carregando, setCarregando] = useState(false)
  const [colunas, setColunas] = useState<ColunaAnalise[]>([])
  const [propostas, setPropostas] = useState<PropostaCompleta[]>([])
  const [estruturaTabela, setEstruturaTabela] = useState<any[]>([])
  const [estatisticas, setEstatisticas] = useState({
    totalPropostas: 0,
    totalColunas: 0,
    colunasProblematicas: 0,
    ultimaAtualizacao: "",
  })

  const analisarTabelaPropostas = async () => {
    setCarregando(true)
    try {
      console.log("🔍 INICIANDO ANÁLISE DA TABELA 'propostas'")
      console.log("=".repeat(50))

      // 1. Buscar todas as propostas
      const { data: todasPropostas, error: propostasError } = await supabase
        .from("propostas")
        .select("*")
        .order("created_at", { ascending: false })

      if (propostasError) {
        console.error("❌ Erro ao buscar propostas:", propostasError)
        throw propostasError
      }

      console.log(`📊 Total de propostas encontradas: ${todasPropostas?.length || 0}`)
      setPropostas(todasPropostas || [])

      if (!todasPropostas || todasPropostas.length === 0) {
        toast.error("Nenhuma proposta encontrada na tabela")
        return
      }

      // 2. Analisar estrutura da tabela (pegar colunas da primeira proposta)
      const primeiraProposta = todasPropostas[0]
      const nomesColunas = Object.keys(primeiraProposta)

      console.log(`📋 Colunas encontradas: ${nomesColunas.length}`)
      console.log("Colunas:", nomesColunas.join(", "))

      // 3. Analisar cada coluna
      const analisesColunas: ColunaAnalise[] = []

      for (const nomeColuna of nomesColunas) {
        console.log(`\n🔍 Analisando coluna: ${nomeColuna}`)

        let registrosVazios = 0
        let registrosNulos = 0
        const exemplosValores: any[] = []
        const tiposEncontrados = new Set<string>()

        // Analisar cada registro para esta coluna
        for (const proposta of todasPropostas) {
          const valor = proposta[nomeColuna]

          // Contar vazios e nulos
          if (valor === null || valor === undefined) {
            registrosNulos++
          } else if (valor === "" || (typeof valor === "string" && valor.trim() === "")) {
            registrosVazios++
          } else {
            // Coletar exemplos de valores válidos (máximo 5)
            if (exemplosValores.length < 5) {
              exemplosValores.push(valor)
            }
          }

          // Identificar tipos de dados
          tiposEncontrados.add(typeof valor)
        }

        const totalRegistros = todasPropostas.length
        const totalVaziosENulos = registrosVazios + registrosNulos
        const percentualVazio = (totalVaziosENulos / totalRegistros) * 100

        // Determinar status da coluna
        let status: "critico" | "atencao" | "ok" = "ok"
        if (percentualVazio > 80) {
          status = "critico"
        } else if (percentualVazio > 50) {
          status = "atencao"
        }

        const analiseColuna: ColunaAnalise = {
          nome: nomeColuna,
          tipo: Array.from(tiposEncontrados).join(" | "),
          nulo_permitido: true, // Assumindo que permite nulo por padrão
          valor_padrao: null,
          total_registros: totalRegistros,
          registros_vazios: registrosVazios,
          registros_nulos: registrosNulos,
          percentual_vazio: Math.round(percentualVazio * 100) / 100,
          exemplos_valores: exemplosValores,
          status,
        }

        analisesColunas.push(analiseColuna)

        console.log(`   Tipo: ${analiseColuna.tipo}`)
        console.log(`   Vazios: ${registrosVazios} | Nulos: ${registrosNulos}`)
        console.log(`   Percentual vazio: ${percentualVazio.toFixed(2)}%`)
        console.log(`   Status: ${status}`)
      }

      // Ordenar por percentual de vazios (maior primeiro)
      analisesColunas.sort((a, b) => b.percentual_vazio - a.percentual_vazio)
      setColunas(analisesColunas)

      // Calcular estatísticas
      const colunasProblematicas = analisesColunas.filter((c) => c.status !== "ok").length

      setEstatisticas({
        totalPropostas: todasPropostas.length,
        totalColunas: analisesColunas.length,
        colunasProblematicas,
        ultimaAtualizacao: new Date().toLocaleString(),
      })

      console.log("\n📊 RESUMO DA ANÁLISE:")
      console.log(`   Total de propostas: ${todasPropostas.length}`)
      console.log(`   Total de colunas: ${analisesColunas.length}`)
      console.log(`   Colunas problemáticas: ${colunasProblematicas}`)

      // Mostrar top 10 colunas mais problemáticas
      console.log("\n🔴 TOP 10 COLUNAS MAIS PROBLEMÁTICAS:")
      analisesColunas.slice(0, 10).forEach((col, index) => {
        console.log(`${index + 1}. ${col.nome}: ${col.percentual_vazio}% vazio`)
      })

      toast.success("Análise concluída com sucesso!")
    } catch (error) {
      console.error("❌ Erro na análise:", error)
      toast.error("Erro ao analisar tabela: " + error.message)
    } finally {
      setCarregando(false)
    }
  }

  const gerarScriptCorrecao = () => {
    const colunasProblematicas = colunas.filter((c) => c.percentual_vazio > 50)

    console.log("\n🔧 SCRIPT DE CORREÇÃO SQL")
    console.log("=".repeat(50))

    console.log("-- Verificar tipos de colunas problemáticas")
    console.log("SELECT column_name, data_type, is_nullable, column_default")
    console.log("FROM information_schema.columns")
    console.log("WHERE table_name = 'propostas'")
    console.log("AND column_name IN (")

    colunasProblematicas.forEach((col, index) => {
      console.log(`  '${col.nome}'${index < colunasProblematicas.length - 1 ? "," : ""}`)
    })

    console.log(");")

    console.log("\n-- Verificar registros com campos vazios")
    colunasProblematicas.slice(0, 5).forEach((col) => {
      console.log(`\n-- Coluna: ${col.nome} (${col.percentual_vazio}% vazio)`)
      console.log(`SELECT id, created_at, ${col.nome}`)
      console.log(`FROM propostas`)
      console.log(`WHERE ${col.nome} IS NULL OR ${col.nome} = ''`)
      console.log(`ORDER BY created_at DESC LIMIT 10;`)
    })

    // Copiar para clipboard se possível
    const script =
      `-- Script gerado automaticamente em ${new Date().toLocaleString()}\n` +
      colunasProblematicas
        .map(
          (col) =>
            `SELECT '${col.nome}' as coluna, COUNT(*) as total_vazios FROM propostas WHERE ${col.nome} IS NULL OR ${col.nome} = '';`,
        )
        .join("\n")

    if (navigator.clipboard) {
      navigator.clipboard.writeText(script)
      toast.success("Script SQL copiado para clipboard!")
    }
  }

  const copiarDadosColuna = async (nomeColuna: string) => {
    try {
      const { data, error } = await supabase
        .from("propostas")
        .select(`id, created_at, ${nomeColuna}`)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error

      const texto =
        `Coluna: ${nomeColuna}\n` +
        `Total de registros: ${data?.length || 0}\n\n` +
        (data || [])
          .map((item) => `ID: ${item.id} | Data: ${item.created_at} | Valor: ${JSON.stringify(item[nomeColuna])}`)
          .join("\n")

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(texto)
        toast.success(`Dados da coluna ${nomeColuna} copiados!`)
      }
    } catch (error) {
      console.error("Erro ao copiar dados:", error)
      toast.error("Erro ao copiar dados da coluna")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critico":
        return "bg-red-100 text-red-800 border-red-200"
      case "atencao":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A] border-[#7BD9F6] border-opacity-30"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "critico":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "atencao":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-[#0F172A]" />
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Diagnóstico da Tabela "propostas"</h1>
        <p className="text-muted-foreground">
          Análise detalhada das colunas e identificação de campos vazios na tabela propostas
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Análise da Tabela
            </CardTitle>
            <CardDescription>Verificar estrutura e dados da tabela "propostas"</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={analisarTabelaPropostas} disabled={carregando} className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                {carregando ? "Analisando..." : "Analisar Tabela"}
              </Button>
              {colunas.length > 0 && (
                <Button variant="outline" onClick={gerarScriptCorrecao}>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Script SQL
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {estatisticas.totalPropostas > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.totalPropostas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total de Colunas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.totalColunas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Colunas Problemáticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{estatisticas.colunasProblematicas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Última Análise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">{estatisticas.ultimaAtualizacao}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {colunas.length > 0 && (
          <Tabs defaultValue="problematicas" className="w-full">
            <TabsList>
              <TabsTrigger value="problematicas">Colunas Problemáticas</TabsTrigger>
              <TabsTrigger value="todas">Todas as Colunas</TabsTrigger>
              <TabsTrigger value="propostas">Últimas Propostas</TabsTrigger>
            </TabsList>

            <TabsContent value="problematicas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Colunas com Mais Campos Vazios</CardTitle>
                  <CardDescription>Colunas ordenadas por percentual de campos vazios (maior primeiro)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Coluna</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>% Vazio</TableHead>
                        <TableHead>Vazios/Total</TableHead>
                        <TableHead>Exemplos</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {colunas
                        .filter((c) => c.percentual_vazio > 0)
                        .map((coluna) => (
                          <TableRow key={coluna.nome}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(coluna.status)}
                                <Badge className={getStatusColor(coluna.status)}>{coluna.status}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{coluna.nome}</TableCell>
                            <TableCell>
                              <code className="text-xs bg-gray-100 px-1 rounded">{coluna.tipo}</code>
                            </TableCell>
                            <TableCell>
                              <Badge variant={coluna.percentual_vazio > 50 ? "destructive" : "secondary"}>
                                {coluna.percentual_vazio}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {coluna.registros_vazios + coluna.registros_nulos} / {coluna.total_registros}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                {coluna.exemplos_valores.length > 0 ? (
                                  <div className="text-xs space-y-1">
                                    {coluna.exemplos_valores.slice(0, 2).map((valor, idx) => (
                                      <div key={idx} className="bg-gray-50 p-1 rounded truncate">
                                        {JSON.stringify(valor)}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">Sem exemplos</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => copiarDadosColuna(coluna.nome)}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="todas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Todas as Colunas da Tabela</CardTitle>
                  <CardDescription>Visão completa de todas as colunas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {colunas.map((coluna) => (
                      <div key={coluna.nome} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{coluna.nome}</span>
                          {getStatusIcon(coluna.status)}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Tipo: {coluna.tipo}</div>
                          <div>Vazios: {coluna.percentual_vazio}%</div>
                          <div>Total: {coluna.total_registros}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="propostas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Últimas 5 Propostas</CardTitle>
                  <CardDescription>Dados das propostas mais recentes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {propostas.slice(0, 5).map((proposta, index) => (
                      <div key={proposta.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">
                            Proposta #{proposta.id} - {proposta.nome_cliente || proposta.cliente || "Sem nome"}
                          </h4>
                          <Badge variant="outline">{new Date(proposta.created_at).toLocaleDateString()}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Email:</span>{" "}
                            {proposta.email_cliente || proposta.email || "Vazio"}
                          </div>
                          <div>
                            <span className="font-medium">CPF:</span> {proposta.cpf || "Vazio"}
                          </div>
                          <div>
                            <span className="font-medium">Telefone:</span>{" "}
                            {proposta.telefone || proposta.whatsapp_cliente || "Vazio"}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> {proposta.status || "Vazio"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {colunas.length === 0 && !carregando && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Clique em "Analisar Tabela" para verificar a estrutura e dados da tabela propostas.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
