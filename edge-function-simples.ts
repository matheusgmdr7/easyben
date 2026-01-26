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
    console.log("📧 Iniciando envio de email...")

    const requestData = await req.json()
    console.log("📝 Dados recebidos:", requestData)

    const { to, subject, nome, corretor, link } = requestData

    if (!to || !nome) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios: to, nome" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // SUAS CREDENCIAIS - COPIE EXATAMENTE ASSIM
    const API_KEY = "re_hbo9nhsH_Nub8YRaedQWU9dhyw3G8E11W"
    const FROM_EMAIL = "corretor@contratandoplanos.com.br"

    console.log("🔑 Usando API Key:", API_KEY.substring(0, 10) + "...")

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Complete sua Proposta</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #0F172A; color: white; padding: 30px; text-align: center; border-radius: 8px;">
                  <h1>🛡️ Complete sua Proposta</h1>
              </div>
              <div style="background: #f9f9f9; padding: 30px;">
                  <p>Olá <strong>${nome}</strong>,</p>
                  <p>Seu corretor <strong>${corretor}</strong> iniciou uma proposta de plano de saúde para você!</p>
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${link}" style="background: #0F172A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                          ✅ COMPLETAR PROPOSTA
                      </a>
                  </div>
                  <p>Link direto: <a href="${link}">${link}</a></p>
              </div>
          </div>
      </body>
      </html>
    `

    console.log("📤 Enviando para Resend...")

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject || `Complete sua proposta - ${nome}`,
        html: emailHtml,
      }),
    })

    console.log("📬 Status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro:", errorText)
      return new Response(JSON.stringify({ error: "Erro ao enviar", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const result = await response.json()
    console.log("✅ Sucesso! ID:", result.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email enviado!",
        id: result.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("💥 Erro:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
