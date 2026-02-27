# ⚙️ Configuração Rápida: Recuperação de Senha

## 🚨 Problema Mais Comum: Email Não Chega

Se o SMTP está configurado mas o email não chega, **99% das vezes** é porque as URLs de redirecionamento não estão configuradas no Supabase.

---

## ✅ Solução Rápida (5 minutos)

### Passo 1: Configurar Variável de Ambiente

Adicione no seu `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Ou em produção (app com um único domínio):
```env
NEXT_PUBLIC_APP_URL=https://seudominio.com.br
```

**Multi-tenant (vários domínios de clientes):** use o **domínio da EasyBen** para recuperação (mais seguro). Opcionalmente:
```env
NEXT_PUBLIC_APP_URL_RECOVERY=https://app.easyben.com.br
```
Se não definir `NEXT_PUBLIC_APP_URL_RECOVERY`, será usado `NEXT_PUBLIC_APP_URL`. O link do email sempre aponta para o domínio configurado; no Supabase, use **apenas** esse domínio (veja seção abaixo).

**Importante:** Reinicie o servidor após adicionar ou alterar variáveis!

---

### Passo 2: Configurar URLs no Supabase

1. Acesse: **Supabase Dashboard → Settings → Authentication → URL Configuration**

2. Em **Site URL**, configure:
   ```
   http://localhost:3000
   ```
   (ou seu domínio de produção)

3. Em **Redirect URLs**, adicione **TODAS** estas URLs (uma por linha):

   ```
   http://localhost:3000/corretor/redefinir-senha
   http://localhost:3000/gestor/redefinir-senha
   http://localhost:3000/analista/redefinir-senha
   http://localhost:3000/administradora/redefinir-senha
   ```

   Se estiver em produção (domínio único), adicione também:
   ```
   https://seudominio.com.br/corretor/redefinir-senha
   https://seudominio.com.br/gestor/redefinir-senha
   https://seudominio.com.br/analista/redefinir-senha
   https://seudominio.com.br/administradora/redefinir-senha
   ```

   O link do email leva **direto** à página de troca de senha (sem página intermediária), o que torna a abertura mais rápida.

   **Se o link ainda demorar:** Emails **já enviados** antes dessa configuração usam o link antigo. Peça uma **nova** recuperação de senha para receber o link rápido.

4. Clique em **Save**

---

### Passo 3: Verificar se Usuário Existe no Auth

1. Acesse: **Supabase Dashboard → Authentication → Users**
2. Procure pelo email que você está testando
3. Se não existir:
   - **Para corretores/gestores:** Faça login uma vez (isso cria o usuário)
   - **Para analistas:** Complete o cadastro
   - **Para administradoras:** Configure o login em `/admin/administradoras`

---

### Passo 4: Testar

1. Acesse a página de recuperação (ex: `/corretor/recuperar-senha`)
2. Digite o email
3. Clique em "Recuperar Senha"
4. **Verifique os logs do servidor** (terminal onde `npm run dev` está rodando)
5. Verifique a caixa de entrada (e spam)

---

## 🔍 Como Verificar se Está Funcionando

### Logs de Sucesso (Terminal):
```
📧 Tentando enviar email de redefinição: { email: '...', redirectTo: '...' }
✅ Email de redefinição enviado para: [email]
✅ Verifique a caixa de entrada e spam do email: [email]
```

### Logs de Erro (Terminal):
```
⚠️ ATENÇÃO: URL de redirecionamento não configurada no Supabase!
⚠️ Configure em: Supabase Dashboard → Settings → Authentication → URL Configuration
⚠️ Adicione esta URL: [URL]
```

Se aparecer este erro, volte ao **Passo 2** e adicione a URL.

---

## 📋 Checklist Rápido

- [ ] `NEXT_PUBLIC_APP_URL` (e, se multi-tenant, `NEXT_PUBLIC_APP_URL_RECOVERY`) está no `.env.local`
- [ ] Servidor foi reiniciado após adicionar a variável
- [ ] URLs de redirecionamento estão no Supabase (4 URLs) — **apenas domínio EasyBen** em multi-tenant
- [ ] Site URL está configurado no Supabase
- [ ] Usuário existe no Supabase Auth
- [ ] SMTP está habilitado no Supabase
- [ ] Verificou a pasta de spam

---

## ⏱ Link expirou ou "otp_expired"?

Se aparecer **"Link expirado ou inválido"** ou a URL tiver `error_code=otp_expired`:
- Os links de recuperação **valem 1 hora** e **só podem ser usados uma vez**.
- Use **"Solicitar nova redefinição de senha"** na própria página e abra o **novo** link no email.

---

## 🐛 Ainda Não Funciona?

1. **Verifique os logs do servidor** - Procure por mensagens de erro
2. **Verifique os logs do Supabase** - Dashboard → Logs → Auth Logs
3. **Teste diretamente no Supabase** - Dashboard → Authentication → Users → Send password reset
4. **Leia o guia completo:** `docs/TROUBLESHOOTING-EMAIL-RECUPERACAO-COMPLETO.md`

---

## 🌐 Multi-tenant: usar apenas o domínio EasyBen (recomendado)

Se cada **cliente tem seu próprio domínio** (white-label):

- **Sim, é mais seguro** manter **apenas o domínio da EasyBen** no URL Configuration.
- **Não adicione** domínios de clientes nas Redirect URLs do Supabase.

### Por quê?

| Aspecto | Só EasyBen | Vários domínios de clientes |
|--------|------------|-----------------------------|
| **Segurança** | Um único domínio controlado por você; menos URLs na allowlist | Muitos domínios; maior superfície e mais trabalho ao auditar |
| **Operação** | Nada a alterar ao cadastrar novo cliente | É preciso adicionar cada novo domínio no Supabase |
| **Manutenção** | Só 4 URLs (ou 8 com localhost) | Dezenas de URLs |

### O que significa **`app`** no domínio? Preciso criar esse subdomínio?

`app` é um **subdomínio**: indica onde a aplicação web (sistema) está hospedada. Em `app.easyben.com.br`, a app roda em `app`.

**Você não precisa criar o subdomínio `app`.** Use a URL onde a sua aplicação **já está rodando** em produção:

- Se a app está em `https://easyben.com.br` → use `https://easyben.com.br`
- Se está em `https://www.easyben.com.br` → use `https://www.easyben.com.br`
- Só crie `app.easyben.com.br` (ou `sistema.`, `painel.`, etc.) se quiser passar a servir a app nesse subdomínio — aí sim é preciso configurar DNS e hospedagem para esse endereço.

### Como configurar

1. Defina `NEXT_PUBLIC_APP_URL_RECOVERY` (ou `NEXT_PUBLIC_APP_URL`) com o domínio **EasyBen** onde a app roda, por exemplo:
   ```env
   NEXT_PUBLIC_APP_URL_RECOVERY=https://app.easyben.com.br
   ```
2. No Supabase, em **Redirect URLs**, use **somente** esse domínio:
   ```
   https://app.easyben.com.br/corretor/redefinir-senha
   https://app.easyben.com.br/gestor/redefinir-senha
   https://app.easyben.com.br/analista/redefinir-senha
   https://app.easyben.com.br/administradora/redefinir-senha
   ```
   (+ localhost para desenvolvimento)

3. O link do email **sempre** leva para o domínio EasyBen. O usuário redefine a senha lá e depois pode fazer login no domínio do cliente normalmente.

---

## 💡 Dica

**A causa mais comum é esquecer de adicionar as URLs no Supabase!**

Sempre verifique:
- Supabase Dashboard → Settings → Authentication → URL Configuration
- Use **apenas** o domínio da EasyBen (e localhost em dev). Não use domínios de clientes.
