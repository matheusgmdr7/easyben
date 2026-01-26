"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  buscarUsuariosAdmin,
  criarUsuarioAdmin,
  validarSenhaUsuarioAdmin,
  inicializarSistemaUsuarios,
  type UsuarioAdmin,
  type CriarUsuarioAdmin,
} from "@/services/usuarios-admin-service"

export default function TestarUsuariosPage() {
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [novoUsuario, setNovoUsuario] = useState<CriarUsuarioAdmin>({
    nome: "",
    email: "",
    senha: "",
    perfil: "assistente",
  })
  const [loginData, setLoginData] = useState({ email: "", senha: "" })
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioAdmin | null>(null)

  const handleInicializar = async () => {
    try {
      setLoading(true)
      console.log("🚀 Inicializando sistema...")
      await inicializarSistemaUsuarios()
      toast.success("Sistema inicializado com sucesso")
    } catch (error: any) {
      console.error("❌ Erro ao inicializar:", error)
      toast.error(error.message || "Erro ao inicializar sistema")
    } finally {
      setLoading(false)
    }
  }

  const handleBuscarUsuarios = async () => {
    try {
      setLoading(true)
      console.log("🔍 Buscando usuários...")
      const data = await buscarUsuariosAdmin()
      setUsuarios(data)
      toast.success(`${data.length} usuários encontrados`)
    } catch (error: any) {
      console.error("❌ Erro ao buscar usuários:", error)
      toast.error(error.message || "Erro ao buscar usuários")
    } finally {
      setLoading(false)
    }
  }

  const handleCriarUsuario = async () => {
    try {
      if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.senha) {
        toast.error("Preencha todos os campos")
        return
      }

      setLoading(true)
      console.log("👤 Criando usuário de teste...")

      // Usar o primeiro usuário master como criador, se existir
      let criadorId: string | undefined
      if (usuarios.length > 0) {
        const usuarioMaster = usuarios.find((u) => u.perfil === "master")
        criadorId = usuarioMaster?.id
      }

      const usuario = await criarUsuarioAdmin(novoUsuario, criadorId)
      toast.success("Usuário criado com sucesso!")

      // Limpar formulário
      setNovoUsuario({
        nome: "",
        email: "",
        senha: "",
        perfil: "assistente",
      })

      // Atualizar lista
      await handleBuscarUsuarios()
    } catch (error: any) {
      console.error("❌ Erro ao criar usuário:", error)
      toast.error(error.message || "Erro ao criar usuário")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    try {
      if (!loginData.email || !loginData.senha) {
        toast.error("Preencha email e senha")
        return
      }

      setLoading(true)
      console.log("🔐 Testando login...")
      const usuario = await validarSenhaUsuarioAdmin(loginData.email, loginData.senha)

      if (usuario) {
        setUsuarioLogado(usuario)
        toast.success(`Login realizado com sucesso! Bem-vindo, ${usuario.nome}`)
      } else {
        toast.error("Email ou senha inválidos")
      }
    } catch (error: any) {
      console.error("❌ Erro no login:", error)
      toast.error(error.message || "Erro no login")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setUsuarioLogado(null)
    setLoginData({ email: "", senha: "" })
    toast.success("Logout realizado com sucesso")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teste do Sistema de Usuários</h1>
          <p className="text-gray-600">Ferramenta para testar a criação e autenticação de usuários administrativos</p>
        </div>
      </div>

      {/* Status do usuário logado */}
      {usuarioLogado && (
        <Card className="border-[#7BD9F6] border-opacity-30 bg-[#7BD9F6] bg-opacity-20">
          <CardHeader>
            <CardTitle className="text-[#0F172A]">Usuário Logado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{usuarioLogado.nome}</p>
                <p className="text-sm text-gray-600">{usuarioLogado.email}</p>
                <Badge variant="outline" className="mt-1">
                  {usuarioLogado.perfil}
                </Badge>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inicializar Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>1. Inicializar Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Execute primeiro para verificar se as tabelas existem e criar o usuário master padrão.
            </p>
            <Button onClick={handleInicializar} disabled={loading} className="w-full">
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Inicializar Sistema
            </Button>
          </CardContent>
        </Card>

        {/* Buscar Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>2. Buscar Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Listar todos os usuários cadastrados no sistema.</p>
            <Button onClick={handleBuscarUsuarios} disabled={loading} className="w-full">
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Buscar Usuários ({usuarios.length})
            </Button>
          </CardContent>
        </Card>

        {/* Criar Usuário */}
        <Card>
          <CardHeader>
            <CardTitle>3. Criar Usuário de Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={novoUsuario.nome}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={novoUsuario.email}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="********"
                value={novoUsuario.senha}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perfil">Perfil</Label>
              <Select
                value={novoUsuario.perfil}
                onValueChange={(value: any) => setNovoUsuario({ ...novoUsuario, perfil: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="secretaria">Secretaria</SelectItem>
                  <SelectItem value="assistente">Assistente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCriarUsuario} disabled={loading} className="w-full">
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Criar Usuário
            </Button>
          </CardContent>
        </Card>

        {/* Testar Login */}
        <Card>
          <CardHeader>
            <CardTitle>4. Testar Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Credenciais padrão: admin@sistema.com / admin123</p>
            <div className="space-y-2">
              <Label htmlFor="loginEmail">Email</Label>
              <Input
                id="loginEmail"
                type="email"
                placeholder="admin@sistema.com"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loginSenha">Senha</Label>
              <Input
                id="loginSenha"
                type="password"
                placeholder="admin123"
                value={loginData.senha}
                onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
              />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Testar Login
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Usuários */}
      {usuarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usuarios.map((usuario) => (
                <div key={usuario.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{usuario.nome}</p>
                    <p className="text-sm text-gray-600">{usuario.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{usuario.perfil}</Badge>
                    <Badge variant={usuario.status === "ativo" ? "default" : "secondary"}>{usuario.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
