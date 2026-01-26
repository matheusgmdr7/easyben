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
    const { to, subject, nome, corretor, link } = requestData

    if (!to || !nome) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios: to, nome" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const API_KEY = "re_hbo9nhsH_Nub8YRaedQWU9dhyw3G8E11W"
    // USANDO EMAIL DO RESEND PARA TESTE
    const FROM_EMAIL = "onboarding@resend.dev"

    console.log("🔑 Testando com email do Resend...")

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>🛡️ Complete sua Proposta</h2>
          <p>Olá <strong>${nome}</strong>,</p>
          <p>Seu corretor <strong>${corretor}</strong> iniciou uma proposta para você!</p>
          <div style="margin: 30px 0;">
              <a href="${link}" style="background: #0F172A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
                  ✅ COMPLETAR PROPOSTA
              </a>
          </div>
          <p>Link: <a href="${link}">${link}</a></p>
          <hr>
          <small>Teste de email - Contratando Planos</small>
      </body>
      </html>
    `

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject || `[TESTE] Complete sua proposta - ${nome}`,
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro:", errorText)
      return new Response(JSON.stringify({ error: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const result = await response.json()
    console.log("✅ Email enviado! ID:", result.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email enviado com sucesso!",
        id: result.id,
        from: FROM_EMAIL,
        to: to,
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
