import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentTenantId } from "@/lib/tenant-query-helper"
import { validarCPF } from "@/utils/validacoes"
import { FinanceirasService } from "@/services/financeiras-service"
import AsaasServiceInstance from "@/services/asaas-service"
import type { AsaasCustomer, AsaasCharge } from "@/services/asaas-service"
import { FaturasService } from "@/services/faturas-service"

export const maxDuration = 30

/**
 * POST /api/administradora/fatura/gerar-boleto
 * Body: { administradora_id, financeira_id, cliente_administradora_id, valor, vencimento, descricao }
 * Gera boleto usando a API da empresa financeira (Asaas) selecionada.
 */
export async function POST(request: NextRequest) {
  const log = (msg: string, data?: unknown) => {
    if (data !== undefined) console.log(`[gerar-boleto] ${msg}`, data)
    else console.log(`[gerar-boleto] ${msg}`)
  }
  try {
    const body = await request.json()
    log("Body recebido (sem dados sensíveis)", {
      administradora_id: body.administradora_id,
      financeira_id: body.financeira_id,
      cliente_administradora_id: body.cliente_administradora_id ? `${String(body.cliente_administradora_id).slice(0, 20)}...` : null,
      valor: body.valor,
      vencimento: body.vencimento,
      tem_descricao: !!body.descricao,
    })

    const {
      administradora_id,
      financeira_id,
      cliente_administradora_id,
      valor,
      vencimento,
      descricao,
      cliente_nome: bodyClienteNome,
      cliente_email: bodyClienteEmail,
      cliente_telefone: bodyClienteTelefone,
      dia_vencimento: bodyDiaVencimento,
      taxa_administracao: bodyTaxaAdministracao,
    } = body

    if (
      !administradora_id ||
      !financeira_id ||
      !cliente_administradora_id ||
      valor == null ||
      !vencimento
    ) {
      return NextResponse.json(
        { error: "administradora_id, financeira_id, cliente_administradora_id, valor e vencimento são obrigatórios" },
        { status: 400 }
      )
    }

    const tenantId = await getCurrentTenantId()
    const valorNum = Number(valor)
    if (isNaN(valorNum) || valorNum <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
    }
    const vencimentoIso = String(vencimento).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimentoIso)) {
      return NextResponse.json({ error: "Vencimento inválido. Use o formato YYYY-MM-DD." }, { status: 400 })
    }

    // Taxa de administração: usar valor do body (modal) se informado; senão usar config da administradora
    let taxaAdministracao = 0
    if (bodyTaxaAdministracao != null && bodyTaxaAdministracao !== "" && !Number.isNaN(Number(bodyTaxaAdministracao))) {
      taxaAdministracao = Number(bodyTaxaAdministracao)
    } else {
      const { data: configFinanceira } = await supabaseAdmin
        .from("administradoras_config_financeira")
        .select("taxa_administracao, configuracoes_adicionais")
        .eq("administradora_id", administradora_id)
        .maybeSingle()
      if (configFinanceira) {
        const cfg = configFinanceira as Record<string, unknown>
        taxaAdministracao = Number(cfg.taxa_administracao ?? 0) || 0
        if (taxaAdministracao === 0 && cfg.configuracoes_adicionais && typeof cfg.configuracoes_adicionais === "object") {
          const add = (cfg.configuracoes_adicionais as Record<string, unknown>).taxa_administracao
          taxaAdministracao = Number(add ?? 0) || 0
        }
      }
    }
    let valorTotalBoleto = valorNum + taxaAdministracao
    log("Valor boleto", { valor_base: valorNum, taxa_administracao: taxaAdministracao, valor_total: valorTotalBoleto })

    // Carregar financeira (deve ser da mesma administradora)
    log("Carregando financeira", { financeira_id, administradora_id })
    const financeira = await FinanceirasService.buscarPorId(financeira_id, administradora_id)
    if (!financeira) {
      log("Financeira não encontrada")
      return NextResponse.json({ error: "Financeira não encontrada" }, { status: 404 })
    }
    log("Financeira carregada", {
      id: financeira.id,
      nome: financeira.nome,
      instituicao: financeira.instituicao_financeira,
      ambiente: financeira.ambiente,
      api_key_preenchida: !!financeira.api_key,
      api_key_tamanho: financeira.api_key?.length ?? 0,
    })
    if (financeira.instituicao_financeira?.toLowerCase() !== "asaas") {
      return NextResponse.json(
        { error: "Apenas integração com Asaas está disponível no momento" },
        { status: 400 }
      )
    }
    if (!financeira.api_key) {
      log("API Key da financeira está vazia")
      return NextResponse.json(
        { error: "A financeira selecionada não possui API Key configurada" },
        { status: 400 }
      )
    }

    let clienteAdm: { id: string; administradora_id: string; proposta_id: string | null } | null = null
    let nome = ""
    let cpf = ""
    let email = ""
    let telefone = ""
    let idParaFatura = cliente_administradora_id
    let produtoNome: string | null = null
    let dependentesNomes: string[] = []

    if (String(cliente_administradora_id).startsWith("vida:")) {
      const vidaId = String(cliente_administradora_id).replace(/^vida:/, "")
      const { data: vida, error: errVida } = await supabaseAdmin
        .from("vidas_importadas")
        .select("id, nome, cpf, valor_mensal, emails, dados_adicionais, cliente_administradora_id, grupo_id, produto_id")
        .eq("id", vidaId)
        .eq("administradora_id", administradora_id)
        .eq("tenant_id", tenantId)
        .maybeSingle()

      if (errVida || !vida) {
        return NextResponse.json({ error: "Beneficiário (vida importada) não encontrado" }, { status: 404 })
      }

      const vidaAny = vida as Record<string, unknown>
      nome = (vidaAny.nome as string) || "Beneficiário"
      cpf = vidaAny.cpf ? String(vidaAny.cpf).replace(/\D/g, "") : ""
      if (!cpf || cpf.length !== 11) {
        const adic = vidaAny.dados_adicionais
        if (adic && typeof adic === "object") {
          const rec = adic as Record<string, unknown>
          const cpfAdic = rec["CPF"] ?? rec.Cpf ?? rec.cpf
          if (cpfAdic != null) cpf = String(cpfAdic).replace(/\D/g, "")
        }
      }
      const grupoIdVida = vidaAny.grupo_id as string | undefined
      const produtoIdVida = vidaAny.produto_id as string | undefined
      const dataVigenciaVida = (() => {
        const adic = vidaAny.dados_adicionais
        if (!adic || typeof adic !== "object") return null
        const rec = adic as Record<string, unknown>
        const vigRaw = rec["data_vigencia"] ?? rec["Data Vigência"] ?? rec["dataVigencia"]
        const vig = String(vigRaw || "").slice(0, 10)
        return /^\d{4}-\d{2}-\d{2}$/.test(vig) ? vig : null
      })()
      const diaVencimentoVida = (() => {
        const diaBody = String(bodyDiaVencimento || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
        if (diaBody === "01" || diaBody === "10") return Number(diaBody)
        const adic = vidaAny.dados_adicionais
        if (!adic || typeof adic !== "object") return null
        const rec = adic as Record<string, unknown>
        const diaRaw = rec["dia_vencimento"] ?? rec["Dia Vencimento"] ?? rec["diaVencimento"]
        const dia = String(diaRaw || "").replace(/\D/g, "").padStart(2, "0").slice(-2)
        return dia === "01" || dia === "10" ? Number(dia) : null
      })()
      if (produtoIdVida) {
        const { data: prod } = await supabaseAdmin
          .from("produtos_contrato_administradora")
          .select("nome")
          .eq("id", produtoIdVida)
          .maybeSingle()
        if (prod && (prod as any).nome) produtoNome = (prod as any).nome
      }
      let valorBaseVida = Number(vidaAny.valor_mensal) || 0
      if (grupoIdVida && cpf) {
        const { data: deps } = await supabaseAdmin
          .from("vidas_importadas")
          .select("nome, valor_mensal")
          .eq("grupo_id", grupoIdVida)
          .eq("administradora_id", administradora_id)
          .eq("tenant_id", tenantId)
          .eq("tipo", "dependente")
          .eq("cpf_titular", cpf)
        if (deps && Array.isArray(deps)) {
          dependentesNomes = deps.map((d: any) => d.nome || "").filter(Boolean)
          for (const d of deps) valorBaseVida += Number((d as any).valor_mensal) || 0
        }
        if (valorBaseVida > 0) valorTotalBoleto = valorBaseVida + taxaAdministracao
      }
      const emls = vidaAny.emails
      if (Array.isArray(emls) && emls[0]) email = String(emls[0])
      else {
        const adic = vidaAny.dados_adicionais
        if (adic && typeof adic === "object") {
          const rec = adic as Record<string, unknown>
          const e = rec["E-mail"] ?? rec.E_mail ?? rec.Email ?? rec.email
          if (e != null) email = String(e)
        }
      }

      const caIdExistente = vidaAny.cliente_administradora_id
      if (caIdExistente) {
        const { data: ca } = await supabaseAdmin
          .from("clientes_administradoras")
          .select("id, administradora_id, proposta_id")
          .eq("id", caIdExistente)
          .eq("tenant_id", tenantId)
          .maybeSingle()
        if (ca) {
          clienteAdm = ca as { id: string; administradora_id: string; proposta_id: string | null }
          idParaFatura = ca.id
          const syncPayload: Record<string, unknown> = {
            valor_mensal: Number(vidaAny.valor_mensal) || valorNum,
          }
          if (diaVencimentoVida) syncPayload.dia_vencimento = diaVencimentoVida
          if (dataVigenciaVida) syncPayload.data_vigencia = dataVigenciaVida
          await supabaseAdmin
            .from("clientes_administradoras")
            .update(syncPayload)
            .eq("id", ca.id)
            .eq("tenant_id", tenantId)
        }
      }

      if (!clienteAdm) {
        const dataVig = new Date()
        const dataVen = new Date(vencimentoIso)
        const payloadCa: Record<string, unknown> = {
          administradora_id,
          tenant_id: tenantId,
          numero_contrato: `IMP-${vidaId.slice(0, 8)}`,
          data_vencimento: dataVen.toISOString().slice(0, 10),
          dia_vencimento: diaVencimentoVida ?? Number(vencimentoIso.slice(8, 10)),
          data_vigencia: dataVigenciaVida ?? dataVig.toISOString().slice(0, 10),
          valor_mensal: Number(vidaAny.valor_mensal) || valorNum,
          status: "ativo",
        }
        const { data: novoCa, error: errInsert } = await supabaseAdmin
          .from("clientes_administradoras")
          .insert(payloadCa)
          .select("id, administradora_id, proposta_id")
          .single()

        if (errInsert || !novoCa) {
          console.error("Erro ao criar cliente_administradora para vida:", errInsert)
          return NextResponse.json(
            { error: "Não foi possível vincular o beneficiário para fatura. Execute o script adicionar-coluna-cliente-administradora-vidas-importadas.sql e torne proposta_id opcional em clientes_administradoras se necessário." },
            { status: 500 }
          )
        }
        clienteAdm = novoCa as { id: string; administradora_id: string; proposta_id: string | null }
        idParaFatura = novoCa.id
        await supabaseAdmin
          .from("vidas_importadas")
          .update({ cliente_administradora_id: novoCa.id })
          .eq("id", vidaId)
          .eq("tenant_id", tenantId)
      }
    } else {
      const { data: ca, error: errCliente } = await supabaseAdmin
        .from("clientes_administradoras")
        .select("id, administradora_id, proposta_id")
        .eq("id", cliente_administradora_id)
        .eq("administradora_id", administradora_id)
        .eq("tenant_id", tenantId)
        .single()

      if (errCliente || !ca) {
        return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
      }
      clienteAdm = ca as { id: string; administradora_id: string; proposta_id: string | null }
      idParaFatura = cliente_administradora_id

      if (clienteAdm.proposta_id) {
        const { data: proposta } = await supabaseAdmin
          .from("propostas")
          .select("nome, cpf, email, telefone")
          .eq("id", clienteAdm.proposta_id)
          .eq("tenant_id", tenantId)
          .single()
        if (proposta) {
          nome = (proposta as any).nome || ""
          cpf = ((proposta as any).cpf || "").replace(/\D/g, "")
          email = (proposta as any).email || ""
          telefone = (proposta as any).telefone || ""
        }
      }
      if (!nome) {
        const { data: caNum } = await supabaseAdmin
          .from("clientes_administradoras")
          .select("numero_contrato")
          .eq("id", cliente_administradora_id)
          .single()
        nome = (caNum as any)?.numero_contrato ? `Cliente ${(caNum as any).numero_contrato}` : "Cliente"
      }
      // Cliente pode ser de vida importada (sem proposta_id): buscar CPF/nome/email na vida
      if (!cpf || cpf.length !== 11) {
        const { data: vidaVinculada } = await supabaseAdmin
          .from("vidas_importadas")
          .select("id, nome, cpf, emails, dados_adicionais")
          .eq("cliente_administradora_id", cliente_administradora_id)
          .eq("administradora_id", administradora_id)
          .eq("tenant_id", tenantId)
          .maybeSingle()
        if (vidaVinculada) {
          const v = vidaVinculada as Record<string, unknown>
          if (!nome || nome.startsWith("Cliente ")) nome = (v.nome as string) || nome
          let cpfVida = v.cpf ? String(v.cpf).replace(/\D/g, "") : ""
          if (!cpfVida || cpfVida.length !== 11) {
            const adic = v.dados_adicionais
            if (adic && typeof adic === "object") {
              const rec = adic as Record<string, unknown>
              const cpfAdic = rec["CPF"] ?? rec.Cpf ?? rec.cpf
              if (cpfAdic != null) cpfVida = String(cpfAdic).replace(/\D/g, "")
            }
          }
          if (cpfVida && cpfVida.length === 11) cpf = cpfVida
          if (!email && (v.emails as string[])?.[0]) email = String((v.emails as string[])[0])
          else if (!email && v.dados_adicionais && typeof v.dados_adicionais === "object") {
            const rec = v.dados_adicionais as Record<string, unknown>
            const e = rec["E-mail"] ?? rec.E_mail ?? rec.Email ?? rec.email
            if (e != null) email = String(e)
          }
        }
      }
    }

    // Usar nome/email/telefone enviados pelo modal (titular) quando fornecidos — assim cliente_nome na fatura fica igual ao exibido
    if (bodyClienteNome != null && String(bodyClienteNome).trim() !== "") nome = String(bodyClienteNome).trim()
    if (bodyClienteEmail != null && bodyClienteEmail !== "") email = String(bodyClienteEmail)
    if (bodyClienteTelefone != null && bodyClienteTelefone !== "") telefone = String(bodyClienteTelefone)

    // Configurar Asaas com a API key da financeira
    log("Configurando Asaas", { ambiente: financeira.ambiente || "producao" })
    // Regra mensal: um cliente só pode ter uma fatura por mês.
    const [ano, mes] = vencimentoIso.split("-").map(Number)
    const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`
    const fimMes = `${ano}-${String(mes).padStart(2, "0")}-${String(new Date(ano, mes, 0).getDate()).padStart(2, "0")}`
    const { data: faturaMesExistente } = await supabaseAdmin
      .from("faturas")
      .select("id, numero_fatura, status, vencimento")
      .eq("cliente_administradora_id", idParaFatura)
      .eq("administradora_id", administradora_id)
      .eq("tenant_id", tenantId)
      .gte("vencimento", inicioMes)
      .lte("vencimento", fimMes)
      .order("vencimento", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (faturaMesExistente) {
      return NextResponse.json(
        {
          error:
            `Este cliente já possui boleto/fatura para ${String(mes).padStart(2, "0")}/${ano}. ` +
            `Exclua o boleto atual para gerar novamente no mesmo mês.`,
          fatura_existente_id: faturaMesExistente.id,
          fatura_existente_numero: faturaMesExistente.numero_fatura,
        },
        { status: 409 }
      )
    }

    AsaasServiceInstance.setApiKey(financeira.api_key, financeira.ambiente || "producao")

    // Verificar se já existe asaas_customer_id no cliente
    const { data: caCompleto } = await supabaseAdmin
      .from("clientes_administradoras")
      .select("asaas_customer_id")
      .eq("id", idParaFatura)
      .single()

    let customerId = (caCompleto as any)?.asaas_customer_id
    log("Cliente para fatura", { idParaFatura, nome, tem_cpf: !!cpf, tem_email: !!email, asaas_customer_id_existente: customerId ?? null })
    if (!customerId) {
      const cpfApenasDigitos = (cpf || "").replace(/\D/g, "")
      if (cpfApenasDigitos.length !== 11) {
        return NextResponse.json(
          {
            error:
              "O Asaas exige CPF válido (11 dígitos). Informe o CPF do beneficiário no cadastro (vida importada ou proposta) e tente novamente.",
          },
          { status: 400 }
        )
      }
      if (!validarCPF(cpfApenasDigitos)) {
        return NextResponse.json(
          {
            error:
              "O CPF do beneficiário é inválido (dígitos verificadores incorretos). Corrija o CPF no cadastro do beneficiário e tente novamente.",
          },
          { status: 400 }
        )
      }
      log("Criando cliente no Asaas (createCustomer)")
      const cpfParaAsaas = String(cpfApenasDigitos).replace(/\D/g, "").slice(0, 11)
      const asaasCustomer: AsaasCustomer = {
        name: nome || "Cliente",
        cpfCnpj: cpfParaAsaas,
        email: email || undefined,
        externalReference: idParaFatura,
      }
      const customer = await AsaasServiceInstance.createCustomer(asaasCustomer)
      customerId = customer.id
      log("Cliente Asaas criado", { customerId })
      await supabaseAdmin
        .from("clientes_administradoras")
        .update({ asaas_customer_id: customerId })
        .eq("id", idParaFatura)
        .eq("tenant_id", tenantId)
    }

    // Descrição: produto, titular, dependentes e taxa de administração
    let descricaoBoleto = descricao?.trim()
    if (!descricaoBoleto) {
      const partes: string[] = []
      if (produtoNome) partes.push(`Produto: ${produtoNome}`)
      partes.push(`Titular: ${nome || "Cliente"}`)
      if (dependentesNomes.length > 0) partes.push(`Dependentes: ${dependentesNomes.join(", ")}`)
      if (taxaAdministracao > 0) partes.push(`Taxa de administração: R$ ${taxaAdministracao.toFixed(2)}`)
      descricaoBoleto = partes.length > 0 ? partes.join(". ") : `Mensalidade - ${nome || "Cliente"}`
    }

    const charge: AsaasCharge = {
      customer: customerId,
      billingType: "BOLETO",
      value: valorTotalBoleto,
      dueDate: vencimentoIso,
      description: descricaoBoleto,
      externalReference: idParaFatura,
    }
    log("Criando cobrança no Asaas (createCharge)", { customer: customerId, value: valorTotalBoleto, dueDate: charge.dueDate })
    const chargeResponse = await AsaasServiceInstance.createCharge(charge)
    log("Cobrança Asaas criada", { chargeId: chargeResponse.id, bankSlipUrl: !!chargeResponse.bankSlipUrl })

    const fatura = await FaturasService.criar(
      {
        cliente_administradora_id: idParaFatura,
        administradora_id,
        cliente_id: (cpf && cpf.replace(/\D/g, "")) || idParaFatura,
        cliente_nome: nome || "Cliente",
        cliente_email: email || "",
        cliente_telefone: telefone || "",
        proposta_id: clienteAdm?.proposta_id ?? undefined,
        valor_original: valorTotalBoleto,
        data_vencimento: vencimentoIso,
        observacoes: descricaoBoleto || "",
      },
      supabaseAdmin
    )

    const chargeResp = chargeResponse as Record<string, unknown>;
    const chargeIdRaw = chargeResponse.id ? String(chargeResponse.id).trim() : "";
    const chargeIdSlug = chargeIdRaw.replace(/^pay_/, "");
    const baseUrlBoleto = "https://www.asaas.com/b/pdf/";
    const baseUrlInvoice = "https://www.asaas.com/i/";
    const urlBoleto = (chargeResponse.bankSlipUrl && String(chargeResponse.bankSlipUrl).trim()) || (chargeIdSlug ? baseUrlBoleto + chargeIdSlug : "");
    const urlInvoice = (chargeResponse.invoiceUrl && String(chargeResponse.invoiceUrl).trim()) || (chargeIdSlug ? baseUrlInvoice + chargeIdSlug : "") || urlBoleto;
    const urlPayment = (chargeResponse.paymentLink && String(chargeResponse.paymentLink).trim()) || urlInvoice || urlBoleto;

    const updatePayload: Record<string, unknown> = {
      gateway_id: chargeResponse.id,
      gateway_nome: `Asaas - ${String(financeira.nome || "Financeira")}`,
      asaas_charge_id: chargeResponse.id,
      numero_fatura: chargeResponse.invoiceNumber || fatura.numero_fatura,
    };
    if (chargeResp.identificationField != null) updatePayload.boleto_linha_digitavel = String(chargeResp.identificationField);
    if (chargeResp.nossoNumero != null) {
      updatePayload.boleto_codigo_barras = String(chargeResp.nossoNumero);
      updatePayload.boleto_codigo = String(chargeResp.nossoNumero);
    }

    const { error: updateError1 } = await supabaseAdmin
      .from("faturas")
      .update(updatePayload)
      .eq("id", fatura.id);

    if (updateError1) {
      log("AVISO: não foi possível atualizar fatura (gateway_id, numero_fatura)", { code: updateError1.code, message: updateError1.message });
    }

    if (urlBoleto || urlInvoice || urlPayment) {
      const urlPayload: Record<string, string> = {};
      if (urlBoleto) urlPayload.asaas_boleto_url = urlBoleto;
      if (urlInvoice) urlPayload.asaas_invoice_url = urlInvoice;
      if (urlPayment) urlPayload.asaas_payment_link = urlPayment;
      if (urlBoleto) urlPayload.boleto_url = urlBoleto;
      const { error: updateError2 } = await supabaseAdmin
        .from("faturas")
        .update(urlPayload)
        .eq("id", fatura.id);
      if (updateError2) {
        log("AVISO: não foi possível salvar URLs do boleto. Execute no Supabase: scripts/adicionar-colunas-boleto-faturas.sql", { code: updateError2.code, message: updateError2.message });
      }
    }

    return NextResponse.json({
      success: true,
      fatura_id: fatura.id,
      cliente_administradora_id: idParaFatura,
      numero_fatura: updatePayload.numero_fatura ?? fatura.numero_fatura,
      valor: valorTotalBoleto,
      vencimento: vencimentoIso,
      boleto_url: urlBoleto || undefined,
      invoice_url: urlInvoice || undefined,
      payment_link: urlPayment || undefined,
    });
  } catch (e: unknown) {
    console.error("[gerar-boleto] Erro ao gerar boleto:", e)
    const msg = e instanceof Error ? e.message : "Erro ao gerar boleto"
    if (e instanceof Error) {
      console.error("[gerar-boleto] message:", e.message)
      console.error("[gerar-boleto] stack:", e.stack)
    }
    const isCpfAsaas = /cpf|cnpj|inválido|invalid_object/i.test(msg)
    return NextResponse.json(
      {
        error: isCpfAsaas
          ? "O Asaas rejeitou o CPF/CNPJ do beneficiário. Confirme que o CPF no cadastro está correto (11 dígitos, apenas números) e que o CPF é válido. Se o problema continuar, o mesmo CPF pode já estar em uso no Asaas ou a financeira pode ter restrições adicionais."
          : msg,
      },
      { status: isCpfAsaas ? 400 : 500 }
    )
  }
}
