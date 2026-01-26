# 🔍 Guia de Debug - Sistema de Permissões

## Problema Reportado
O hook `usePermissions` não está exibindo logs no console do navegador, mesmo após o login.

## Logs Esperados

Quando o hook está funcionando corretamente, você deve ver os seguintes logs no console:

### 1. Logs de Renderização do Componente
```
🟡 AdminSidebar: Antes de chamar usePermissions
🟡 AdminSidebar: Após chamar usePermissions { isMaster: false, podeVisualizar: "function" }
```

### 2. Logs do Hook usePermissions
```
🔵 usePermissions: Hook foi chamado/inicializado { timestamp: "...", stackTrace: "..." }
🟢 usePermissions: useEffect executado { timestamp: "..." }
🚀 usePermissions: Iniciando carregamento de permissões...
🔐 Verificando sessão do Supabase...
✅ Sessão encontrada: email@exemplo.com
🔄 Buscando dados atualizados do usuário no banco: email@exemplo.com
📦 Dados brutos do usuário do banco: { email: "...", perfil: "...", ... }
✅ Permissões carregadas e salvas: { email: "...", perfil: "...", permissoes: [...], ... }
```

### 3. Logs de Verificação de Permissões
Quando você navegar pelos itens do menu, verá:
```
🔍 Verificando permissão para "modelos_propostas": { isMaster: false, permissoesCount: 2, permissoes: [...] }
✅ Acesso permitido para: "modelos_propostas"
```

## Passos para Debug

### 1. Limpar Cache do Navegador
- **Chrome/Edge**: `Cmd + Shift + Delete` (Mac) ou `Ctrl + Shift + Delete` (Windows)
- Ou use: `Cmd + Shift + R` / `Ctrl + Shift + R` para forçar recarregamento

### 2. Verificar Terminal do Next.js
Certifique-se de que não há erros de compilação. Procure por:
- ❌ Erros de sintaxe
- ❌ Erros de importação
- ❌ Warnings sobre módulos não encontrados

### 3. Fazer Login e Navegar para `/admin`
Após fazer login:
1. Vá para `/admin` (página principal do admin)
2. Abra o Console do navegador (F12 → aba Console)
3. Verifique se os logs aparecem

### 4. Verificar se o Componente está Sendo Renderizado
Se você NÃO vê os logs do `AdminSidebar` (🟡), isso indica que:
- O componente não está sendo renderizado
- Há um erro que impede a execução
- O layout não está sendo usado

### 5. Verificar se o Hook está Sendo Chamado
Se você vê os logs do `AdminSidebar` mas NÃO vê os logs do hook (🔵 🟢), isso indica:
- Erro na importação do hook
- Erro silencioso na execução
- Problema de compilação

### 6. Verificar Sessão do Supabase
Se o hook está sendo chamado mas não carrega permissões, verifique:
- Se há sessão ativa no Supabase Auth
- Se o email do usuário está correto
- Se o usuário existe na tabela `usuarios_admin`

## Comandos Úteis no Console do Navegador

Execute estes comandos no console para verificar o estado:

```javascript
// Verificar sessão do Supabase
import { supabase } from '@/lib/supabase-auth'
const { data: { session } } = await supabase.auth.getSession()
console.log("Sessão:", session)

// Verificar localStorage
console.log("Usuario no localStorage:", JSON.parse(localStorage.getItem("admin_usuario") || "null"))

// Verificar se o hook está importado corretamente
console.log("Hook disponível:", typeof usePermissions)
```

## Possíveis Problemas e Soluções

### Problema 1: Nenhum log aparece
**Causa**: Cache do navegador ou erro de compilação
**Solução**: 
- Limpar cache e recarregar
- Verificar terminal do Next.js
- Parar e reiniciar o servidor de desenvolvimento

### Problema 2: Logs do AdminSidebar aparecem, mas não do hook
**Causa**: Erro na importação ou execução do hook
**Solução**:
- Verificar se `hooks/use-permissions.tsx` está correto
- Verificar se há erros de TypeScript
- Verificar console para erros de runtime

### Problema 3: Hook é chamado mas não carrega permissões
**Causa**: Problema com sessão do Supabase ou banco de dados
**Solução**:
- Verificar se o login foi bem-sucedido
- Verificar se o usuário existe na tabela `usuarios_admin`
- Verificar logs de erro no console

## Informações para Compartilhar

Se o problema persistir, compartilhe:

1. **Todos os logs do console** que começam com:
   - 🟡 AdminSidebar
   - 🔵 usePermissions
   - 🟢 usePermissions
   - ❌ (qualquer erro)

2. **Logs do terminal do Next.js** (quaisquer erros ou warnings)

3. **Resultado dos comandos de verificação** no console do navegador

4. **Screenshot do console** (se possível)
