# 🧪 Como Testar: Criar Novo Cliente e Acessar pelo Domínio

## 📋 GUIA COMPLETO PASSO A PASSO

---

## 🎯 PASSO 1: Criar um Novo Cliente (Tenant)

### 1.1. Acesse o EasyBen Admin

```
http://localhost:3000/easyben-admin/login
```

Faça login com suas credenciais de master/super_admin.

### 1.2. Vá para a Página de Plataformas

```
http://localhost:3000/easyben-admin/plataformas
```

### 1.3. Clique em "Criar Nova Plataforma"

Você verá um botão para criar uma nova plataforma.

### 1.4. Preencha os Dados do Cliente

**Campos Obrigatórios:**
- **Nome**: `Empresa ABC` (nome da empresa)
- **Slug**: `empresa-abc` (identificador único, apenas letras minúsculas, números e hífens)

**Campos Opcionais (mas importantes para teste):**
- **Domínio Principal**: `empresaabc.com.br` (domínio personalizado do cliente)
- **Subdomínio**: `empresaabc` (para usar como `empresaabc.localhost:3000`)
- **Domínio Personalizado**: `empresaabc.com.br` (mesmo que domínio principal)

**Exemplo de Preenchimento:**
```
Nome: Empresa ABC
Slug: empresa-abc
Subdomínio: empresaabc
Domínio Principal: empresaabc.com.br
Domínio Personalizado: empresaabc.com.br
Status: Ativo
```

### 1.5. Clique em "Criar"

O sistema criará o tenant e você verá uma mensagem de sucesso.

---

## 🎯 PASSO 2: Habilitar Recursos para o Cliente

### 2.1. Edite a Plataforma Criada

Na lista de plataformas, clique no botão **"Editar"** da plataforma que você acabou de criar.

### 2.2. Vá para a Aba "Recursos e Funcionalidades"

No modal de edição, clique na aba **"Recursos e Funcionalidades"**.

### 2.3. Escolha os Recursos

Marque os recursos que você quer que o cliente tenha acesso:

- ✅ **Portal do Corretor** → Cliente poderá acessar `/corretor/*`
- ✅ **Portal do Gestor** → Cliente poderá acessar `/gestor/*`
- ❌ **Portal da Administradora** → Cliente **NÃO** poderá acessar `/administradora/*`
- ✅ **Portal do Admin** → Cliente poderá acessar `/admin/*`
- ❌ **Portal do Analista** → Cliente **NÃO** poderá acessar `/analista/*`

**Para este teste, vamos habilitar apenas:**
- ✅ Portal do Corretor
- ✅ Portal do Gestor
- ❌ Portal da Administradora (desabilitado para testar bloqueio)

### 2.4. Salve as Alterações

Clique em **"Salvar Recursos"** e aguarde a confirmação.

---

## 🎯 PASSO 3: Configurar Domínio Local para Teste

Para testar localmente, você precisa mapear um domínio/subdomínio para `localhost`.

### 3.1. Editar Arquivo Hosts do Windows

**Localização do arquivo:**
```
C:\Windows\System32\drivers\etc\hosts
```

**⚠️ IMPORTANTE:** Você precisa abrir o Notepad (ou editor de texto) **como Administrador** para editar este arquivo.

### 3.2. Adicionar Entrada no Hosts

Abra o arquivo `hosts` e adicione esta linha no final:

```
127.0.0.1    empresaabc.localhost
```

**Ou, se preferir usar um domínio completo:**

```
127.0.0.1    empresaabc.com.br
```

**Salve o arquivo.**

### 3.3. Verificar se Funcionou

Abra o PowerShell (como Administrador) e execute:

```powershell
ping empresaabc.localhost
```

Você deve ver respostas de `127.0.0.1`.

---

## 🎯 PASSO 4: Testar Acesso pelo Domínio do Cliente

### 4.1. Acesse pelo Subdomínio

Abra o navegador e acesse:

```
http://empresaabc.localhost:3000/corretor/login
```

**O que deve acontecer:**
1. ✅ Middleware detecta o subdomínio `empresaabc`
2. ✅ Busca tenant com `subdominio = 'empresaabc'`
3. ✅ Define `tenant_id` no contexto
4. ✅ RecursoGuard verifica se tenant tem `portal_corretor` habilitado
5. ✅ **Se tiver acesso** → Mostra página de login
6. ❌ **Se NÃO tiver acesso** → Bloqueia e mostra erro

### 4.2. Testar Portal Habilitado (Portal do Corretor)

Se você habilitou "Portal do Corretor", você deve conseguir acessar:

