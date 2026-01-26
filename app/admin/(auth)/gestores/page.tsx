"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Users } from "lucide-react"
import { PageHeader } from "@/components/admin/page-header"
import { buscarCorretores } from "@/services/corretores-service"
import type { Corretor } from "@/types/corretores"

export default function GestoresPage() {
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    carregarGestores()
  }, [])

  async function carregarGestores() {
    try {
      setLoading(true)
      const todosCorretores = await buscarCorretores()
      // Filtrar apenas gestores (que possuem equipe ou is_gestor = true)
      const gestores = todosCorretores.filter(
        (corretor) => corretor.is_gestor || corretor.link_cadastro_equipe
      )
      setCorretores(gestores)
    } catch (error) {
      console.error("Erro ao carregar gestores:", error)
    } finally {
      setLoading(false)
    }
  }

  const gestoresFiltrados = corretores.filter((gestor) =>
    gestor.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gestor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Contar membros da equipe para cada gestor
  const contarMembrosEquipe = async (gestorId: string) => {
    try {
      const todosCorretores = await buscarCorretores()
      const membros = todosCorretores.filter((c) => c.gestor_id === gestorId)
      return membros.length
    } catch {
      return 0
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestores"
        description="Visualize os corretores que possuem equipes e gerenciam outros corretores"
        icon={Users}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Gestores</CardTitle>
              <CardDescription>
                Corretores que possuem equipes e gerenciam outros corretores
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar gestores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : gestoresFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum gestor encontrado. Gestores são corretores que possuem equipes.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Link de Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gestoresFiltrados.map((gestor) => (
                  <TableRow key={gestor.id}>
                    <TableCell className="font-bold">{gestor.nome?.toUpperCase() || "-"}</TableCell>
                    <TableCell>{gestor.email}</TableCell>
                    <TableCell>{gestor.telefone || gestor.whatsapp || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={gestor.ativo ? "default" : "secondary"}>
                        {gestor.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {gestor.link_cadastro_equipe ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {gestor.link_cadastro_equipe}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}



