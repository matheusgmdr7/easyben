import { Suspense } from "react"
import { buscarPropostasCorretores } from "@/services/propostas-corretores-service"
import type { PropostaCorretor } from "@/types/corretores"
import { formatarData } from "@/utils/formatters"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AprovarReprovarProposta } from "./aprovar-reprovar-proposta"
import { Skeleton } from "@/components/ui/skeleton"
import { VisualizarDocumentos } from "./visualizar-documentos"

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export default function PropostasCorretoresPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Propostas de Corretores</h1>
      <Suspense fallback={<PropostasCorretoresLoading />}>
        <PropostasCorretores />
      </Suspense>
    </div>
  )
}

function PropostasCorretoresLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-8 w-64" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-full" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[400px] w-full" />
      </CardContent>
    </Card>
  )
}

async function PropostasCorretores() {
  const propostas = await buscarPropostasCorretores()

  const propostasPendentes = propostas.filter((proposta) => proposta.status === "pendente")
  const propostasAprovadas = propostas.filter((proposta) => proposta.status === "aprovada")
  const propostasReprovadas = propostas.filter((proposta) => proposta.status === "reprovada")

  return (
    <Tabs defaultValue="pendentes">
      <TabsList className="mb-4">
        <TabsTrigger value="pendentes">Pendentes ({propostasPendentes.length})</TabsTrigger>
        <TabsTrigger value="aprovadas">Aprovadas ({propostasAprovadas.length})</TabsTrigger>
        <TabsTrigger value="reprovadas">Reprovadas ({propostasReprovadas.length})</TabsTrigger>
        <TabsTrigger value="todas">Todas ({propostas.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pendentes">
        <TabelaPropostas propostas={propostasPendentes} />
      </TabsContent>

      <TabsContent value="aprovadas">
        <TabelaPropostas propostas={propostasAprovadas} />
      </TabsContent>

      <TabsContent value="reprovadas">
        <TabelaPropostas propostas={propostasReprovadas} />
      </TabsContent>

      <TabsContent value="todas">
        <TabelaPropostas propostas={propostas} />
      </TabsContent>
    </Tabs>
  )
}

function TabelaPropostas({ propostas }: { propostas: PropostaCorretor[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Documentos</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propostas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  Nenhuma proposta encontrada
                </TableCell>
              </TableRow>
            ) : (
              propostas.map((proposta) => (
                <TableRow key={proposta.id}>
                  <TableCell>{formatarData(proposta.created_at || "")}</TableCell>
                  <TableCell>
                    <div className="font-medium">{proposta.corretores?.nome || "N/A"}</div>
                    <div className="text-sm text-muted-foreground">{proposta.corretores?.email || "N/A"}</div>
                    <div className="text-sm text-muted-foreground">{proposta.corretores?.whatsapp || "N/A"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{proposta.nome_cliente || "N/A"}</div>
                    <div className="text-sm text-muted-foreground">{proposta.email_cliente || "N/A"}</div>
                    <div className="text-sm text-muted-foreground">{proposta.whatsapp_cliente || "N/A"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{proposta.operadora || "N/A"}</div>
                    <div className="text-sm text-muted-foreground">{proposta.plano || "N/A"}</div>
                    <div className="text-sm text-muted-foreground">{proposta.tipo_plano || "N/A"}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={proposta.status || "pendente"} />
                    {proposta.status === "reprovada" && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Motivo: {proposta.motivo_rejeicao || "Não informado"}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <VisualizarDocumentos proposta={proposta} />
                  </TableCell>
                  <TableCell>
                    {proposta.status === "pendente" && <AprovarReprovarProposta proposta={proposta} />}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "aprovada":
      return <Badge className="bg-[#7BD9F6] bg-opacity-200">Aprovada</Badge>
    case "reprovada":
      return <Badge variant="destructive">Reprovada</Badge>
    case "pendente":
    default:
      return <Badge variant="outline">Pendente</Badge>
  }
}
