import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(request: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "Chave RESEND_API_KEY não definida no ambiente." },
      { status: 500 }
    )
  }
  const resend = new Resend(resendApiKey)
  try {
    const { email, code, nome } = await request.json()

    if (!email || !code || !nome) {
      return NextResponse.json(
        { error: "Email, código e nome são obrigatórios" },
        { status: 400 }
      )
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      )
    }

    // Validar código (6 dígitos)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Código deve ter 6 dígitos" },
        { status: 400 }
      )
    }

    const { data, error } = await resend.emails.send({
      from: "Contratando Planos <noreply@contratandoplanos.com.br>",
      to: [email],
      subject: "Seu código de assinatura digital - Contratando Planos",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Código de Assinatura Digital</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Contratando Planos</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
              Olá <strong>${nome}</strong>,
            </p>
            
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
              Você solicitou um código de assinatura digital para finalizar sua proposta de plano de saúde.
            </p>
            
            <div style="background: white; border: 2px dashed #0F172A; border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0;">
              <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Seu código de assinatura é:</p>
              <div style="font-size: 32px; font-weight: bold; color: #0F172A; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </div>
            </div>
            
            <div style="background: #e8f5e8; border-left: 4px solid #0F172A; padding: 15px; margin: 25px 0;">
              <p style="color: #2d5a2d; font-size: 14px; margin: 0;">
                <strong>Importante:</strong> Este código é válido apenas para finalizar sua proposta atual. 
                Não compartilhe este código com outras pessoas.
              </p>
            </div>
            
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              Digite este código no campo de assinatura digital para finalizar sua proposta.
            </p>
            
            <p style="color: #777; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              Este é um email automático. Não responda a esta mensagem.
              <br>
              Se você não solicitou este código, ignore este email.
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error("Erro ao enviar email:", error)
      return NextResponse.json(
        { error: "Erro ao enviar código por email" },
        { status: 500 }
      )
    }

    console.log("✅ Código de assinatura enviado com sucesso para:", email)
    return NextResponse.json({ success: true, message: "Código enviado com sucesso" })

  } catch (error) {
    console.error("Erro na API send-signature-code:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 
