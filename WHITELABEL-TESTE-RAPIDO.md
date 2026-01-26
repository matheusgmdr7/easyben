# 🧪 Teste Rápido - Admin Sidebar

## 📋 Execute Estes Testes no Console do Navegador

### **1. Verificar localStorage**

Abra o DevTools (F12) → Console e execute:

```javascript
// Verificar se há usuário salvo
const usuario = localStorage.getItem("admin_usuario")
if (usuario) {
  const data = JSON.parse(usuario)
  console.log("=== DADOS DO USUÁRIO NO LOCALSTORAGE ===")
  console.log("Email:", data.email)
  console.log("Perfil:", data.perfil)
  console.log("Permissões:", data.permissoes)
  console.log("Tipo de Permissões:", typeof data.permissoes)
  console.log("É Array?", Array.isArray(data.permissoes))
  console.log("Total de Permissões:", Array.isArray(data.permissoes) ? data.permissoes.length : 0)
  console.log("Permissões (detalhado):", JSON.stringify(data.permissoes, null, 2))
} else {
  console.log("❌ Nenhum usuário encontrado no localStorage")
  console.log("⚠️ Faça login novamente")
}
```

### **2. Verificar se a API está funcionando**

```javascript
// Testar a API diretamente (substitua pelo seu email)
const email = "seu-email@exemplo.com" // SUBSTITUA PELO SEU EMAIL

fetch("/api/admin/auth/user", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email }),
})
  .then(res => res.json())
  .then(data => {
    console.log("=== RESPOSTA DA API ===")
    console.log("Sucesso:", data.success)
    if (data.usuario) {
      console.log("Email:", data.usuario.email)
      console.log("Perfil:", data.usuario.perfil)
      console.log("Permissões:", data.usuario.permissoes)
      console.log("Tipo:", typeof data.usuario.permissoes)
      console.log("É Array?", Array.isArray(data.usuario.permissoes))
      console.log("Total:", Array.isArray(data.usuario.permissoes) ? data.usuario.permissoes.length : 0)
    } else {
      console.log("❌ Usuário não encontrado na resposta")
    }
  })
  .catch(err => {
    console.error("❌ Erro na API:", err)
  })
```

### **3. Verificar Permissões no Banco (SQL)**

Execute no Supabase SQL Editor:

```sql
-- Substitua pelo seu email
SELECT 
    email,
    perfil,
    permissoes,
    jsonb_typeof(permissoes) as tipo,
    CASE 
        WHEN jsonb_typeof(permissoes) = 'array' 
        THEN jsonb_array_length(permissoes)
        ELSE 0
    END as total
FROM usuarios_admin
WHERE email = 'seu-email@exemplo.com' -- SUBSTITUA PELO SEU EMAIL
  AND ativo = true;
```

### **4. Forçar Recarregamento das Permissões**

```javascript
// Limpar e recarregar
localStorage.removeItem("admin_usuario")
console.log("🧹 localStorage limpo")
console.log("🔄 Recarregue a página e faça login novamente")
```

---

## 📝 Envie os Resultados

Envie:
1. ✅ Resultado do teste 1 (localStorage)
2. ✅ Resultado do teste 2 (API)
3. ✅ Resultado do teste 3 (SQL)
4. ✅ Logs do console relacionados a permissões (procure por "🔐", "📦", "🔄")

---

## 🔍 O Que Procurar

### **Problema 1: Permissões vazias no localStorage**
- **Sintoma**: `Total de Permissões: 0`
- **Causa**: API não está retornando permissões ou estão vazias no banco
- **Solução**: Execute `WHITELABEL-06-garantir-permissoes-usuarios.sql` novamente

### **Problema 2: Permissões não são array**
- **Sintoma**: `É Array? false` ou `Tipo: object`
- **Causa**: Permissões estão em formato incorreto no banco
- **Solução**: Execute `WHITELABEL-06-garantir-permissoes-usuarios.sql` novamente

### **Problema 3: API não retorna permissões**
- **Sintoma**: `Permissões: undefined` na resposta da API
- **Causa**: API não está buscando permissões corretamente
- **Solução**: Verificar se a API está usando `supabaseAdmin` e se RLS está correto

### **Problema 4: Permissões no banco estão corretas, mas não aparecem**
- **Sintoma**: SQL mostra permissões, mas localStorage não
- **Causa**: API não está retornando ou login não está salvando
- **Solução**: Verificar logs do `signInAdmin` e da API

---

**Execute os testes e me envie os resultados!** 🔍

