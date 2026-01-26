"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Search, Mail, Phone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { listarTenants, type Tenant } from "@/services/tenants-service"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function ClientesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    try {
      setLoading(true)
      const dados = await listarTenants()
      setTenants(dados)
    } catch (error: any) {
      console.error("Erro ao carregar clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  const clientesFiltrados = tenants.filter((tenant) =>
    tenant.nome.toLowerCase().includes(busca.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(busca.toLowerCase()) ||
    tenant.email_remetente?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-600 mt-2">
          Gerencie informações e configurações dos clientes da plataforma EasyBen
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Clientes</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os clientes da plataforma
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum cliente encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Domínio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.nome}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {tenant.slug}
                      </code>
                    </TableCell>
                    <TableCell>{tenant.email_remetente || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={tenant.status === "ativo" ? "default" : "secondary"}
                      >
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.dominio_principal || tenant.subdominio || "-"}
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

