# ✅ Implementação: Sistema de Controle de Recursos por Tenant

## 📋 Resumo

Sistema completo para controlar quais recursos (páginas/módulos) cada tenant pode acessar, implementado na administração do EasyBen.

---

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Estrutura de Banco de Dados**

#### Tabela `recursos_disponiveis`
- Armazena todos os recursos disponíveis no sistema
- Campos: `codigo`, `nome`, `descricao`, `categoria`, `rota_base`, `icone`, `ativo`, `ordem`
- Recursos pré-populados:
  - **Público**: Cotação Online, Proposta Digital
  - **Portal do Corretor**: Portal completo, Cadastro, Login
  - **Portal do Gestor**: Portal completo, Cadastro, Login
  - **Portal da Administradora**: Portal completo, Cadastro, Login
  - **Portal do Admin**: Portal completo, Login
  - **Portal do Analista**: Portal completo

#### Tabela `tenant_recursos`
- Relaciona tenants com recursos habilitados
- Campos: `tenant_id`, `recurso_id`, `habilitado`, `configuracoes` (JSONB)
- Permite configurações específicas por tenant

**Arquivo**: `scripts/WHITELABEL-06-criar-tabelas-recursos.sql`

---

### 2. **Serviço de Recursos**

**Arquivo**: `services/recursos-service.ts`

Funções implementadas:
- `listarRecursosDisponiveis()` - Lista todos os recursos do sistema
- `listarRecursosDoTenant(tenantId)` - Lista recursos de um tenant com status
- `tenantTemAcesso(tenantId, codigoRecurso)` - Verifica acesso a um recurso
- `atualizarRecursosTenant(tenantId, recursos)` - Atualiza recursos habilitados
- `agruparRecursosPorCategoria(recursos)` - Agrupa recursos por categoria

---

### 3. **API Routes**

#### `GET /api/admin/recursos`
Lista todos os recursos disponíveis

#### `GET /api/admin/recursos/tenant/[tenantId]`
Lista recursos de um tenant com status de habilitação

#### `PUT /api/admin/recursos/tenant/[tenantId]`
Atualiza recursos habilitados para um tenant

#### `GET /api/admin/recursos/verificar-acesso`
Verifica se um tenant tem acesso a um recurso específico

**Arquivos**:
- `app/api/admin/recursos/route.ts`
- `app/api/admin/recursos/tenant/[tenantId]/route.ts`
- `app/api/admin/recursos/verificar-acesso/route.ts`

---

### 4. **Interface no EasyBen Admin**

#### Componente de Seleção de Recursos
**Arquivo**: `components/super-admin/selecao-recursos.tsx`

Características:
- Lista todos os recursos disponíveis agrupados por categoria
- Checkboxes para habilitar/desabilitar recursos
- Exibe descrição, rota base e ícone de cada recurso
- Botão "Salvar Recursos" para persistir alterações
- Loading states e tratamento de erros

#### Modal de Edição de Tenant Atualizado
**Arquivo**: `components/super-admin/modal-editar-tenant.tsx`

Mudanças:
- Adicionado sistema de abas (Tabs)
- Aba "Dados da Plataforma" - Configurações existentes
- Aba "Recursos e Funcionalidades" - Seleção de recursos
- Integração com componente `SelecaoRecursos`

---

## 📝 PRÓXIMOS PASSOS (PENDENTES)

### 1. **Middleware de Verificação de Acesso** ⚠️

Implementar verificação de acesso nas rotas protegidas:

```typescript
// Exemplo de middleware
export async function verificarAcessoRecurso(
  tenantId: string,
  rota: string
): Promise<boolean> {
  // Buscar recurso pela rota_base
  // Verificar se tenant tem acesso
  // Retornar true/false
}
```

**Onde aplicar**:
- Middleware do Next.js (`middleware.ts`)
- Layouts de rotas protegidas
- Componentes de proteção de rota

### 2. **Integração nas Rotas Protegidas** ⚠️

Adicionar verificação de acesso em:
- `/corretor/*` - Verificar `portal_corretor`
- `/gestor/*` - Verificar `portal_gestor`
- `/administradora/*` - Verificar `portal_administradora`
- `/admin/*` - Verificar `portal_admin`
- `/analista/*` - Verificar `portal_analista`

**Estratégia**:
1. Criar hook `useTenantRecurso()` para verificar acesso
2. Criar componente `ProtectedRoute` que verifica acesso
3. Aplicar em layouts ou páginas específicas

---

## 🧪 COMO TESTAR

### 1. Executar Script SQL
```bash
# No Supabase SQL Editor ou via CLI
psql -f scripts/WHITELABEL-06-criar-tabelas-recursos.sql
```

### 2. Acessar EasyBen Admin
1. Fazer login como master/admin
2. Acessar `/admin/easyben/plataformas`
3. Clicar em "Editar" em uma plataforma
4. Ir para aba "Recursos e Funcionalidades"
5. Selecionar/deselecionar recursos
6. Clicar em "Salvar Recursos"

### 3. Verificar no Banco
```sql
-- Ver recursos disponíveis
SELECT * FROM recursos_disponiveis ORDER BY ordem;

-- Ver recursos de um tenant
SELECT 
  tr.habilitado,
  rd.nome,
  rd.codigo,
  rd.rota_base
FROM tenant_recursos tr
JOIN recursos_disponiveis rd ON tr.recurso_id = rd.id
WHERE tr.tenant_id = 'ID_DO_TENANT';
```

---

## 📊 ESTRUTURA DE DADOS

### Recursos Disponíveis (Exemplo)

| Código | Nome | Categoria | Rota Base |
|--------|------|-----------|-----------|
| `portal_corretor` | Portal do Corretor | portal | `/corretor` |
| `portal_administradora` | Portal da Administradora | portal | `/administradora` |
| `cotacao_online` | Cotação Online | publico | `/cotacao` |
| `proposta_digital` | Proposta Digital | publico | `/proposta-digital` |

### Relacionamento Tenant-Recursos

```
tenants (1) ──< (N) tenant_recursos (N) >── (1) recursos_disponiveis
```

---

## 🔒 SEGURANÇA

### Verificações Necessárias

1. **Backend**: Sempre verificar acesso no servidor (API routes)
2. **Frontend**: Verificar acesso antes de renderizar componentes
3. **RLS**: Considerar políticas RLS baseadas em recursos habilitados

### Boas Práticas

- ✅ Verificar acesso tanto no frontend quanto no backend
- ✅ Cachear verificações de acesso para performance
- ✅ Logs de tentativas de acesso negadas
- ✅ Mensagens de erro claras para usuários

---

## 📚 ARQUIVOS CRIADOS/MODIFICADOS

### Criados
- ✅ `scripts/WHITELABEL-06-criar-tabelas-recursos.sql`
- ✅ `services/recursos-service.ts`
- ✅ `app/api/admin/recursos/route.ts`
- ✅ `app/api/admin/recursos/tenant/[tenantId]/route.ts`
- ✅ `app/api/admin/recursos/verificar-acesso/route.ts`
- ✅ `components/super-admin/selecao-recursos.tsx`

### Modificados
- ✅ `components/super-admin/modal-editar-tenant.tsx`

---

## ✅ STATUS

- [x] Estrutura de banco de dados
- [x] Serviço de recursos
- [x] API routes
- [x] Interface no EasyBen Admin
- [ ] Middleware de verificação de acesso
- [ ] Integração nas rotas protegidas
- [ ] Testes end-to-end

---

**Data**: 2024
**Status**: Parcialmente implementado - Interface pronta, falta verificação de acesso


