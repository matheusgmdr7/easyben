# 🔍 Diagnóstico: Tabela de Usuários Admin

## 📋 Problema Reportado

Os logs do console indicam que o sistema está "buscando em admin_usuario, mas a tabela correta é usuarios_admin".

## ✅ Verificações Realizadas

### 1. Código TypeScript/JavaScript
- ✅ **API Route** (`app/api/admin/auth/user/route.ts`): Usa `usuarios_admin` corretamente
- ✅ **Serviço** (`services/usuarios-admin-service.ts`): Usa `usuarios_admin` corretamente
- ✅ **Hook de Permissões** (`hooks/use-permissions.tsx`): Usa `usuarios_admin` via API
- ✅ **Autenticação** (`lib/supabase-auth.ts`): Usa `usuarios_admin` via API

**Resultado**: Não há referências a uma tabela chamada `admin_usuario` no código.

### 2. Logs Adicionados

Foram adicionados logs explícitos em:
- `app/api/admin/auth/user/route.ts`: Log confirma que consulta `usuarios_admin`
- `services/usuarios-admin-service.ts`: Logs em `buscarPorEmail` e `validarSenhaUsuarioAdmin`

## 🔧 Próximos Passos

### Passo 1: Executar Script de Diagnóstico SQL

Execute o script `scripts/WHITELABEL-08-diagnostico-tabela-usuarios.sql` no Supabase SQL Editor para verificar:

1. Se existe uma tabela incorreta chamada `admin_usuario`
2. Se há views, funções ou triggers usando o nome incorreto
3. Se há RLS policies na tabela incorreta
4. A estrutura e dados da tabela `usuarios_admin`

### Passo 2: Verificar Logs do Console

Após fazer login, verifique os logs do console do navegador. Você deve ver:

```
🔍 API Route /api/admin/auth/user - POST recebido
📋 TABELA CONSULTADA: usuarios_admin (CORRETO)
📋 Email buscado: seu-email@exemplo.com
```

Se você ainda ver mensagens sobre `admin_usuario`, isso pode indicar:

1. **Erro do Supabase**: A mensagem de erro do Supabase pode estar confundindo o nome da tabela
2. **View ou Função no Banco**: Pode haver uma view ou função SQL que está usando o nome incorreto
3. **Cache do Navegador**: O navegador pode estar usando código antigo em cache

### Passo 3: Limpar Cache e Testar

1. Limpe o cache do navegador (Ctrl+Shift+Del ou Cmd+Shift+Del)
2. Faça hard refresh (Ctrl+F5 ou Cmd+Shift+R)
3. Faça logout e login novamente
4. Verifique os logs do console

### Passo 4: Verificar Erros do Supabase

Se o problema persistir, verifique:

1. **Logs do Supabase Dashboard**: Vá em "Logs" → "Postgres Logs" e procure por erros relacionados a `admin_usuario`
2. **RLS Policies**: Verifique se há policies na tabela `admin_usuario` (incorreta) que devem estar em `usuarios_admin`

## 📊 Script SQL de Diagnóstico

O script `WHITELABEL-08-diagnostico-tabela-usuarios.sql` verifica:

- ✅ Existência da tabela `usuarios_admin` (deve existir)
- ❌ Existência da tabela `admin_usuario` (NÃO deve existir)
- Views que referenciam essas tabelas
- Funções que referenciam essas tabelas
- Triggers que referenciam essas tabelas
- RLS policies nas tabelas
- Estrutura e dados da tabela `usuarios_admin`

## 🎯 Possíveis Causas

### 1. Mensagem de Erro Confusa
O Supabase pode estar retornando uma mensagem de erro que menciona `admin_usuario` como parte de uma mensagem genérica, mas o código está consultando `usuarios_admin` corretamente.

### 2. View ou Função no Banco
Pode haver uma view ou função SQL criada anteriormente que está usando o nome incorreto da tabela.

### 3. Cache do Navegador
O navegador pode estar usando uma versão antiga do código JavaScript que ainda referencia o nome incorreto.

## ✅ Solução Esperada

Após executar o script de diagnóstico:

1. Se não houver tabela `admin_usuario`: ✅ Tudo certo, o problema pode ser apenas uma mensagem de erro confusa
2. Se houver tabela `admin_usuario`: ❌ Deve ser removida ou renomeada
3. Se houver views/funções usando `admin_usuario`: ❌ Devem ser atualizadas para usar `usuarios_admin`

## 📝 Logs Esperados

Após as correções, você deve ver nos logs:

```
🔍 API Route /api/admin/auth/user - POST recebido
📋 TABELA CONSULTADA: usuarios_admin (CORRETO)
📋 Email buscado: seu-email@exemplo.com
🔍 Executando query no Supabase...
📊 Resultado da query: { usuarioEncontrado: true, ... }
✅ API Route - Usuário encontrado: { id: "...", email: "...", perfil: "..." }
```

## 🚨 Se o Problema Persistir

Se após executar o script de diagnóstico e limpar o cache o problema ainda persistir:

1. Compartilhe os resultados do script SQL de diagnóstico
2. Compartilhe os logs completos do console do navegador
3. Compartilhe os logs do Supabase Dashboard (se disponíveis)

Isso ajudará a identificar a causa raiz do problema.

