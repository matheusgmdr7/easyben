# 📧 Guia: Configurar Resend como SMTP no Supabase

## 🎯 Objetivo
Configurar o Resend para enviar emails de autenticação (redefinição de senha, confirmação, etc.) através do Supabase.

---

## 📋 Passo 1: Criar Conta no Resend

1. Acesse [https://resend.com](https://resend.com)
2. Crie uma conta gratuita (100 emails/dia grátis)
3. Verifique seu email

---

## 📋 Passo 2: Verificar Domínio no Resend

1. No painel do Resend, vá em **Domains**
2. Clique em **Add Domain**
3. Digite seu domínio (ex: `contratandoplanos.com.br`)
4. Configure os registros DNS conforme instruções:
   - **SPF**: `v=spf1 include:resend.com ~all`
   - **DKIM**: Registros TXT fornecidos pelo Resend
   - **DMARC**: (opcional) `v=DMARC1; p=none;`
5. Aguarde verificação (pode levar algumas horas)

---

## 📋 Passo 3: Obter Credenciais SMTP do Resend

No painel do Resend:
1. Vá em **API Keys**
2. Crie uma nova API Key (ou use uma existente)
3. **IMPORTANTE**: Anote a chave (ela só aparece uma vez)

**Credenciais SMTP do Resend:**
- **Host**: `smtp.resend.com`
- **Porta**: `465` (SSL) ou `587` (TLS)
- **Usuário**: `resend`
- **Senha**: Sua API Key do Resend (começa com `re_`)

---

## 📋 Passo 4: Configurar SMTP no Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **Auth** → **SMTP Settings**
4. Ative **Enable Custom SMTP**
5. Preencha os campos:

```
Enable Custom SMTP: ✅ ON

Sender email: noreply@seudominio.com.br
Sender name: Contratando Planos (ou nome da sua empresa)

SMTP Host: smtp.resend.com
SMTP Port: 465
SMTP User: resend
SMTP Password: re_sua_api_key_aqui
```

6. Clique em **Save**

---

## 📋 Passo 5: Testar Configuração

1. No Supabase, vá em **Auth** → **Users**
2. Crie um usuário de teste
3. Use a função de "Reset Password" para testar
4. Verifique se o email chegou

---

## ✅ Verificação

Se tudo estiver correto:
- ✅ Emails de redefinição de senha serão enviados via Resend
- ✅ Emails de confirmação serão enviados via Resend
- ✅ Você verá os emails no dashboard do Resend

---

## 🐛 Troubleshooting

### Email não chega
- Verifique spam/lixo eletrônico
- Confirme que o domínio está verificado no Resend
- Verifique os logs no Resend Dashboard → Logs
- Verifique os logs no Supabase Dashboard → Logs

### Erro de autenticação SMTP
- Confirme que a API Key está correta
- Verifique se o domínio está verificado
- Tente usar porta 587 com TLS

### Domínio não verifica
- Aguarde até 48 horas para propagação DNS
- Verifique os registros DNS no seu provedor
- Use ferramentas como [MXToolbox](https://mxtoolbox.com) para verificar

---

## 📚 Recursos

- [Documentação Resend](https://resend.com/docs)
- [Documentação Supabase Auth](https://supabase.com/docs/guides/auth)
- [Configuração SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp)

