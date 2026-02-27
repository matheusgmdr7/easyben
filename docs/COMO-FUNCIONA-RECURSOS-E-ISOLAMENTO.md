# 🎯 Como Funciona: Recursos vs Isolamento de Dados

## 📋 DOIS SISTEMAS DIFERENTES

O sistema tem **DOIS mecanismos separados** que trabalham juntos:

### 1. **Sistema de Recursos** (O que você habilita no modal)
- **Controla**: Quais **portais/páginas** o tenant pode **ACESSAR**
- **Exemplo**: Portal do Corretor, Portal do Gestor, Portal da Administradora

### 2. **Sistema de Isolamento de Dados** (tenant_id + RLS)
- **Controla**: Como os **dados são salvos e separados** entre tenants
- **Garante**: Cada tenant vê apenas seus próprios dados

---

## 🔄 COMO FUNCIONA NA PRÁTICA

### Cenário: Você cadastra um novo cliente (tenant)

#### 1. **Cadastro do Tenant**
```
Nome: "Empresa ABC"
Slug: "empresa-abc"
Domínio: "empresaabc.com.br" (ou subdomínio: empresaabc.seudominio.com.br)
```

#### 2. **Habilitação de Recursos** (No EasyBen Admin)
Você escolhe quais recursos o tenant terá acesso:
- ✅ Portal do Corretor
- ✅ Portal do Gestor
- ❌ Portal da Administradora (desabilitado)
- ✅ Portal do Admin
- ❌ Portal do Analista (desabilitado)

**O que acontece**:
- Sistema salva na tabela `tenant_recursos`:
  ```sql
  INSERT INTO tenant_recursos (tenant_id, recurso_id, habilitado)
  VALUES 
    ('uuid-empresa-abc', 'uuid-portal-corretor', true),
    ('uuid-empresa-abc', 'uuid-portal-gestor', true),
    ('uuid-empresa-abc', 'uuid-portal-admin', true)
  ```

#### 3. **Acesso através do Domínio**

**Opção A: Domínio Personalizado**
```
https://empresaabc.com.br/corretor/dashboard
```

**Opção B: Subdomínio**
```
https://empresaabc.seudominio.com.br/corretor/dashboard
```

**O que acontece**:
1. Middleware detecta o domínio/subdomínio
2. Busca o tenant correspondente no banco
3. Define o `tenant_id` no contexto da sessão
4. Usuário acessa através do domínio dele

---

## 🔐 ISOLAMENTO DE DADOS (Como os dados são separados)

### Como funciona:

#### **1. Detecção Automática do Tenant**

Quando um usuário acessa através do domínio do tenant:

```typescript
// Middleware detecta automaticamente
Domínio: "empresaabc.com.br"
  ↓
Busca tenant no banco
  ↓
Tenant encontrado: { id: "uuid-empresa-abc", slug: "empresa-abc" }
  ↓
Define contexto: tenant_id = "uuid-empresa-abc"
```

#### **2. Salvamento Automático com tenant_id**

Quando o tenant salva dados (corretor, proposta, cliente, etc.):

```typescript
// Exemplo: Criar um corretor
const corretor = {
  nome: "João Silva",
  email: "joao@email.com",
  // ... outros campos
}

// Sistema automaticamente adiciona:
{
  ...corretor,
  tenant_id: "uuid-empresa-abc"  // ← Adicionado automaticamente!
}
```

**Código que faz isso**:
```typescript
// services/corretores-service.ts
const tenantId = await getCurrentTenantId() // Obtém do contexto

await supabase
  .from("corretores")
  .insert({
    ...corretor,
    tenant_id: tenantId  // ← Sempre adicionado automaticamente
  })
```

#### **3. Busca Automática Filtrada por tenant_id**

Quando o tenant busca dados:

```typescript
// Tenant "Empresa ABC" busca corretores
const corretores = await supabase
  .from("corretores")
  .select("*")

// Sistema automaticamente filtra:
// SELECT * FROM corretores 
// WHERE tenant_id = 'uuid-empresa-abc'  ← Filtro automático!
```

**Resultado**: Tenant só vê seus próprios corretores!

---

## 🛡️ RLS (Row Level Security) - Camada Extra de Segurança

### O que é RLS?

RLS é uma política de segurança do PostgreSQL que **garante isolamento no banco de dados**, mesmo se alguém tentar acessar diretamente.

### Como funciona:

```sql
-- Policy criada automaticamente para cada tabela
CREATE POLICY "tenant_isolation_corretores"
ON corretores
FOR ALL
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());
```

**O que isso faz**:
- **SELECT**: Só retorna registros onde `tenant_id` = tenant atual
- **INSERT**: Só permite inserir com `tenant_id` = tenant atual
- **UPDATE**: Só permite atualizar registros do tenant atual
- **DELETE**: Só permite deletar registros do tenant atual

### Exemplo Prático:

**Tenant A** (Empresa ABC):
```sql
SELECT * FROM corretores;
-- Retorna apenas corretores com tenant_id = 'uuid-empresa-abc'
```

**Tenant B** (Empresa XYZ):
```sql
SELECT * FROM corretores;
-- Retorna apenas corretores com tenant_id = 'uuid-empresa-xyz'
```

**Mesmo que alguém tente**:
```sql
SELECT * FROM corretores WHERE tenant_id = 'uuid-empresa-abc';
-- RLS bloqueia se você não for do tenant correto!
```

---

## 📊 RESUMO: O QUE CADA SISTEMA FAZ

