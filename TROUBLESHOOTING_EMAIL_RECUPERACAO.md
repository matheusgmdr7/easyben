# 🔧 Troubleshooting: Email de Recuperação de Senha Não Chega

## 🎯 Problema Comum

Você configurou o SMTP no Supabase e Resend, mas o email de recuperação de senha não está chegando.

---

## ✅ Verificações Necessárias

### 1. Verificar se Administradora Existe na Tabela

O sistema verifica **duas coisas** antes de enviar o email:

1. ✅ **Administradora existe na tabela `administradoras`** com `email_login` configurado
2. ✅ **Usuário existe no Supabase Auth** com o mesmo email

**IMPORTANTE:** Se você criou um usuário diretamente no Supabase Auth (não através do sistema), ele **NÃO** estará na tabela `administradoras` e o email **NÃO** será enviado.

---

## 🔍 Como Verificar

### Verificar se Administradora Existe

Execute no Supabase SQL Editor:

```sql
SELECT id, nome, email_login, email, status_login 
FROM administradoras 
WHERE email_login ILIKE '%seu-email@exemplo.com%';
```

Se não retornar nada, a administradora não está cadastrada ou não tem `email_login` configurado.

### Verificar se Usuário Existe no Auth

No Supabase Dashboard:
1. Vá em **Authentication** → **Users**
2. Procure pelo email
3. Se não existir, precisa criar

---

## 🛠️ Soluções

### Solução 1: Configurar Login da Administradora (Recomendado)

1. Acesse `/admin/administradoras`
2. Encontre a administradora
3. Clique em **"Configurar Acesso"** ou **"Configurar Senha"**
4. Defina o email de login e senha
5. Isso criará automaticamente:
   - Usuário no Supabase Auth
   - `email_login` na tabela `administradoras`
   - `senha_hash` na tabela `administradoras`

### Solução 2: Vincular Usuário Existente do Auth à Administradora

Se você já criou o usuário no Supabase Auth manualmente:

1. Execute no Supabase SQL Editor:

```sql
-- Atualizar administradora com email_login do usuário do Auth
UPDATE administradoras 
SET email_login = 'seu-email@exemplo.com'
WHERE id = 'id-da-administradora';
```

2. Verifique se o email do Auth corresponde ao `email_login`:

```sql
-- Verificar correspondência
SELECT 
  a.id,
  a.nome,
  a.email_login,
  au.email as auth_email
FROM administradoras a
LEFT JOIN auth.users au ON LOWER(au.email) = LOWER(a.email_login)
WHERE a.email_login = 'seu-email@exemplo.com';
```

### Solução 3: Criar Administradora e Usuário do Zero

1. Acesse `/admin/administradoras`
2. Clique em **"Nova Administradora"**
3. Preencha os dados
4. Clique em **"Configurar Acesso"**
5. Defina email e senha

---

## 📋 Checklist de Verificação

Antes de testar, verifique:

- [ ] Administradora existe na tabela `administradoras`
- [ ] `email_login` está configurado na administradora
- [ ] Usuário existe no Supabase Auth com o mesmo email
- [ ] SMTP está configurado no Supabase (Settings → Auth → SMTP)
- [ ] Resend está configurado corretamente
- [ ] Domínio está verificado no Resend
- [ ] URL de redirecionamento está configurada no Supabase

---

## 🐛 Debug: Verificar Logs

### Logs do Servidor

Ao solicitar recuperação de senha, verifique os logs do servidor:

```
✅ Email de redefinição enviado para: [email]
```

ou

```
⚠️ Usuário não encontrado no Supabase Auth para: [email]
⚠️ Administradora não encontrada na tabela administradoras para: [email]
```

### Logs do Supabase

No Supabase Dashboard → Logs → Auth Logs, você verá tentativas de envio de email.

### Logs do Resend

No Resend Dashboard → Logs, você verá se o email foi enviado e o status.

---

## 🔄 Fluxo Correto

```
1. Administradora cadastrada em /admin/administradoras
   ↓
2. Login configurado (cria usuário no Auth + email_login)
   ↓
3. Solicitação de recuperação de senha
   ↓
4. Sistema verifica:
   - Administradora existe? ✅
   - Usuário no Auth existe? ✅
   ↓
5. Envia email via Supabase → Resend
   ↓
6. Email chega na caixa de entrada
```

---

## ⚠️ Problemas Comuns

### "Usuário não encontrado no Supabase Auth"
- **Causa**: Usuário não foi criado no Auth
- **Solução**: Configure o login da administradora em `/admin/administradoras`

### "Administradora não encontrada"
- **Causa**: Email não está na tabela `administradoras` ou `email_login` não está configurado
- **Solução**: Configure o `email_login` da administradora

### "Email não chega mas logs mostram sucesso"
- **Causa**: Problema com SMTP ou email na caixa de spam
- **Solução**: 
  - Verifique spam/lixo eletrônico
  - Verifique logs do Resend
  - Teste com outro email

### "Erro ao enviar email de redefinição"
- **Causa**: SMTP não configurado corretamente
- **Solução**: Verifique configuração SMTP no Supabase

---

## 🧪 Teste Rápido

1. Acesse `/admin/administradoras`
2. Encontre uma administradora
3. Clique em **"Configurar Acesso"**
4. Defina email e senha
5. Acesse `/administradora/recuperar-senha`
6. Digite o email configurado
7. Verifique se o email chega

---

## 📞 Próximos Passos

Se após todas as verificações o email ainda não chegar:

1. Verifique os logs do servidor (console)
2. Verifique os logs do Supabase (Dashboard → Logs)
3. Verifique os logs do Resend (Dashboard → Logs)
4. Teste com um email diferente
5. Verifique se o domínio está verificado no Resend