```
http://empresaabc.localhost:3000/corretor/login
http://empresaabc.localhost:3000/corretor/dashboard
```

**Resultado esperado:** ✅ Página carrega normalmente

### 4.3. Testar Portal Desabilitado (Portal da Administradora)

Se você **desabilitou** "Portal da Administradora", tente acessar:

```
http://empresaabc.localhost:3000/administradora/login
```

**Resultado esperado:** ❌ Página bloqueada com mensagem:
> "Este recurso não está habilitado para sua plataforma"

---

## 🎯 PASSO 5: Testar Isolamento de Dados

### 5.1. Criar Dados no Tenant "Empresa ABC"

1. Acesse `http://empresaabc.localhost:3000/corretor/login`
2. Faça login (ou crie um corretor)
3. Crie um corretor ou proposta

**O que acontece:**
- Sistema adiciona automaticamente `tenant_id = "uuid-empresa-abc"` nos dados

### 5.2. Verificar que Dados Estão Separados

1. Acesse pelo tenant padrão: `http://localhost:3000/corretor/dashboard`
2. Veja a lista de corretores/propostas
3. **Resultado:** Você **NÃO** deve ver os dados criados no tenant "Empresa ABC"

### 5.3. Voltar ao Tenant "Empresa ABC"

1. Acesse `http://empresaabc.localhost:3000/corretor/dashboard`
2. Veja a lista de corretores/propostas
3. **Resultado:** Você deve ver **APENAS** os dados criados neste tenant

**✅ Dados estão isolados!**

---

## 🔍 TROUBLESHOOTING

### Problema: "Tenant não identificado"

**Causa:** Middleware não está detectando o tenant pelo domínio/subdomínio.

**Solução:**
1. Verifique se o subdomínio está correto no banco de dados
2. Verifique se o tenant está com `status = 'ativo'`
3. Verifique se o arquivo `hosts` foi salvo corretamente
4. Reinicie o servidor Next.js

### Problema: "Este recurso não está habilitado"

**Causa:** Recurso não foi habilitado para o tenant.

**Solução:**
1. Vá para EasyBen Admin → Editar Plataforma
2. Aba "Recursos e Funcionalidades"
3. Marque o recurso desejado
4. Clique em "Salvar Recursos"
5. Tente acessar novamente

### Problema: Domínio não funciona no navegador

**Causa:** Arquivo `hosts` não foi salvo ou navegador está usando cache.

**Solução:**
1. Verifique se o arquivo `hosts` foi salvo (como Administrador)
2. Limpe o cache do navegador
3. Tente em modo anônimo/privado
4. Reinicie o navegador

### Problema: Dados se misturam entre tenants

**Causa:** `tenant_id` não está sendo adicionado automaticamente.

**Solução:**
1. Verifique se está usando `insertWithTenant()` ou `updateWithTenant()` nos serviços
2. Verifique se o middleware está definindo o `tenant_slug` corretamente
3. Verifique se RLS está habilitado no Supabase

---

## 📊 RESUMO DO FLUXO COMPLETO

```
1. Criar Tenant no EasyBen Admin
   ↓
2. Habilitar Recursos (Portal do Corretor, etc.)
   ↓
3. Configurar Domínio/Subdomínio
   ↓
4. Adicionar entrada no arquivo hosts
   ↓
5. Acessar pelo domínio do cliente
   ↓
6. Sistema detecta tenant automaticamente
   ↓
7. RecursoGuard verifica acesso
   ↓
8. Se tiver acesso → Permite
   ↓
9. Se NÃO tiver acesso → Bloqueia
   ↓
10. Dados são salvos com tenant_id automaticamente
```

---

## ✅ CHECKLIST DE TESTE

- [ ] Criar novo tenant no EasyBen Admin
- [ ] Configurar subdomínio/domínio
- [ ] Habilitar recursos desejados
- [ ] Adicionar entrada no arquivo `hosts`
- [ ] Acessar pelo domínio do cliente
- [ ] Verificar que recursos habilitados funcionam
- [ ] Verificar que recursos desabilitados são bloqueados
- [ ] Criar dados no tenant do cliente
- [ ] Verificar que dados estão isolados (não aparecem em outros tenants)

---

## 🎉 PRONTO!

Agora você pode testar completamente o sistema de multi-tenancy:

1. ✅ Criar novos clientes
2. ✅ Controlar quais recursos cada cliente tem acesso
3. ✅ Acessar pelo domínio de cada cliente
4. ✅ Verificar que dados estão isolados

**Tudo funcionando!** 🚀
