"use client"

import { useState, useEffect } from "react"
import { buscarPropostasCorretores, atualizarStatusPropostaCorretor } from "@/services/propostas-corretores-service"
import type { PropostaCorretor } from "@/types/corretores"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { formatarMoeda } from "@/utils/formatters"

export default function PropostasCorretoresPage() {
  const [propostas, setPropostas] = useState<PropostaCorretor[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<string>("todos")
  const [propostaDetalhada, setPropostaDetalhada] = useState<PropostaCorretor | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showDocumentosModal, setShowDocumentosModal] = useState(false)
  const [propostaDocumentos, setPropostaDocumentos] = useState<PropostaCorretor | null>(null)

  useEffect(() => {
    carregarPropostas()
  }, [])

  async function carregarPropostas() {
    try {
      setLoading(true)
      const data = await buscarPropostasCorretores()
      setPropostas(data)
    } catch (error) {
      console.error("Erro ao carregar propostas:", error)
      toast.error("Erro ao carregar propostas")
    } finally {
      setLoading(false)
    }
  }

  async function aprovarProposta(id: string) {
    try {
      await atualizarStatusPropostaCorretor(id, "aprovada")
      toast.success("Proposta aprovada com sucesso")
      carregarPropostas()
    } catch (error) {
      console.error("Erro ao aprovar proposta:", error)
      toast.error("Erro ao aprovar proposta")
    }
  }

  async function rejeitarProposta() {
    if (!propostaDetalhada) return

    try {
      await atualizarStatusPropostaCorretor(propostaDetalhada.id, "rejeitada", motivoRejeicao)
      toast.success("Proposta rejeitada com sucesso")
      setShowModal(false)
      setMotivoRejeicao("")
      setPropostaDetalhada(null)
      carregarPropostas()
    } catch (error) {
      console.error("Erro ao rejeitar proposta:", error)
      toast.error("Erro ao rejeitar proposta")
    }
  }

  function abrirModalRejeicao(proposta: PropostaCorretor) {
    setPropostaDetalhada(proposta)
    setShowModal(true)
  }

  function visualizarDocumentos(proposta: PropostaCorretor) {
    setPropostaDocumentos(proposta)
    setShowDocumentosModal(true)
  }

  const propostasFiltradas = propostas.filter((proposta) => {
    const matchFiltro =
      proposta.cliente.toLowerCase().includes(filtro.toLowerCase()) ||
      (proposta.whatsapp_cliente && proposta.whatsapp_cliente.toLowerCase().includes(filtro.toLowerCase())) ||
      proposta.produto.toLowerCase().includes(filtro.toLowerCase()) ||
      proposta.corretores?.nome.toLowerCase().includes(filtro.toLowerCase())

    if (statusFiltro === "todos") return matchFiltro
    return matchFiltro && proposta.status === statusFiltro
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Propostas de Corretores</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Resumo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total de Propostas</p>
            <p className="text-2xl font-bold">{propostas.length}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Pendentes de Aprovação</p>
            <p className="text-2xl font-bold">{propostas.filter((p) => p.status === "pendente").length}</p>
          </div>
          <div className="bg-[#7BD9F6] bg-opacity-20 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Valor Total Aprovado</p>
            <p className="text-2xl font-bold">
              {formatarMoeda(
                propostas.filter((p) => p.status === "aprovada").reduce((acc, p) => acc + Number(p.valor), 0),
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between mb-6">
          <h2 className="text-lg font-semibold mb-4 md:mb-0">Lista de Propostas</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div>
              <input
                type="text"
                placeholder="Buscar proposta..."
                className="border rounded-md px-3 py-2 w-full"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>
            <div>
              <select
                className="border rounded-md px-3 py-2 w-full"
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
              >
                <option value="todos">Todos os status</option>
                <option value="pendente">Pendentes</option>
                <option value="aprovada">Aprovadas</option>
                <option value="rejeitada">Rejeitadas</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 text-left">Cliente</th>
                  <th className="py-3 px-4 text-left">WhatsApp</th>
                  <th className="py-3 px-4 text-left">Corretor</th>
                  <th className="py-3 px-4 text-left">Produto</th>
                  <th className="py-3 px-4 text-left">Valor</th>
                  <th className="py-3 px-4 text-left">Comissão</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Documentos</th>
                  <th className="py-3 px-4 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {propostasFiltradas.length > 0 ? (
                  propostasFiltradas.map((proposta) => (
                    <tr key={proposta.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{proposta.cliente}</td>
                      <td className="py-3 px-4">
                        {proposta.whatsapp_cliente ? (
                          <a
                            href={`https://wa.me/${proposta.whatsapp_cliente.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0F172A] hover:underline flex items-center"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-1"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                              <path
                                d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.373 12-12 0-6.628-5.373-12-12-12zm.029 18.88a7.947 7.947 0 0 1-3.82-.97l-4.237 1.11 1.13-4.13a7.908 7.908 0 0 1-1.068-3.969c0-4.37 3.582-7.93 8.006-7.93 4.423 0 8.006 3.56 8.006 7.93 0 4.37-3.583 7.93-8.006 7.93z"
                                fillRule="evenodd"
                                clipRule="evenodd"
                              />
                            </svg>
                            {proposta.whatsapp_cliente}
                          </a>
                        ) : (
                          <span className="text-gray-400">Não informado</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{proposta.corretores?.nome || "N/A"}</td>
                      <td className="py-3 px-4">{proposta.produto}</td>
                      <td className="py-3 px-4">{formatarMoeda(proposta.valor)}</td>
                      <td className="py-3 px-4">{formatarMoeda(proposta.comissao)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            proposta.status === "aprovada"
                              ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                              : proposta.status === "rejeitada"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {proposta.status === "aprovada"
                            ? "Aprovada"
                            : proposta.status === "rejeitada"
                              ? "Rejeitada"
                              : "Pendente"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {proposta.documento_rg_frente ||
                        proposta.documento_rg_verso ||
                        proposta.documento_comprovante_residencia ||
                        (proposta.documentos_propostas_corretores &&
                          proposta.documentos_propostas_corretores.length > 0) ? (
                          <button
                            onClick={() => visualizarDocumentos(proposta)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                          >
                            Ver Documentos
                          </button>
                        ) : (
                          <span className="text-gray-400">Sem documentos</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {proposta.status === "pendente" && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => aprovarProposta(proposta.id)}
                              className="bg-[#7BD9F6] bg-opacity-200 text-white px-3 py-1 rounded-md text-sm hover:bg-[#0F172A]"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => abrirModalRejeicao(proposta)}
                              className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600"
                            >
                              Rejeitar
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => setPropostaDetalhada(proposta)}
                          className="text-blue-500 underline text-sm ml-2"
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-500">
                      Nenhuma proposta encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Rejeição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Rejeitar Proposta</h3>
            <p className="mb-4">Informe o motivo da rejeição:</p>
            <textarea
              className="w-full border rounded-md p-2 mb-4"
              rows={4}
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Motivo da rejeição..."
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowModal(false)
                  setMotivoRejeicao("")
                  setPropostaDetalhada(null)
                }}
                className="px-4 py-2 border rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={rejeitarProposta}
                className="px-4 py-2 bg-red-500 text-white rounded-md"
                disabled={!motivoRejeicao.trim()}
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {propostaDetalhada && !showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Detalhes da Proposta</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Cliente</p>
                <p className="font-medium">{propostaDetalhada.cliente}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">WhatsApp</p>
                {propostaDetalhada.whatsapp_cliente ? (
                  <a
                    href={`https://wa.me/${propostaDetalhada.whatsapp_cliente.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F172A] hover:underline flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path
                        d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.373 12-12 0-6.628-5.373-12-12-12zm.029 18.88a7.947 7.947 0 0 1-3.82-.97l-4.237 1.11 1.13-4.13a7.908 7.908 0 0 1-1.068-3.969c0-4.37 3.582-7.93 8.006-7.93 4.423 0 8.006 3.56 8.006 7.93 0 4.37-3.583 7.93-8.006 7.93z"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      />
                    </svg>
                    {propostaDetalhada.whatsapp_cliente}
                  </a>
                ) : (
                  <p className="font-medium text-gray-400">Não informado</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Corretor</p>
                <p className="font-medium">{propostaDetalhada.corretores?.nome || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Produto</p>
                <p className="font-medium">{propostaDetalhada.produto}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor</p>
                <p className="font-medium">{formatarMoeda(propostaDetalhada.valor)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Comissão</p>
                <p className="font-medium">{formatarMoeda(propostaDetalhada.comissao)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      propostaDetalhada.status === "aprovada"
                        ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]"
                        : propostaDetalhada.status === "rejeitada"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {propostaDetalhada.status === "aprovada"
                      ? "Aprovada"
                      : propostaDetalhada.status === "rejeitada"
                        ? "Rejeitada"
                        : "Pendente"}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data</p>
                <p className="font-medium">{new Date(propostaDetalhada.data).toLocaleDateString()}</p>
              </div>
            </div>

            {propostaDetalhada.status === "rejeitada" && propostaDetalhada.motivo_rejeicao && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">Motivo da Rejeição</p>
                <p className="font-medium">{propostaDetalhada.motivo_rejeicao}</p>
              </div>
            )}

            {(propostaDetalhada.documento_rg_frente ||
              propostaDetalhada.documento_rg_verso ||
              propostaDetalhada.documento_comprovante_residencia ||
              (propostaDetalhada.documentos_propostas_corretores &&
                propostaDetalhada.documentos_propostas_corretores.length > 0)) && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Documentos</p>
                <button
                  onClick={() => {
                    setPropostaDetalhada(null)
                    visualizarDocumentos(propostaDetalhada)
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                >
                  Visualizar Documentos
                </button>
              </div>
            )}

            {propostaDetalhada.documentos_propostas_corretores &&
              propostaDetalhada.documentos_propostas_corretores.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Documentos</p>
                  <ul className="space-y-2">
                    {propostaDetalhada.documentos_propostas_corretores.map((doc) => (
                      <li key={doc.id}>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          {doc.nome}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            <div className="flex justify-end">
              <button onClick={() => setPropostaDetalhada(null)} className="px-4 py-2 bg-gray-200 rounded-md">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Documentos */}
      {showDocumentosModal && propostaDocumentos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Documentos do Cliente</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Cliente: <span className="font-medium">{propostaDocumentos.cliente}</span>
              </p>
              {propostaDocumentos.whatsapp_cliente && (
                <p className="text-sm text-gray-600">
                  WhatsApp:{" "}
                  <a
                    href={`https://wa.me/${propostaDocumentos.whatsapp_cliente.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0F172A] hover:underline"
                  >
                    {propostaDocumentos.whatsapp_cliente}
                  </a>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* RG/CNH Frente */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">RG/CNH (Frente)</h4>
                {propostaDocumentos.documento_rg_frente ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full h-48 mb-2 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${propostaDocumentos.documento_rg_frente}`}
                        alt="RG/CNH Frente"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder-document.png"
                        }}
                      />
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${propostaDocumentos.documento_rg_frente}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                    >
                      Visualizar/Baixar
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 bg-gray-100 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-gray-500 mt-2">Documento não enviado</p>
                  </div>
                )}
              </div>

              {/* RG/CNH Verso */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">RG/CNH (Verso)</h4>
                {propostaDocumentos.documento_rg_verso ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full h-48 mb-2 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${propostaDocumentos.documento_rg_verso}`}
                        alt="RG/CNH Verso"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder-document.png"
                        }}
                      />
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${propostaDocumentos.documento_rg_verso}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                    >
                      Visualizar/Baixar
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 bg-gray-100 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-gray-500 mt-2">Documento não enviado</p>
                  </div>
                )}
              </div>

              {/* Comprovante de Residência */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Comprovante de Residência</h4>
                {propostaDocumentos.documento_comprovante_residencia ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full h-48 mb-2 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${propostaDocumentos.documento_comprovante_residencia}`}
                        alt="Comprovante de Residência"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder-document.png"
                        }}
                      />
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${propostaDocumentos.documento_comprovante_residencia}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                    >
                      Visualizar/Baixar
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 bg-gray-100 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-gray-500 mt-2">Documento não enviado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Outros documentos da proposta */}
            {propostaDocumentos.documentos_propostas_corretores &&
              propostaDocumentos.documentos_propostas_corretores.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Outros Documentos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {propostaDocumentos.documentos_propostas_corretores.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="font-medium truncate">{doc.nome}</span>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 inline-block"
                        >
                          Visualizar/Baixar
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowDocumentosModal(false)
                  setPropostaDocumentos(null)
                }}
                className="px-4 py-2 bg-gray-200 rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
