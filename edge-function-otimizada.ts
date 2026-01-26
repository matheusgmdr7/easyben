import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const requestData = await req.json()
    const { to, subject, nome, corretor, link, tipo, cliente, proposta } = requestData

    if (!to || !nome) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios: to, nome" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // CREDENCIAIS OTIMIZADAS
    const API_KEY = "re_hbo9nhsH_Nub8YRaedQWU9dhyw3G8E11W"
    const FROM_EMAIL = "corretor@contratandoplanos.com.br"
    const FROM_NAME = "Contratando Planos"

    let emailHtml = ""
    let emailSubject = ""

    if (tipo === "proposta_completada") {
      // EMAIL PARA CORRETOR - PROPOSTA COMPLETADA
      emailSubject = `🎉 Proposta completada - ${cliente}`
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Proposta Completada</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <!-- HEADER -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 PROPOSTA COMPLETADA!</h1>
                                    <p style="color: #e8f5e8; margin: 10px 0 0 0; font-size: 16px;">Contratando Planos</p>
                                </td>
                            </tr>
                            <!-- CONTENT -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">Olá <strong style="color: #0F172A;">${nome}</strong>,</p>
                                    
                                    <div style="background: #e8f5e8; padding: 25px; border-radius: 8px; border-left: 5px solid #0F172A; margin: 25px 0;">
                                        <h3 style="color: #0F172A; margin: 0 0 15px 0; font-size: 20px;">✅ Excelente notícia!</h3>
                                        <p style="margin: 0; font-size: 16px; color: #333;">O cliente <strong>${cliente}</strong> completou a proposta <strong>${proposta}</strong> com sucesso!</p>
                                    </div>
                                    
                                    <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
                                        <h4 style="color: #0F172A; margin: 0 0 15px 0;">📋 Próximos passos:</h4>
                                        <ul style="margin: 0; padding-left: 20px; color: #333;">
                                            <li style="margin-bottom: 8px;">Acesse seu painel de corretor</li>
                                            <li style="margin-bottom: 8px;">Revise os documentos enviados</li>
                                            <li style="margin-bottom: 8px;">Verifique a declaração de saúde</li>
                                            <li style="margin-bottom: 0;">Processe na seguradora</li>
                                        </ul>
                                    </div>
                                    
                                    <p style="color: #666; font-size: 14px; margin: 30px 0 0 0; text-align: center;">A proposta está pronta para análise. Acesse seu dashboard para continuar.</p>
                                </td>
                            </tr>
                            <!-- FOOTER -->
                            <tr>
                                <td style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                                    <p style="margin: 0; color: #666; font-size: 12px;">© 2024 Contratando Planos - Notificação automática</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
      `
    } else {
      // EMAIL PARA CLIENTE - COMPLETAR PROPOSTA
      emailSubject = `🛡️ ${nome}, complete sua proposta de plano de saúde`
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Complete sua Proposta</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <!-- HEADER -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 50px 30px; text-align: center;">
                                    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 50px; display: inline-block; margin-bottom: 20px;">
                                        <span style="font-size: 48px;">🛡️</span>
                                    </div>
                                    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">CONTRATANDO PLANOS</h1>
                                    <p style="color: #e8f5e8; margin: 10px 0 0 0; font-size: 18px;">Sua proteção, nossa prioridade</p>
                                </td>
                            </tr>
                            <!-- CONTENT -->
                            <tr>
                                <td style="padding: 40px 30px;">
                                    <h2 style="color: #0F172A; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Complete sua proposta em poucos cliques!</h2>
                                    
                                    <p style="font-size: 18px; color: #333; margin: 0 0 25px 0; text-align: center;">Olá <strong style="color: #0F172A;">${nome}</strong>,</p>
                                    
                                    <p style="font-size: 16px; color: #333; margin: 0 0 30px 0; text-align: center;">Seu corretor <strong style="color: #0F172A;">${corretor}</strong> preparou uma proposta especial de plano de saúde para você!</p>
                                    
                                    <!-- STEPS -->
                                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 12px; margin: 30px 0;">
                                        <h3 style="color: #0F172A; margin: 0 0 20px 0; text-align: center; font-size: 20px;">📋 Como funciona:</h3>
                                        <div style="display: flex; flex-direction: column; gap: 15px;">
                                            <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                <div style="background: #0F172A; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">1</div>
                                                <span style="color: #333; font-size: 16px;">Clique no botão abaixo para acessar</span>
                                            </div>
                                            <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                <div style="background: #0F172A; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">2</div>
                                                <span style="color: #333; font-size: 16px;">Preencha a declaração de saúde</span>
                                            </div>
                                            <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                <div style="background: #0F172A; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">3</div>
                                                <span style="color: #333; font-size: 16px;">Assine digitalmente</span>
                                            </div>
                                            <div style="display: flex; align-items: center; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                <div style="background: #0F172A; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">✓</div>
                                                <span style="color: #333; font-size: 16px;">Pronto! Proposta enviada para análise</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- CTA BUTTON -->
                                    <div style="text-align: center; margin: 40px 0;">
                                        <a href="${link}" style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-size: 18px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(22, 137, 121, 0.3); transition: all 0.3s ease;">
                                            ✅ COMPLETAR PROPOSTA AGORA
                                        </a>
                                    </div>
                                    
                                    <!-- LINK BACKUP -->
                                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
                                        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0F172A; text-align: center;">🔗 Link direto:</p>
                                        <p style="margin: 0; word-break: break-all; text-align: center; font-size: 14px;">
                                            <a href="${link}" style="color: #0F172A; text-decoration: none;">${link}</a>
                                        </p>
                                    </div>
                                    
                                    <!-- SECURITY NOTE -->
                                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 25px 0;">
                                        <p style="margin: 0; color: #856404; font-size: 14px; text-align: center;">
                                            <strong>🔒 Segurança:</strong> Este link é pessoal e intransferível. Válido apenas para você.
                                        </p>
                                    </div>
                                    
                                    <p style="color: #666; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
                                        Dúvidas? Entre em contato com seu corretor <strong>${corretor}</strong>
                                    </p>
                                </td>
                            </tr>
                            <!-- FOOTER -->
                            <tr>
                                <td style="background: #0F172A; padding: 30px; text-align: center;">
                                    <p style="margin: 0 0 10px 0; color: white; font-size: 16px; font-weight: bold;">CONTRATANDO PLANOS</p>
                                    <p style="margin: 0; color: #e8f5e8; font-size: 12px;">© 2024 - Especialistas em Planos de Saúde</p>
                                    <p style="margin: 5px 0 0 0; color: #e8f5e8; font-size: 12px;">Este é um email automático, não responda.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
      `
    }

    // ENVIO OTIMIZADO - SEM LOGS DESNECESSÁRIOS
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: emailSubject,
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(JSON.stringify({ error: "Erro ao enviar", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const result = await response.json()

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email enviado com sucesso!",
        id: result.id,
        to: to,
        subject: emailSubject,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
