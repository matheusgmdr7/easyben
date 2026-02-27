"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link as LinkIcon, Copy, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { formatarCNPJ } from "@/lib/formatters"
import { getCorretorLogado } from "@/services/auth-corretores-simples"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { supabase } from "@/lib/supabase"

export default function LinkCadastroPage() {
  const [linkCadastro, setLinkCadastro] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    carregarLink()
  }, [])

  const carregarLink = async () => {
    try {
      setLoading(true)
      
      const corretorLocal = getCorretorLogado()
      if (!corretorLocal) {
        toast.error("Sessão não encontrada")
        return
      }

      const tenantId = await getCurrentTenantId()
      
      const { data: gestor, error: gestorError } = await supabase
        .from("corretores")
        .select("id, link_cadastro_equipe, razao_social, nome_fantasia, cnpj")
        .eq("id", corretorLocal.id)
        .eq("tenant_id", tenantId)
        .eq("is_gestor", true)
        .single()

      if (gestorError || !gestor) {
        toast.error("Gestor não encontrado")
        return
      }

      setCorretoraInfo({ razao_social: gestor.razao_social, nome_fantasia: gestor.nome_fantasia, cnpj: gestor.cnpj })

      if (gestor.link_cadastro_equipe) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("slug")
          .eq("id", tenantId)
          .single()
        
        setLinkCadastro(`${tenant?.slug || 'default'}/${gestor.link_cadastro_equipe}`)
      } else {
        const novoLink = await gerarLinkCadastro(gestor.id)
        setLinkCadastro(novoLink)
      }
    } catch (error: any) {
      console.error("Erro ao carregar link:", error)
      toast.error(`Erro ao carregar link: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const gerarLinkCadastro = async (gestorId: string): Promise<string> => {
    try {
      const tenantId = await getCurrentTenantId()
      const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const { data: tenant } = await supabase
        .from("tenants")
        .select("slug")
        .eq("id", tenantId)
        .single()

      const link = `corretores/equipe/${token}`

      await supabase
        .from("corretores")
        .update({ link_cadastro_equipe: link })
        .eq("id", gestorId)

      return `${tenant?.slug || 'default'}/${link}`
    } catch (error) {
      console.error("Erro ao gerar link:", error)
      throw error
    }
  }

  const gerarNovoLink = async () => {
    try {
      setGerando(true)
      
      const corretorLocal = getCorretorLogado()
      if (!corretorLocal) {
        toast.error("Sessão não encontrada")
        return
      }

      const novoLink = await gerarLinkCadastro(corretorLocal.id)
      setLinkCadastro(novoLink)
      toast.success("Novo link gerado com sucesso!")
    } catch (error: any) {
      console.error("Erro ao gerar novo link:", error)
      toast.error(`Erro ao gerar novo link: ${error.message}`)
    } finally {
      setGerando(false)
    }
  }

  const copiarLink = () => {
    const urlCompleta = typeof window !== 'undefined' ? `${window.location.origin}/${linkCadastro}` : linkCadastro
    navigator.clipboard.writeText(urlCompleta)
    setCopiado(true)
    toast.success("Link copiado para a área de transferência!")
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Link de Cadastro</h1>
            <p className="text-gray-600 mt-1 font-medium">Gerencie o link de cadastro da sua equipe</p>
            {(corretoraInfo?.razao_social || corretoraInfo?.nome_fantasia || corretoraInfo?.cnpj) && (
              <p className="text-sm text-gray-500 mt-2">
                {corretoraInfo.razao_social || corretoraInfo.nome_fantasia}
                {corretoraInfo.cnpj && <><span className="mx-1">·</span>CNPJ: {formatarCNPJ(corretoraInfo.cnpj)}</>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Link de Cadastro Card */}
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
          <CardTitle className="text-lg font-bold text-gray-900 font-sans flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link de Cadastro para Equipe
          </CardTitle>
          <CardDescription className="text-gray-600 font-medium">
            Compartilhe este link com corretores para que eles se cadastrem diretamente na sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <div className="loading-corporate mx-auto"></div>
                <span className="block mt-4 loading-text-corporate">Carregando link...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="link" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Link de Cadastro
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="link"
                    value={typeof window !== 'undefined' ? `${window.location.origin}/${linkCadastro}` : linkCadastro}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button 
                    onClick={copiarLink} 
                    variant="outline" 
                    className="btn-corporate min-w-[120px]"
                  >
                    {copiado ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-[#0F172A]" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={gerarNovoLink} 
                    variant="outline" 
                    disabled={gerando}
                    className="btn-corporate"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${gerando ? 'animate-spin' : ''}`} />
                    {gerando ? 'Gerando...' : 'Gerar Novo'}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Como usar este link:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Copie o link acima e compartilhe com corretores</li>
                      <li>Corretores que se cadastrarem usando este link serão automaticamente vinculados à sua equipe</li>
                      <li>Você poderá acompanhar o desempenho de cada corretor no dashboard</li>
                      <li>Se necessário, você pode gerar um novo link a qualquer momento</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader className="pb-4 pt-6 bg-gray-50 rounded-t-lg">
          <CardTitle className="text-lg font-bold text-gray-900 font-sans">Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-[#0F172A] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Link Único</p>
                <p className="text-sm text-gray-600 mt-1">
                  Este link é único para a sua equipe e pode ser compartilhado quantas vezes for necessário.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-[#0F172A] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Cadastro Automático</p>
                <p className="text-sm text-gray-600 mt-1">
                  Corretores que se cadastrarem usando este link serão automaticamente vinculados à sua equipe sem necessidade de aprovação manual.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-[#0F172A] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Acompanhamento Completo</p>
                <p className="text-sm text-gray-600 mt-1">
                  Você poderá visualizar todas as propostas, comissões e estatísticas de cada corretor da sua equipe no dashboard.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

