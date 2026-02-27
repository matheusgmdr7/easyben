# 🔧 Troubleshooting Completo: Email de Recuperação Não Chega

## 🎯 Problema

SMTP está configurado no Supabase, mas o email de recuperação de senha não está chegando.

---

## ✅ Checklist de Verificação (Siga na Ordem)

### 1. Verificar se o Usuário Existe no Supabase Auth

**IMPORTANTE:** O email só será enviado se o usuário existir no Supabase Auth.

#### Para Corretores:
```sql
-- Verificar se corretor existe
SELECT id, nome, email 
FROM corretores 
WHERE email ILIKE '%seu-email@exemplo.com%';

-- Verificar se usuário existe no Auth
-- No Supabase Dashboard → Authentication → Users
-- Procure pelo email
```

#### Para Gestores:
```sql
-- Verificar se gestor existe (corretor com is_gestor = true)
SELECT id, nome, email, is_gestor 
FROM corretores 
WHERE email ILIKE '%seu-email@exemplo.com%' 
AND is_gestor = true;
```

#### Para Analistas:
```sql
-- Verificar se analista existe
SELECT id, nome, email, perfil, permissoes 
FROM usuarios_admin 
WHERE email ILIKE '%seu-email@exemplo.com%' 
AND ativo = true;
```

#### Para Administradoras:
```sql
-- Verificar se administradora existe
SELECT id, nome, email_login 
FROM administradoras 
WHERE email_login ILIKE '%seu-email@exemplo.com%';
```

---

### 2. Verificar URLs de Redirecionamento no Supabase

**CRÍTICO:** As URLs de redirecionamento DEVEM estar configuradas no Supabase.

1. Acesse: **Supabase Dashboard → Settings → Authentication → URL Configuration**
2. Em **Redirect URLs**, adicione:

```
# Para desenvolvimento (localhost)
http://localhost:3000/corretor/redefinir-senha
http://localhost:3000/gestor/redefinir-senha
http://localhost:3000/analista/redefinir-senha
http://localhost:3000/administradora/redefinir-senha

# Para produção (substitua pelo seu domínio)
https://seudominio.com.br/corretor/redefinir-senha
https://seudominio.com.br/gestor/redefinir-senha
https://seudominio.com.br/analista/redefinir-senha
https://seudominio.com.br/administradora/redefinir-senha
```

**Site URL** também deve estar configurado:
```
https://seudominio.com.br
```
ou
```
http://localhost:3000
```

---

### 3. Verificar Variável de Ambiente NEXT_PUBLIC_APP_URL

A variável `NEXT_PUBLIC_APP_URL` deve estar configurada no `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Ou em produção:
```env
NEXT_PUBLIC_APP_URL=https://seudominio.com.br
```

**Verificar:**
1. Abra `.env.local`
2. Confirme que `NEXT_PUBLIC_APP_URL` está definida
3. Reinicie o servidor após alterar variáveis de ambiente

---

### 4. Verificar Logs do Servidor

Ao solicitar recuperação de senha, verifique os logs do terminal onde o servidor está rodando:

#### ✅ Logs de Sucesso:
```
📧 Tentando enviar email de redefinição: { email: '...', redirectTo: '...' }
✅ Email de redefinição enviado para: [email]
```

#### ❌ Logs de Erro:
```
⚠️ Usuário não encontrado no Supabase Auth para: [email]
⚠️ Corretor não encontrado na tabela corretores para: [email]
❌ Erro ao enviar email de redefinição: { message: '...', status: '...' }
```

#### ⚠️ Erro de URL Não Configurada:
```
⚠️ ATENÇÃO: URL de redirecionamento não configurada no Supabase!
⚠️ Configure em: Supabase Dashboard → Settings → Authentication → URL Configuration
⚠️ Adicione esta URL: [URL]
```

---

### 5. Verificar Configuração SMTP no Supabase

1. Acesse: **Supabase Dashboard → Settings → Auth → SMTP Settings**
2. Verifique se está habilitado
3. Verifique se o provedor (Resend, SendGrid, etc.) está configurado corretamente
4. Verifique se as credenciais estão corretas

---

### 6. Verificar Logs do Supabase

1. Acesse: **Supabase Dashboard → Logs → Auth Logs**
2. Procure por tentativas de envio de email
3. Verifique se há erros relacionados ao envio

---

### 7. Verificar Logs do Resend (se estiver usando)

1. Acesse: **Resend Dashboard → Logs**
2. Verifique se o email foi enviado
3. Verifique o status (delivered, bounced, etc.)

---

### 8. Verificar Caixa de Spam

- Verifique a pasta de spam/lixo eletrônico
- Verifique filtros de email
- Tente com outro provedor de email (Gmail, Outlook, etc.)

---

## 🛠️ Soluções por Tipo de Erro

### Erro: "Usuário não encontrado no Supabase Auth"

**Causa:** O usuário não foi criado no Supabase Auth.

**Solução:**
1. **Para Corretores/Gestores:**
   - Faça login uma vez (isso cria o usuário no Auth)
   - Ou crie manualmente no Supabase Dashboard → Authentication → Users

2. **Para Analistas:**
   - O usuário deve ser criado durante o cadastro
   - Verifique se o cadastro foi concluído com sucesso

3. **Para Administradoras:**
   - Configure o login em `/admin/administradoras`
   - Isso cria automaticamente o usuário no Auth

---

### Erro: "URL de redirecionamento não permitida"

**Causa:** A URL não está configurada no Supabase.

**Solução:**
1. Acesse: **Supabase Dashboard → Settings → Authentication → URL Configuration**
2. Em **Redirect URLs**, adicione a URL completa:
   ```
   http://localhost:3000/corretor/redefinir-senha
   ```
3. Clique em **Save**
4. Tente novamente

---

### Erro: "Email não chega mas logs mostram sucesso"

**Causa:** Problema com SMTP ou email na caixa de spam.

**Solução:**
1. Verifique a pasta de spam
2. Verifique logs do Resend/SMTP provider
3. Teste com outro email
4. Verifique se o domínio está verificado no Resend

---

### Erro: "Configuração do servidor incompleta"

**Causa:** Variáveis de ambiente não configuradas.

**Solução:**
1. Verifique `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
2. Reinicie o servidor após alterar