| Sistema | O que Controla | Onde é Aplicado |
|---------|----------------|-----------------|
| **Recursos** | Quais portais/páginas o tenant pode **ACESSAR** | Layouts das rotas (`/corretor/*`, `/gestor/*`, etc.) |
| **tenant_id** | Como os dados são **SALVOS** e **SEPARADOS** | Todas as tabelas (corretores, propostas, clientes, etc.) |
| **RLS** | **SEGURANÇA** - Garante isolamento no banco | Políticas do PostgreSQL em todas as tabelas |

---

## 🎯 RESPOSTA DIRETA ÀS SUAS PERGUNTAS

### 1. "Quando eu cadastrar um cliente, ele terá acesso a todos os recursos através do meu domínio ou do dele?"

**Resposta**:
- ✅ Ele acessa através do **domínio dele** (ou subdomínio)
- ❌ **NÃO** terá acesso a todos os recursos automaticamente
- ✅ Você escolhe quais recursos ele terá acesso no EasyBen Admin
- ✅ Se você desabilitar "Portal do Corretor", ele **NÃO conseguirá** acessar `/corretor/*`

**Exemplo**:
```
Cliente: Empresa ABC
Domínio: empresaabc.com.br

Recursos habilitados:
- ✅ Portal do Corretor → Pode acessar empresaabc.com.br/corretor/*
- ✅ Portal do Gestor → Pode acessar empresaabc.com.br/gestor/*
- ❌ Portal da Administradora → NÃO pode acessar empresaabc.com.br/administradora/*

Se tentar acessar empresaabc.com.br/administradora/dashboard:
→ Sistema bloqueia e mostra mensagem "Recurso não habilitado"
```

### 2. "As páginas e recursos virão prontos para salvar os dados dos meus clientes separadamente sem misturar?"

**Resposta**:
- ✅ **SIM!** Os dados são salvos separadamente automaticamente
- ✅ Cada tenant tem seu próprio `tenant_id`
- ✅ Sistema adiciona `tenant_id` automaticamente em todos os INSERTs
- ✅ Sistema filtra automaticamente em todos os SELECTs
- ✅ RLS garante isolamento no banco de dados

**Exemplo Prático**:

**Tenant A (Empresa ABC)** cria um corretor:
```typescript
// Sistema automaticamente adiciona tenant_id
{
  nome: "João Silva",
  email: "joao@email.com",
  tenant_id: "uuid-empresa-abc"  // ← Adicionado automaticamente!
}
```

**Tenant B (Empresa XYZ)** cria um corretor:
```typescript
{
  nome: "Maria Santos",
  email: "maria@email.com",
  tenant_id: "uuid-empresa-xyz"  // ← tenant_id diferente!
}
```

**Resultado no banco**:
```sql
-- Tabela corretores
| id | nome | email | tenant_id |
|----|------|-------|-----------|
| 1  | João Silva | joao@email.com | uuid-empresa-abc |
| 2  | Maria Santos | maria@email.com | uuid-empresa-xyz |
```

**Quando cada tenant busca**:
- Tenant A acessa `empresaabc.com.br/corretor/dashboard`:
  - Vê apenas: João Silva (tenant_id = uuid-empresa-abc)
  
- Tenant B acessa `empresaxyz.com.br/corretor/dashboard`:
  - Vê apenas: Maria Santos (tenant_id = uuid-empresa-xyz)

**Nunca se misturam!** 🎯

---

## 🔄 FLUXO COMPLETO: Do Cadastro ao Uso

### Passo 1: Você cadastra um novo tenant
```
EasyBen Admin → Criar Plataforma
  Nome: "Empresa ABC"
  Slug: "empresa-abc"
  Domínio: "empresaabc.com.br"
```

### Passo 2: Você habilita recursos
```
EasyBen Admin → Editar Plataforma → Aba "Recursos"
  ✅ Portal do Corretor
  ✅ Portal do Gestor
  ❌ Portal da Administradora
```

### Passo 3: Cliente acessa pelo domínio dele
```
https://empresaabc.com.br/corretor/login
```

### Passo 4: Sistema verifica recursos
```
1. Middleware detecta: domínio = "empresaabc.com.br"
2. Busca tenant: { id: "uuid-abc", slug: "empresa-abc" }
3. Verifica recursos: tenant tem "portal_corretor" habilitado?
   ✅ SIM → Permite acesso
   ❌ NÃO → Bloqueia e mostra erro
```

### Passo 5: Cliente usa o sistema
```
Cliente cria corretor:
  Nome: "João Silva"
  Email: "joao@email.com"

Sistema salva:
  {
    nome: "João Silva",
    email: "joao@email.com",
    tenant_id: "uuid-abc"  // ← Adicionado automaticamente!
  }
```

### Passo 6: Cliente vê apenas seus dados
```
Cliente busca corretores:
  SELECT * FROM corretores

Sistema filtra automaticamente:
  SELECT * FROM corretores 
  WHERE tenant_id = 'uuid-abc'  // ← Filtro automático!

Resultado: Apenas corretores do Tenant "Empresa ABC"
```

---

## ✅ CONCLUSÃO

### Sistema de Recursos:
- **Controla acesso** às páginas/portais
- **Você escolhe** quais recursos cada tenant terá
- **Bloqueia acesso** se o recurso não estiver habilitado

### Sistema de Isolamento (tenant_id + RLS):
- **Separa dados automaticamente**
- **Cada tenant vê apenas seus dados**
- **Nunca se misturam**
- **Funciona em todas as tabelas**

### Resumo Final:
1. ✅ Cliente acessa pelo **domínio dele**
2. ✅ Você escolhe quais **recursos** ele terá acesso
3. ✅ Dados são salvos **separadamente** automaticamente
4. ✅ Cada tenant vê apenas **seus próprios dados**
5. ✅ **Nunca se misturam** (protegido por RLS)

**Tudo funciona automaticamente!** 🚀
