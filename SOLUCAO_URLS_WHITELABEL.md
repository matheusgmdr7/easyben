# 🔗 Solução: URLs Dinâmicas para White-Label

## 🎯 Problema

No sistema white-label, cada cliente tem seu próprio domínio:
- Cliente A: `clientea.com.br`
- Cliente B: `clienteb.com.br`
- Cliente C: `clientec.com.br`

O Supabase só aceita URLs fixas nas configurações de redirecionamento, então não podemos adicionar todos os domínios manualmente.

---

## ✅ Solução Implementada: Página Intermediária

Criamos uma página intermediária (`/administradora/redefinir-senha-redirect`) que:

1. **Recebe o token do Supabase** (via URL hash)
2. **Detecta o domínio atual** automaticamente
3. **Redireciona para a página de redefinição** no mesmo domínio

### Como Funciona

```
Email do Supabase → Link com token
    ↓
/administradora/redefinir-senha-redirect?token=xxx
    ↓
Detecta domínio atual (clientea.com.br)
    ↓
Redireciona para: clientea.com.br/administradora/redefinir-senha?token=xxx
```

---

## 📋 Configuração no Supabase

### URLs a Configurar

No Supabase Dashboard → Settings → Authentication → URL Configuration:

**Site URL:**
```
https://seudominio.com.br
```
(Use o domínio principal do sistema ou um domínio fixo)

**Redirect URLs:**
```
https://seudominio.com.br/administradora/redefinir-senha-redirect
http://localhost:3000/administradora/redefinir-senha-redirect
```

**IMPORTANTE:** Você só precisa adicionar **UMA URL** (a página intermediária), não precisa adicionar cada domínio de cliente!

### ✅ Resposta à sua pergunta:

**Sim!** Você pode usar apenas uma URL fixa do seu domínio principal. A página intermediária funciona em qualquer domínio porque:

1. O link do email sempre aponta para seu domínio principal
2. A página intermediária detecta automaticamente o domínio atual
3. Redireciona para o domínio correto do cliente

**Exemplo:**
- Email enviado: `https://sistema.easyben.com/administradora/redefinir-senha-redirect#token=xxx`
- Cliente acessa de: `clientea.com.br`
- Página detecta: `clientea.com.br`
- Redireciona para: `clientea.com.br/administradora/redefinir-senha?token=xxx`

---

## 🔄 Fluxo Completo

### 1. Cliente Solicita Redefinição
```
Cliente acessa: clientea.com.br/administradora/recuperar-senha
    ↓
Digita email e clica em "Recuperar Senha"
    ↓
API route chama: supabase.auth.resetPasswordForEmail()
    ↓
Supabase envia email com link (sempre para domínio principal)
```

### 2. Cliente Clica no Link do Email
```
Email contém: https://seudominio.com.br/administradora/redefinir-senha-redirect#access_token=xxx
    ↓
Página intermediária detecta domínio atual (clientea.com.br)
    ↓
Redireciona para: clientea.com.br/administradora/redefinir-senha?access_token=xxx
```

### 3. Cliente Redefine Senha
```
Página de redefinição recebe token
    ↓
Valida token e permite redefinir senha
    ↓
Atualiza senha no Supabase Auth e na tabela administradoras
```

---

## 🎨 Vantagens desta Solução

✅ **Funciona em qualquer domínio** - Não precisa configurar cada cliente no Supabase
✅ **Seguro** - Token é validado pelo Supabase
✅ **Simples** - Apenas uma URL fixa no Supabase
✅ **Escalável** - Funciona para quantos clientes você tiver
✅ **Flexível** - Funciona mesmo se o cliente mudar de domínio

---

## 🔧 Alternativas Consideradas

### ❌ Opção 1: Adicionar cada domínio no Supabase
- **Problema**: Limitado, não escala, precisa atualizar manualmente

### ❌ Opção 2: Usar wildcards
- **Problema**: Supabase não suporta wildcards em URLs de redirecionamento

### ✅ Opção 3: Página Intermediária (Implementada)
- **Vantagem**: Funciona para todos os domínios automaticamente

---

## 📝 Notas Importantes

1. **Domínio do Email**: O email do Supabase sempre virá do domínio configurado no "Site URL", mas o link funcionará em qualquer domínio.

2. **Segurança**: O token do Supabase é válido e seguro, mesmo sendo redirecionado.

3. **Fallback**: Se o redirecionamento falhar, o usuário pode copiar o link e acessar manualmente.

4. **Middleware**: O middleware do Next.js detecta automaticamente o tenant pelo domínio, então a página intermediária funciona perfeitamente.

---

## 🧪 Teste

1. Configure o Resend no Supabase (veja `GUIA_CONFIGURACAO_RESEND_SUPABASE.md`)
2. Configure a URL de redirecionamento no Supabase:
   - `https://seudominio.com.br/administradora/redefinir-senha-redirect`
3. Teste o fluxo completo:
   - Solicite redefinição de senha
   - Clique no link do email
   - Verifique se redireciona corretamente
   - Redefina a senha

---

## 🐛 Troubleshooting

### Link não funciona
- Verifique se a URL está configurada no Supabase
- Verifique se o domínio está correto
- Verifique os logs do navegador

### Redirecionamento não funciona
- Verifique se o middleware está detectando o tenant corretamente
- Verifique se o domínio está acessível

### Token inválido
- Tokens expiram em 1 hora
- Solicite um novo link de redefinição
