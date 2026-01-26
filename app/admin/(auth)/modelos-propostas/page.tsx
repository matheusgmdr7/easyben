"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { FileText, Plus, Trash2, CheckCircle, XCircle, UploadCloud } from "lucide-react"

export default function ModelosPropostasPage() {
  const [modelos, setModelos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNovo, setShowNovo] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarModelos()
  }, [])

  async function carregarModelos() {
    setLoading(true)
    const { data, error } = await supabase
      .from("modelos_propostas")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) toast.error("Erro ao carregar modelos")
    setModelos(data || [])
    setLoading(false)
  }

  async function cadastrarModelo() {
    if (!titulo || !arquivo) {
      toast.error("Preencha o título e selecione um arquivo PDF")
      return
    }
    setSalvando(true)
    try {
      // Upload do arquivo para o storage
      const nomeArquivo = `modelos-propostas/${Date.now()}_${arquivo.name.replace(/\s+/g, "_")}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("arquivos")
        .upload(nomeArquivo, arquivo, { contentType: "application/pdf" })
      if (uploadError) throw uploadError
      // Gerar URL pública
      const { data: urlData } = supabase.storage.from("arquivos").getPublicUrl(nomeArquivo)
      // Salvar no banco
      const { error: insertError } = await supabase
        .from("modelos_propostas")
        .insert({ titulo, arquivo_url: urlData.publicUrl, ativo: true })
      if (insertError) throw insertError
      toast.success("Modelo cadastrado com sucesso!")
      setShowNovo(false)
      setTitulo("")
      setArquivo(null)
      carregarModelos()
    } catch (error: any) {
      toast.error("Erro ao cadastrar modelo: " + error.message)
    } finally {
      setSalvando(false)
    }
  }

  async function ativarDesativarModelo(id: string, ativo: boolean) {
    const { error } = await supabase
      .from("modelos_propostas")
      .update({ ativo: !ativo })
      .eq("id", id)
    if (error) toast.error("Erro ao atualizar modelo")
    else carregarModelos()
  }

  async function excluirModelo(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este modelo?")) return
    const { error } = await supabase
      .from("modelos_propostas")
      .delete()
      .eq("id", id)
    if (error) toast.error("Erro ao excluir modelo")
    else carregarModelos()
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-sans flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#0F172A]" /> Modelos de Propostas
            </h1>
            <p className="text-gray-600 mt-1 font-medium">Gerencie os modelos de propostas disponíveis</p>
          </div>
          <Button onClick={() => setShowNovo(!showNovo)} className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-6 py-2 btn-corporate shadow-corporate flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Modelo
          </Button>
        </div>
      </div>

      {showNovo && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Modelo de Proposta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título do modelo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo PDF</label>
                <Input type="file" accept="application/pdf" onChange={e => setArquivo(e.target.files?.[0] || null)} />
                {arquivo && <div className="text-xs text-gray-600 mt-1">{arquivo.name}</div>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNovo(false)}>Cancelar</Button>
                <Button onClick={cadastrarModelo} disabled={salvando || !titulo || !arquivo} className="bg-blue-600 text-white">
                  {salvando ? "Salvando..." : <><UploadCloud className="h-4 w-4 mr-1" />Salvar</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Modelos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-center">
                <div className="loading-corporate mx-auto"></div>
                <span className="block mt-4 loading-text-corporate">Carregando modelos...</span>
                <p className="text-xs text-gray-500 mt-2">Aguarde um momento</p>
              </div>
            </div>
          ) : modelos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum modelo cadastrado ainda.</div>
          ) : (
            <div className="divide-y">
              {modelos.map((modelo: any) => (
                <div key={modelo.id} className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" /> {modelo.titulo}
                      {modelo.ativo ? (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#7BD9F6] bg-opacity-30 text-[#0F172A] flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ativo</span>
                      ) : (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 flex items-center gap-1"><XCircle className="h-3 w-3" /> Inativo</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{modelo.arquivo_url && <a href={modelo.arquivo_url} target="_blank" rel="noopener noreferrer" className="underline">Visualizar PDF</a>}</div>
                    <div className="text-xs text-gray-400">Cadastrado em: {new Date(modelo.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <Button variant="outline" size="sm" onClick={() => ativarDesativarModelo(modelo.id, modelo.ativo)}>
                      {modelo.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => excluirModelo(modelo.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
