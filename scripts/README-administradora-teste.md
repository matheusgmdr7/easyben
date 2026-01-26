# Criar Administradora de Teste

Este guia explica como criar uma credencial de teste para acessar o portal da administradora de benefícios.

## Credenciais de Teste

- **Email**: `teste@administradora.com`
- **Senha**: `teste123`
- **URL**: `/administradora/login`

## Métodos para Criar

### Método 1: Via API Route (Recomendado)

Execute uma requisição POST para criar/atualizar a administradora de teste:

```bash
curl -X POST http://localhost:3000/api/admin/criar-administradora-teste
```

Ou acesse diretamente no navegador após iniciar o servidor:
- URL: `http://localhost:3000/api/admin/criar-administradora-teste`
- Método: POST

### Método 2: Via Script Node.js

1. Certifique-se de ter as variáveis de ambiente configuradas no `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
   ```

2. Execute o script:
   ```bash
   node scripts/criar-administradora-teste.js
   ```

### Método 3: Via SQL (Manual)

1. Execute o script SQL `scripts/criar-administradora-teste-completo.sql` no Supabase SQL Editor
2. Depois execute o script Node.js para atualizar o hash da senha:
   ```bash
   node scripts/criar-administradora-teste.js
   ```

## Observações Importantes

- A administradora será criada com `status = 'ativa'` e `status_login = 'ativo'`
- Se já existir uma administradora com o email `teste@administradora.com`, ela será atualizada
- O script busca automaticamente um `tenant_id` ativo no sistema
- O hash da senha é gerado usando bcrypt com salt rounds = 10

## Futuro: Cadastro via EasyBen

No futuro, o cadastro de administradoras de benefícios e suas credenciais será feito através da página de administração da EasyBen (`/admin/easyben`), que será o "cérebro" do sistema.







