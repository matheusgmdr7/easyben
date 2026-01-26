# 🚀 Deploy - Importar Todas as Cobranças do Asaas

## 📋 Arquivos Modificados

Apenas **1 arquivo** foi modificado para esta funcionalidade:

- `app/api/importar-asaas/route.ts`

## ✅ Passos para Deploy

### 1. Verificar o arquivo modificado

```bash
git status app/api/importar-asaas/route.ts
```

### 2. Adicionar apenas este arquivo ao staging

```bash
git add app/api/importar-asaas/route.ts
```

### 3. Fazer commit apenas deste arquivo

```bash
git commit -m "feat: adicionar importação de todas as cobranças do Asaas sem filtro de cliente"
```

### 4. Fazer push para o repositório

```bash
git push origin main
```

(ou `git push origin master` dependendo da sua branch principal)

### 5. Aguardar o deploy automático

Se você tem CI/CD configurado, o deploy será automático. Caso contrário, faça o deploy manualmente.

## 🔍 Verificação

Após o deploy, você pode verificar se funcionou:

1. Execute o script no console do navegador
2. Verifique se o resultado retorna `sucesso: true` e `total_cobrancas_encontradas`
3. Se ainda retornar `clientes_importados`, o deploy ainda não foi aplicado

## 📝 Nota

Este deploy **não afeta** outras funcionalidades em desenvolvimento, pois modifica apenas a rota `/api/importar-asaas` adicionando uma nova função opcional que só é executada quando o parâmetro `importar_todas_cobrancas: true` é enviado.







