"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, Trash2, FileUp } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { saveProposta, saveDependente, saveDocumento, saveQuestionario, uploadFile } from "@/utils/supabase"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { validarCPF } from "@/utils/validations"

// Schema de validação
const propostaSchema = z.object({
  // Dados do Titular
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().min(14, "WhatsApp inválido"),
  sexo: z.string().min(1, "Selecione o sexo"),
  endereco: z.string().min(3, "Endereço deve ter no mínimo 3 caracteres"),
  complemento: z.string().optional(),
  cep: z.string().min(9, "CEP inválido"),
  bairro: z.string().min(3, "Bairro deve ter no mínimo 3 caracteres"),
  cidade: z.string().min(3, "Cidade deve ter no mínimo 3 caracteres"),
  estado: z.string().length(2, "Estado deve ter 2 caracteres"),
  rg: z.string().min(7, "RG inválido"),
  orgaoExpedidor: z.string().min(2, "Órgão expedidor inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  cns: z.string().min(15, "CNS inválido"),
  ufNascimento: z.string().length(2, "UF deve ter 2 caracteres"),
  dataNascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  idade: z.string().min(1, "Idade é obrigatória"),
  estadoCivil: z.string().min(1, "Selecione o estado civil"),
  nomeMae: z.string().min(3, "Nome da mãe deve ter no mínimo 3 caracteres"),
  nomePai: z.string().min(3, "Nome do pai deve ter no mínimo 3 caracteres"),

  // Dados do Plano
  plano: z.string().min(1, "Plano é obrigatório"),
  valor: z.string().min(1, "Valor é obrigatório"),
  abrangencia: z.string().min(1, "Abrangência é obrigatória"),
  operadora: z.string().min(1, "Operadora é obrigatória"),

  // Questionário de Saúde
  pergunta1: z.string().min(1, "Por favor, responda esta pergunta"),
  pergunta2: z.string().min(1, "Por favor, responda esta pergunta"),
  pergunta3: z.string().min(1, "Por favor, responda esta pergunta"),
  pergunta4: z.string().min(1, "Por favor, responda esta pergunta"),
  pergunta5: z.string().min(1, "Por favor, responda esta pergunta"),
  observacoes: z.string().optional(),
  assinatura: z
    .boolean()
    .default(false)
    .refine((val) => val === true, {
      message: "Você precisa assinar a proposta para continuar",
    }),
})

type PropostaFormData = z.infer<typeof propostaSchema>

type Dependente = {
  nome: string
  rg: string
  orgaoExpedidor: string
  cpf: string
  cns: string
  ufNascimento: string
  idade: string
  dataNascimento: string
  estadoCivil: string
  nomeMae: string
  nomePai: string
}

type Documentos = {
  rgFrente: File | null
  rgVerso: File | null
  comprovanteResidencia: File | null
  cns: File | null
}

export default function PropostaPage() {
  const router = useRouter()
  const [dependentes, setDependentes] = useState<Dependente[]>([])
  const [documentos, setDocumentos] = useState<Documentos>({
    rgFrente: null,
    rgVerso: null,
    comprovanteResidencia: null,
    cns: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PropostaFormData>({
    resolver: zodResolver(propostaSchema),
    defaultValues: {
      pergunta1: "",
      pergunta2: "",
      pergunta3: "",
      pergunta4: "",
      pergunta5: "",
      assinatura: false,
      sexo: "",
      estadoCivil: "",
      // ... outros campos ...
    },
  })

  const adicionarDependente = () => {
    setDependentes([
      ...dependentes,
      {
        nome: "",
        rg: "",
        orgaoExpedidor: "",
        cpf: "",
        cns: "",
        ufNascimento: "",
        idade: "",
        dataNascimento: "",
        estadoCivil: "",
        nomeMae: "",
        nomePai: "",
      },
    ])
  }

  const removerDependente = (index: number) => {
    const novosDependentes = dependentes.filter((_, i) => i !== index)
    setDependentes(novosDependentes)
  }

  const onSubmit = async (data: PropostaFormData) => {
    try {
      setIsSubmitting(true)

      // Validar campos obrigatórios
      if (!data.nome || !data.cpf || !data.email || !data.whatsapp || !data.endereco || !data.dataNascimento) {
        toast({
          title: "Erro",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        })
        return
      }

      // Validar CPF
      if (!validarCPF(data.cpf)) {
        toast({
          title: "Erro",
          description: "CPF inválido.",
          variant: "destructive",
        })
        return
      }

      // Validar documentos obrigatórios
      if (!documentos.rgFrente || !documentos.rgVerso || !documentos.comprovanteResidencia) {
        toast({
          title: "Erro",
          description: "Por favor, anexe todos os documentos obrigatórios.",
          variant: "destructive",
        })
        return
      }

      // Upload dos documentos
      const documentosUrls: Record<string, string> = {}

      try {
        for (const [key, file] of Object.entries(documentos)) {
          if (file) {
            try {
              const path = `${data.cpf}/${key}_${Date.now()}`
              const url = await uploadFile(file, "documentos_propostas", path)
              if (!url) {
                throw new Error(`Erro ao fazer upload do documento ${key}`)
              }
              documentosUrls[key] = url
            } catch (uploadError) {
              console.error(`Erro no upload do documento ${key}:`, uploadError)
              toast({
                title: "Erro",
                description:
                  uploadError instanceof Error
                    ? uploadError.message
                    : `Erro ao fazer upload do documento ${key}. Tente novamente.`,
                variant: "destructive",
              })
              return
            }
          }
        }
      } catch (error) {
        console.error("Erro no upload dos documentos:", error)
        toast({
          title: "Erro",
          description: error instanceof Error ? error.message : "Erro ao fazer upload dos documentos. Tente novamente.",
          variant: "destructive",
        })
        return
      }

      // Salvar proposta principal
      const propostaData = {
        ...data,
        data_nascimento: new Date(data.dataNascimento).toISOString(),
        idade: Number.parseInt(data.idade) || 0,
        valor: Number.parseFloat(data.valor) || 0,
      }

      const proposta = await saveProposta(propostaData)
      if (!proposta || !proposta.id) {
        throw new Error("Erro ao salvar a proposta")
      }

      // Salvar documentos
      for (const [tipo, url] of Object.entries(documentosUrls)) {
        const documento = await saveDocumento({
          proposta_id: proposta.id,
          tipo,
          arquivo_url: url,
          arquivo_nome: documentos[tipo as keyof Documentos]?.name || "",
        })
        if (!documento) {
          throw new Error(`Erro ao salvar o documento ${tipo}`)
        }
      }

      // Salvar dependentes
      for (const dep of dependentes) {
        if (!dep.nome || !dep.cpf || !dep.dataNascimento || !dep.estadoCivil) {
          toast({
            title: "Erro",
            description: "Por favor, preencha todos os campos dos dependentes.",
            variant: "destructive",
          })
          return
        }

        const dependente = await saveDependente({
          ...dep,
          proposta_id: proposta.id,
          data_nascimento: new Date(dep.dataNascimento).toISOString(),
          idade: Number.parseInt(dep.idade) || 0,
        })
        if (!dependente) {
          throw new Error("Erro ao salvar dependente")
        }
      }

      // Salvar questionário de saúde
      const questionario = await saveQuestionario({
        proposta_id: proposta.id,
        pergunta1: data.pergunta1,
        pergunta2: data.pergunta2,
        pergunta3: data.pergunta3,
        pergunta4: data.pergunta4,
        pergunta5: data.pergunta5,
        observacoes: data.observacoes,
        assinatura: data.assinatura,
      })
      if (!questionario) {
        throw new Error("Erro ao salvar questionário")
      }

      toast({
        title: "Proposta enviada com sucesso!",
        description: "Entraremos em contato em breve.",
      })

      // Redirecionar para página de agradecimento
      router.push("/obrigado")
    } catch (error) {
      console.error("Erro ao enviar proposta:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao enviar a proposta. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatWhatsApp = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d)(\d{4})$/, "$1-$2")
      .slice(0, 15)
  }

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .slice(0, 9)
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-4 md:py-8 bg-gray-50 min-h-screen">
        <Card className="shadow-sm">
          <CardHeader className="space-y-2 md:space-y-4">
            <CardTitle className="text-xl md:text-2xl font-bold">Proposta de Plano de Saúde</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Preencha todos os dados necessários para enviar sua proposta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
              {/* Dados do Titular */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Dados do Titular</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input id="nome" {...register("nome")} required />
                    {errors.nome && <span className="text-red-500 text-sm">{errors.nome.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input id="email" type="email" {...register("email")} required />
                    {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      {...register("whatsapp")}
                      onChange={(e) => {
                        e.target.value = formatWhatsApp(e.target.value)
                        register("whatsapp").onChange(e)
                      }}
                      placeholder="(00) 00000-0000"
                      required
                    />
                    {errors.whatsapp && (
                      <span className="text-red-500 text-sm">{errors.whatsapp.message as string}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sexo">Sexo</Label>
                    <Select value={watch("sexo")} onValueChange={(value) => setValue("sexo", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o sexo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="O">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.sexo && <span className="text-red-500 text-sm">{errors.sexo.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço *</Label>
                    <Input id="endereco" {...register("endereco")} required />
                    {errors.endereco && (
                      <span className="text-red-500 text-sm">{errors.endereco.message as string}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" {...register("complemento")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      {...register("cep")}
                      onChange={(e) => {
                        e.target.value = formatCEP(e.target.value)
                        register("cep").onChange(e)
                      }}
                      placeholder="00000-000"
                    />
                    {errors.cep && <span className="text-red-500 text-sm">{errors.cep.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" {...register("bairro")} />
                    {errors.bairro && <span className="text-red-500 text-sm">{errors.bairro.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" {...register("cidade")} />
                    {errors.cidade && <span className="text-red-500 text-sm">{errors.cidade.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Input id="estado" maxLength={2} {...register("estado")} />
                    {errors.estado && <span className="text-red-500 text-sm">{errors.estado.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input id="rg" {...register("rg")} />
                    {errors.rg && <span className="text-red-500 text-sm">{errors.rg.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orgaoExpedidor">Órgão Expedidor</Label>
                    <Input id="orgaoExpedidor" {...register("orgaoExpedidor")} />
                    {errors.orgaoExpedidor && (
                      <span className="text-red-500 text-sm">{errors.orgaoExpedidor.message as string}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input id="cpf" {...register("cpf")} required />
                    {errors.cpf && <span className="text-red-500 text-sm">{errors.cpf.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cns">CNS</Label>
                    <Input id="cns" {...register("cns")} />
                    {errors.cns && <span className="text-red-500 text-sm">{errors.cns.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ufNascimento">UF de Nascimento</Label>
                    <Input id="ufNascimento" maxLength={2} {...register("ufNascimento")} />
                    {errors.ufNascimento && (
                      <span className="text-red-500 text-sm">{errors.ufNascimento.message as string}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                    <Input id="dataNascimento" type="date" {...register("dataNascimento")} required />
                    {errors.dataNascimento && (
                      <span className="text-red-500 text-sm">{errors.dataNascimento.message as string}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idade">Idade</Label>
                    <Input id="idade" {...register("idade")} />
                    {errors.idade && <span className="text-red-500 text-sm">{errors.idade.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estadoCivil">Estado Civil</Label>
                    <Select value={watch("estadoCivil")} onValueChange={(value) => setValue("estadoCivil", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado civil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="casado">Casado(a)</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.estadoCivil && <span className="text-red-500 text-sm">{errors.estadoCivil.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomeMae">Nome da Mãe</Label>
                    <Input id="nomeMae" {...register("nomeMae")} />
                    {errors.nomeMae && <span className="text-red-500 text-sm">{errors.nomeMae.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomePai">Nome do Pai</Label>
                    <Input id="nomePai" {...register("nomePai")} />
                    {errors.nomePai && <span className="text-red-500 text-sm">{errors.nomePai.message as string}</span>}
                  </div>
                </div>
              </div>

              <Separator className="my-4 md:my-6" />

              {/* Documentos */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Documentos do Titular</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rgFrente">RG (Frente)</Label>
                    <div className="relative">
                      <Input
                        id="rgFrente"
                        type="file"
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        onChange={(e) => setDocumentos({ ...documentos, rgFrente: e.target.files?.[0] || null })}
                      />
                      <div className="border rounded-md p-4 flex items-center justify-center gap-2 bg-gray-50">
                        <FileUp className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {documentos.rgFrente ? documentos.rgFrente.name : "Anexar RG (Frente)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rgVerso">RG (Verso)</Label>
                    <div className="relative">
                      <Input
                        id="rgVerso"
                        type="file"
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        onChange={(e) => setDocumentos({ ...documentos, rgVerso: e.target.files?.[0] || null })}
                      />
                      <div className="border rounded-md p-4 flex items-center justify-center gap-2 bg-gray-50">
                        <FileUp className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {documentos.rgVerso ? documentos.rgVerso.name : "Anexar RG (Verso)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comprovanteResidencia">Comprovante de Residência</Label>
                    <div className="relative">
                      <Input
                        id="comprovanteResidencia"
                        type="file"
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        onChange={(e) =>
                          setDocumentos({ ...documentos, comprovanteResidencia: e.target.files?.[0] || null })
                        }
                      />
                      <div className="border rounded-md p-4 flex items-center justify-center gap-2 bg-gray-50">
                        <FileUp className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {documentos.comprovanteResidencia
                            ? documentos.comprovanteResidencia.name
                            : "Anexar Comprovante"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnsPdf">CNS</Label>
                    <div className="relative">
                      <Input
                        id="cnsPdf"
                        type="file"
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        onChange={(e) => setDocumentos({ ...documentos, cns: e.target.files?.[0] || null })}
                      />
                      <div className="border rounded-md p-4 flex items-center justify-center gap-2 bg-gray-50">
                        <FileUp className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-500">
                          {documentos.cns ? documentos.cns.name : "Anexar CNS"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-4 md:my-6" />

              {/* Dependentes */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 md:mb-4">
                  <h3 className="text-base md:text-lg font-semibold">Dependentes</h3>
                  <Button type="button" variant="outline" onClick={adicionarDependente} className="w-full sm:w-auto">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Adicionar Dependente
                  </Button>
                </div>

                {dependentes.map((dependente, index) => (
                  <div key={index} className="border rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 md:mb-4">
                      <h4 className="text-sm md:text-base font-medium">Dependente {index + 1}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removerDependente(index)}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Remover</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input
                          value={dependente.nome}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].nome = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>RG</Label>
                        <Input
                          value={dependente.rg}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].rg = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Órgão Expedidor</Label>
                        <Input
                          value={dependente.orgaoExpedidor}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].orgaoExpedidor = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>CPF</Label>
                        <Input
                          value={dependente.cpf}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].cpf = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>CNS</Label>
                        <Input
                          value={dependente.cns}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].cns = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>UF de Nascimento</Label>
                        <Input
                          value={dependente.ufNascimento}
                          maxLength={2}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].ufNascimento = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Data de Nascimento</Label>
                        <Input
                          type="date"
                          value={dependente.dataNascimento}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].dataNascimento = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Idade</Label>
                        <Input
                          value={dependente.idade}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].idade = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Estado Civil</Label>
                        <Select
                          value={dependente.estadoCivil}
                          onValueChange={(value) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].estadoCivil = value
                            setDependentes(novosDependentes)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                            <SelectItem value="casado">Casado(a)</SelectItem>
                            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome da Mãe</Label>
                        <Input
                          value={dependente.nomeMae}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].nomeMae = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Nome do Pai</Label>
                        <Input
                          value={dependente.nomePai}
                          onChange={(e) => {
                            const novosDependentes = [...dependentes]
                            novosDependentes[index].nomePai = e.target.value
                            setDependentes(novosDependentes)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4 md:my-6" />

              {/* Dados do Plano */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Dados do Plano</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="operadora">Operadora</Label>
                    <Input id="operadora" {...register("operadora")} placeholder="Nome da operadora" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plano">Plano</Label>
                    <Input id="plano" {...register("plano")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor</Label>
                    <Input id="valor" {...register("valor")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="abrangencia">Abrangência</Label>
                    <Input id="abrangencia" {...register("abrangencia")} />
                  </div>
                </div>
              </div>

              <Separator className="my-4 md:my-6" />

              {/* Questionário de Saúde */}
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Questionário de Saúde</h3>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label>Você possui ou já possuiu alguma doença crônica (diabetes, hipertensão, etc.)?</Label>
                      <RadioGroup
                        value={watch("pergunta1")}
                        onValueChange={(value) => setValue("pergunta1", value)}
                        className="flex items-center space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="pergunta1-sim" />
                          <Label htmlFor="pergunta1-sim">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="pergunta1-nao" />
                          <Label htmlFor="pergunta1-nao">Não</Label>
                        </div>
                      </RadioGroup>
                      {errors.pergunta1 && <span className="text-red-500 text-sm">{errors.pergunta1.message}</span>}
                    </div>

                    <div className="space-y-3">
                      <Label>Realizou alguma cirurgia nos últimos 12 meses?</Label>
                      <RadioGroup
                        value={watch("pergunta2")}
                        onValueChange={(value) => setValue("pergunta2", value)}
                        className="flex items-center space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="pergunta2-sim" />
                          <Label htmlFor="pergunta2-sim">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="pergunta2-nao" />
                          <Label htmlFor="pergunta2-nao">Não</Label>
                        </div>
                      </RadioGroup>
                      {errors.pergunta2 && <span className="text-red-500 text-sm">{errors.pergunta2.message}</span>}
                    </div>

                    <div className="space-y-3">
                      <Label>Está em tratamento médico atualmente?</Label>
                      <RadioGroup
                        value={watch("pergunta3")}
                        onValueChange={(value) => setValue("pergunta3", value)}
                        className="flex items-center space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="pergunta3-sim" />
                          <Label htmlFor="pergunta3-sim">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="pergunta3-nao" />
                          <Label htmlFor="pergunta3-nao">Não</Label>
                        </div>
                      </RadioGroup>
                      {errors.pergunta3 && <span className="text-red-500 text-sm">{errors.pergunta3.message}</span>}
                    </div>

                    <div className="space-y-3">
                      <Label>Faz uso contínuo de algum medicamento?</Label>
                      <RadioGroup
                        value={watch("pergunta4")}
                        onValueChange={(value) => setValue("pergunta4", value)}
                        className="flex items-center space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="pergunta4-sim" />
                          <Label htmlFor="pergunta4-sim">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="pergunta4-nao" />
                          <Label htmlFor="pergunta4-nao">Não</Label>
                        </div>
                      </RadioGroup>
                      {errors.pergunta4 && <span className="text-red-500 text-sm">{errors.pergunta4.message}</span>}
                    </div>

                    <div className="space-y-3">
                      <Label>Possui alguma deficiência física ou mental?</Label>
                      <RadioGroup
                        value={watch("pergunta5")}
                        onValueChange={(value) => setValue("pergunta5", value)}
                        className="flex items-center space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="sim" id="pergunta5-sim" />
                          <Label htmlFor="pergunta5-sim">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nao" id="pergunta5-nao" />
                          <Label htmlFor="pergunta5-nao">Não</Label>
                        </div>
                      </RadioGroup>
                      {errors.pergunta5 && <span className="text-red-500 text-sm">{errors.pergunta5.message}</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações (caso tenha respondido sim para alguma pergunta)</Label>
                    <Textarea
                      id="observacoes"
                      {...register("observacoes")}
                      placeholder="Descreva detalhes sobre as respostas positivas..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 mb-4">
                        Declaro que as informações prestadas neste formulário são verdadeiras e estou ciente de que
                        qualquer omissão ou inexatidão poderá resultar na perda do direito às coberturas do plano de
                        saúde.
                      </p>
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="assinatura"
                          checked={watch("assinatura")}
                          onCheckedChange={(checked) => setValue("assinatura", checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor="assinatura" className="font-medium">
                            Li e concordo com a declaração acima
                          </Label>
                        </div>
                      </div>
                      {errors.assinatura && (
                        <span className="text-red-500 text-sm block mt-2">{errors.assinatura.message}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  type="submit"
                  className="w-full sm:w-auto bg-[#0F172A] hover:bg-[#1E293B]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Proposta"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  )
}
