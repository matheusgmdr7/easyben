"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Check, Copy, ExternalLink, Info, Webhook } from "lucide-react"

const WEBHOOK_PATH = "/api/webhooks/asaas"

function normalizarBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "")
}

type Props = {
  /** Nome amigável da financeira (ex.: "Asaas Produção") — só para contexto na UI */
  nomeFinanceira?: string
  className?: string
}

export function FinanceirasWebhookEventosAsaas({ nomeFinanceira, className }: Props) {
  const [baseUrl, setBaseUrl] = useState<string>("")
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const fromEnv = normalizarBaseUrl(process.env.NEXT_PUBLIC_APP_URL || "")
    if (fromEnv) {
      setBaseUrl(fromEnv)
      return
    }
    if (typeof window !== "undefined") {
      setBaseUrl(normalizarBaseUrl(window.location.origin))
    }
  }, [])

  const webhookUrl = useMemo(() => {
    const base = normalizarBaseUrl(baseUrl)
    if (!base) return ""
    return `${base}${WEBHOOK_PATH}`
  }, [baseUrl])

  async function copiar(texto: string, id: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopied(id)
      toast.success("Copiado para a área de transferência")
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.")
    }
  }

  return (
    <Card className={`border-gray-200 shadow-sm ${className ?? ""}`}>
      <CardHeader className="space-y-1 pb-2 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-slate-700" />
          Eventos (webhook Asaas)
        </CardTitle>
        <p className="text-sm text-gray-600 font-normal leading-relaxed">
          Instruções para o Asaas notificar este sistema quando o status de uma cobrança mudar (pago,
          vencido, cancelado, etc.). O endpoint já está implementado; falta apontar o webhook no painel
          Asaas e alinhar o token de segurança.
          {nomeFinanceira ? ` Financeira: ${nomeFinanceira}.` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <Alert className="border-amber-200 bg-amber-50/80 text-amber-950">
          <Info className="h-4 w-4 text-amber-800" />
          <AlertTitle className="text-amber-950">Domínio público</AlertTitle>
          <AlertDescription className="text-sm text-amber-900/90 space-y-2">
            <p>
              O Asaas precisa chamar uma URL <strong>HTTPS acessível na internet</strong> (não use
              localhost). Em produção, configure <code className="text-xs bg-white/80 px-1 rounded">NEXT_PUBLIC_APP_URL</code> no
              servidor com o domínio oficial (ex.: <code className="text-xs bg-white/80 px-1 rounded">https://app.seudominio.com.br</code>) para
              a URL abaixo bater sempre com o deploy correto.
            </p>
            {!process.env.NEXT_PUBLIC_APP_URL && baseUrl && (
              <p className="text-xs">
                Abaixo estamos usando o domínio da <strong>aba atual do navegador</strong>. Se você
                estiver em ambiente de testes, confira se o webhook no Asaas aponta para o mesmo host
                em produção.
              </p>
            )}
          </AlertDescription>
        </Alert>

        <div>
          <p className="text-sm font-medium text-gray-800 mb-2">URL do webhook (método POST)</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-md px-3 py-2.5 break-all text-slate-900">
              {webhookUrl || "Carregando URL…"}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-slate-300"
              disabled={!webhookUrl}
              onClick={() => copiar(webhookUrl, "url")}
            >
              {copied === "url" ? (
                <Check className="h-4 w-4 mr-1.5 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4 mr-1.5" />
              )}
              Copiar
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Passo a passo no painel Asaas</h3>
          <ol className="list-decimal list-inside space-y-2.5 text-sm text-gray-700 leading-relaxed">
            <li>
              Acesse a área de <strong>Integrações / Webhooks</strong> da sua conta Asaas (mesmo
              ambiente desta financeira: sandbox ou produção).
            </li>
            <li>
              Crie um webhook e cole a <strong>URL</strong> copiada acima (deve terminar em{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">{WEBHOOK_PATH}</code>).
            </li>
            <li>
              Ative eventos relacionados a <strong>cobranças / pagamentos</strong> (ex.: criação,
              confirmação de recebimento, vencimento, cancelamento). O sistema lê o objeto de
              pagamento e atualiza o status da fatura local.
            </li>
            <li>
              Defina o <strong>token de autenticação</strong> do webhook no Asaas (um segredo que
              você escolhe) e use <strong>o mesmo valor</strong> em um dos caminhos abaixo.
            </li>
          </ol>
          <a
            href="https://docs.asaas.com/docs/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-3"
          >
            <ExternalLink className="h-4 w-4" />
            Documentação oficial de webhooks Asaas
          </a>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Token de segurança (duas opções válidas)</h3>
          <p className="text-sm text-gray-600 mb-4">
            O endpoint valida o token enviado pelo Asaas (cabeçalhos como{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">asaas-access-token</code>) quando há
            token configurado. Escolha <strong>uma</strong> das estratégias (ou as duas alinhadas ao
            mesmo segredo):
          </p>
          <ul className="space-y-4 text-sm text-gray-700">
            <li className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <p className="font-medium text-slate-900">A) Variável no servidor — ASAAS_WEBHOOK_TOKEN</p>
              <p className="text-gray-600 leading-relaxed">
                Quem faz o deploy define no ambiente (Vercel, Netlify, Docker, etc.) a variável{" "}
                <code className="text-xs bg-slate-100 px-1 rounded">ASAAS_WEBHOOK_TOKEN</code> com o
                <strong> mesmo segredo</strong> cadastrado no webhook do Asaas. Esse valor{" "}
                <strong>não é gerado automaticamente</strong> pelo sistema: crie um segredo forte e
                compartilhe só entre Asaas e o servidor.
              </p>
            </li>
            <li className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <p className="font-medium text-slate-900">B) Campo API Token desta financeira</p>
              <p className="text-gray-600 leading-relaxed">
                Preencha o campo <strong>API Token</strong> deste cadastro com o <strong>mesmo</strong>{" "}
                token configurado no Asaas. O sistema considera tokens de financeiras Asaas{" "}
                <strong>ativas</strong> como alternativa ao <code className="text-xs bg-slate-100 px-1 rounded">ASAAS_WEBHOOK_TOKEN</code>.
                Útil quando cada administradora tem seu próprio webhook/token.
              </p>
            </li>
          </ul>
        </div>

        <Alert className="border-slate-200 bg-slate-50">
          <Info className="h-4 w-4 text-slate-700" />
          <AlertTitle className="text-slate-900">Resumo para a equipe de infraestrutura</AlertTitle>
          <AlertDescription className="text-slate-700">
            <p className="text-sm text-slate-600 mb-3">
              Checklist de variáveis de ambiente no deploy público:
            </p>
            <div className="space-y-2 font-mono text-xs sm:text-sm text-slate-800">
              <p>
                <code className="break-all">NEXT_PUBLIC_APP_URL=https://seu-dominio.com</code>
              </p>
              <p>
                <code className="break-all">ASAAS_WEBHOOK_TOKEN=&lt;mesmo token do painel Asaas&gt;</code>{" "}
                <span className="font-sans text-xs text-slate-600">
                  (opcional se usar apenas o API Token desta financeira)
                </span>
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