---

## 🧪 Teste Passo a Passo

### Teste 1: Verificar se Usuário Existe

1. Acesse o Supabase Dashboard
2. Vá em **Authentication → Users**
3. Procure pelo email que você está testando
4. Se não existir, crie ou faça login uma vez

### Teste 2: Verificar URLs Configuradas

1. Acesse: **Supabase Dashboard → Settings → Authentication → URL Configuration**
2. Verifique se as URLs estão na lista de **Redirect URLs**
3. Se não estiverem, adicione e salve

### Teste 3: Testar Recuperação

1. Acesse a página de recuperação (ex: `/corretor/recuperar-senha`)
2. Digite o email
3. Clique em "Recuperar Senha"
4. Verifique os logs do servidor
5. Verifique a caixa de entrada (e spam)

### Teste 4: Verificar Logs

1. Abra o terminal onde o servidor está rodando
2. Procure por mensagens de erro ou sucesso
3. Se houver erro, siga as soluções acima

---

## 📋 Checklist Final

Antes de reportar o problema, verifique:

- [ ] Usuário existe no Supabase Auth
- [ ] Usuário existe na tabela correspondente (corretores/usuarios_admin/administradoras)
- [ ] URLs de redirecionamento estão configuradas no Supabase
- [ ] `NEXT_PUBLIC_APP_URL` está configurada no `.env.local`
- [ ] SMTP está habilitado no Supabase
- [ ] Credenciais SMTP estão corretas
- [ ] Domínio está verificado no Resend (se aplicável)
- [ ] Verificou a pasta de spam
- [ ] Verificou os logs do servidor
- [ ] Verificou os logs do Supabase
- [ ] Testou com outro email

---

## 🔍 Debug Avançado

### Adicionar Logs Detalhados

Se ainda não funcionar, adicione logs temporários na API route:

```typescript
console.log("🔍 DEBUG - Verificando corretor:", {
  email: emailNormalizado,
  corretoresEncontrados: corretores?.length || 0,
  authUserExiste: !!authUser,
  redirectTo: redirectTo,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
})
```

### Testar Diretamente no Supabase

1. Acesse: **Supabase Dashboard → Authentication → Users**
2. Clique no usuário
3. Clique em **"Send password reset email"**
4. Verifique se o email chega
5. Se chegar, o problema está na API route
6. Se não chegar, o problema está no SMTP

---

## 📞 Próximos Passos

Se após todas as verificações o email ainda não chegar:

1. **Verifique os logs do servidor** (terminal onde `npm run dev` está rodando)
2. **Verifique os logs do Supabase** (Dashboard → Logs → Auth Logs)
3. **Verifique os logs do Resend** (se estiver usando)
4. **Teste com um email diferente** (Gmail, Outlook, etc.)
5. **Verifique se o domínio está verificado** no Resend
6. **Teste diretamente no Supabase** (Dashboard → Authentication → Users → Send password reset)

---

## 💡 Dica Importante

**A causa mais comum é a URL de redirecionamento não estar configurada no Supabase!**

Sempre verifique primeiro:
1. Supabase Dashboard → Settings → Authentication → URL Configuration
2. Adicione todas as URLs de redirecionamento necessárias
3. Salve e teste novamente
