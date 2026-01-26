# 🔍 Debug do Admin Sidebar

## 📋 Passos para Diagnosticar

### **1. Execute o Script SQL de Debug**

Execute `WHITELABEL-07-debug-permissoes.sql` no Supabase SQL Editor e verifique:

- ✅ Todos os usuários têm `total_permissoes > 0`
- ✅ O tipo de permissões é `array` (não `object` ou `null`)
- ✅ As policies RLS estão corretas
- ✅ RLS está habilitado

### **2. Verifique o Console do Navegador**

Abra o DevTools (F12) → Console e procure por:

#### **Ao carregar a página:**
```
🔄 usePermissions: Iniciando carregamento de permissões...
📦 localStorage 'admin_usuario': EXISTE ou NÃO EXISTE
```

#### **Se encontrar no localStorage:**
```
📋 Usuário parseado do localStorage: { id, email, perfil, permissoes }
🔐 Permissões carregadas: { permissoes: [...], totalPermissoes: X }
```

#### **Se não encontrar no localStorage:**
```
⚠️ Nenhum usuário encontrado no localStorage, buscando do banco...
🔍 Buscando dados do usuário por email: seu-email@exemplo.com
✅ Usuário encontrado do banco: { id, email, perfil, permissoes }
```

#### **No AdminSidebar:**
```
🔍 AdminSidebar - Verificando permissões: { isMaster, podeVisualizarDashboard, ... }
🔍 podeVisualizar chamado para: "dashboard" { isMaster, permissoes, ... }
```

### **3. Verifique o localStorage**

No console do navegador, execute:

```javascript
// Verificar se há usuário salvo
const usuario = localStorage.getItem("admin_usuario")
if (usuario) {
  const data = JSON.parse(usuario)
  console.log("Usuário no localStorage:", {
    email: data.email,
    perfil: data.perfil,
    permissoes: data.permissoes,
    tipoPermissoes: typeof data.permissoes,
    isArray: Array.isArray(data.permissoes),
    totalPermissoes: Array.isArray(data.permissoes) ? data.permissoes.length : 0,
  })
} else {
  console.log("❌ Nenhum usuário encontrado no localStorage")
}
```

### **4. Problemas Comuns e Soluções**

#### **Problema 1: `totalPermissoes: 0`**

**Causa**: Permissões vazias no banco ou não foram carregadas.

**Solução**:
1. Execute `WHITELABEL-06-garantir-permissoes-usuarios.sql` novamente
2. Verifique se o perfil do usuário está correto
3. Faça logout e login novamente

#### **Problema 2: `localStorage 'admin_usuario': NÃO EXISTE`**

**Causa**: O login não está salvando o usuário no localStorage.

**Solução**:
1. Verifique se o login está funcionando
2. Verifique se há erros no console durante o login
3. Verifique se a API `/api/admin/auth/user` está funcionando

#### **Problema 3: `isMaster: false` mas o perfil é "master"**

**Causa**: A verificação de master não está funcionando corretamente.

**Solução**:
1. Verifique se o perfil no banco está exatamente como "master" (case-sensitive)
2. Verifique os logs do console para ver o que está sendo comparado

#### **Problema 4: `permissoes: []` (array vazio)**

**Causa**: As permissões não foram carregadas ou estão vazias.

**Solução**:
1. Execute `WHITELABEL-06-garantir-permissoes-usuarios.sql`
2. Verifique se as permissões foram atualizadas no banco
3. Faça logout e login novamente

#### **Problema 5: `podeVisualizar` sempre retorna `false`**

**Causa**: As permissões não estão sendo comparadas corretamente.

**Solução**:
1. Verifique os logs do console para ver quais permissões estão sendo verificadas
2. Verifique se o nome do recurso corresponde ao nome da permissão
3. Verifique se há problemas de normalização (hífens vs underscores)

---

## 🧪 Teste Manual

### **Teste 1: Verificar Permissões no Banco**

```sql
SELECT 
    email,
    perfil,
    permissoes,
    jsonb_array_length(permissoes) as total
FROM usuarios_admin
WHERE email = 'seu-email@exemplo.com';
```

**Resultado esperado**: `total > 0` e `permissoes` é um array JSONB.

### **Teste 2: Verificar localStorage**

No console do navegador:

```javascript
const usuario = JSON.parse(localStorage.getItem("admin_usuario") || "{}")
console.log("Perfil:", usuario.perfil)
console.log("Permissões:", usuario.permissoes)
console.log("Total:", Array.isArray(usuario.permissoes) ? usuario.permissoes.length : 0)
```

**Resultado esperado**: Perfil definido, permissões como array, total > 0.

### **Teste 3: Verificar Hook usePermissions**

No console do navegador, após carregar a página:

```javascript
// O hook deve ter logado as informações
// Procure por: "🔐 Permissões carregadas"
```

**Resultado esperado**: Logs mostrando permissões carregadas.

---

## 📝 Informações para Enviar

Se ainda não funcionar, me envie:

1. **Resultado do script SQL de debug** (`WHITELABEL-07-debug-permissoes.sql`)
2. **Logs do console do navegador** (copie todos os logs relacionados a permissões)
3. **Resultado do teste de localStorage** (execute o código acima)
4. **Qual perfil você está usando** para login
5. **Screenshot do sidebar** (se possível)

---

**Execute o script SQL de debug e me envie os resultados!** 🔍

