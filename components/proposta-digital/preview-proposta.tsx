"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatarMoeda } from "@/utils/formatters"
import { User, MapPin, FileText, Users, AlertTriangle } from "lucide-react"

interface PreviewPropostaProps {
  proposta: any
}

export default function PreviewProposta({ proposta }: PreviewPropostaProps) {
  // Função para obter o texto da marca d'água baseado no status
  const obterMarcaDagua = (status: string): string => {
    const marcasDagua = {
      parcial: "AGUARDANDO VALIDAÇÃO",
      aguardando_cliente: "AGUARDANDO CLIENTE", 
      pendente: "EM ANÁLISE",
      aprovada: "APROVADA",
      rejeitada: "REJEITADA",
      cadastrado: "CADASTRADO",
      cancelada: "CANCELADA"
    }
    
    return marcasDagua[status as keyof typeof marcasDagua] || "PROPOSTA"
  }

  return (
    <div className="space-y-6 relative">
      {/* Marca d'água */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="text-gray-200 text-7xl font-black transform rotate-45 opacity-20 text-center leading-none">
          {obterMarcaDagua(proposta.status)}
        </div>
      </div>

      <div className="relative z-20">
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800 font-medium">
                Esta proposta está sujeita à análise e aprovação. Os valores e condições podem ser alterados.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dados do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Dados do Titular
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nome</p>
              <p className="font-medium">{proposta.nome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{proposta.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Telefone</p>
              <p className="font-medium">{proposta.telefone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CPF</p>
              <p className="font-medium">{proposta.cpf}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data de Nascimento</p>
              <p className="font-medium">{new Date(proposta.data_nascimento).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sexo</p>
              <p className="font-medium">{proposta.sexo}</p>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {proposta.endereco}, {proposta.numero}
              {proposta.complemento && `, ${proposta.complemento}`}
            </p>
            <p className="text-gray-600">
              {proposta.bairro} - {proposta.cidade}/{proposta.estado}
            </p>
            <p className="text-gray-600">CEP: {proposta.cep}</p>
          </CardContent>
        </Card>

        {/* Plano Selecionado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Plano Selecionado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Produto</p>
                <p className="font-medium">{proposta.produto_nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Código do Plano</p>
                <p className="font-medium">{proposta.sigla_plano}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cobertura</p>
                <p className="font-medium">{proposta.cobertura}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Acomodação</p>
                <p className="font-medium">{proposta.acomodacao}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Valor Mensal:</span>
                <span className="text-2xl font-bold text-[#0F172A]">{formatarMoeda(Number(proposta.valor) || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dependentes */}
        {proposta.tem_dependentes && proposta.dependentes?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Dependentes ({proposta.dependentes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proposta.dependentes.map((dependente, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Dependente {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Nome:</span> {dependente.nome}
                      </div>
                      <div>
                        <span className="text-gray-600">CPF:</span> {dependente.cpf}
                      </div>
                      <div>
                        <span className="text-gray-600">Parentesco:</span> {dependente.parentesco}
                      </div>
                      <div>
                        <span className="text-gray-600">Data de Nascimento:</span>{" "}
                        {new Date(dependente.data_nascimento).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="text-gray-600">Sexo:</span> {dependente.sexo}
                      </div>
                      {dependente.valor_individual && (
                        <div>
                          <span className="text-gray-600">Valor:</span>{" "}
                          {formatarMoeda(Number(dependente.valor_individual))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações do Corretor */}
        {proposta.corretor_nome && (
          <Card>
            <CardHeader>
              <CardTitle>Corretor Responsável</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{proposta.corretor_nome}</p>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {proposta.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{proposta.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
