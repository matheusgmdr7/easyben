# Scripts Não Executados

## ⚠️ IMPORTANTE: Scripts que ainda NÃO foram executados em produção

Este arquivo registra scripts SQL que foram criados mas ainda não foram executados no ambiente de produção para evitar problemas com funções que estão rodando.

---

## Scripts Pendentes

### WHITELABEL-21-criar-sistema-gestao-equipes.sql
- **Status**: ❌ NÃO EXECUTADO
- **Data de Criação**: Durante desenvolvimento do Portal do Gestor
- **Motivo**: Evitar problemas com funções que estão rodando no ambiente de produção
- **Descrição**: 
  - Adiciona campos `gestor_id`, `is_gestor` e `link_cadastro_equipe` na tabela `corretores`
  - Cria função `gerar_link_cadastro_equipe` para gerar links únicos de cadastro
  - Cria índices para performance
- **Impacto**: 
  - Necessário para o funcionamento completo do Portal do Gestor
  - Permite que corretores sejam vinculados a gestores
  - Permite que gestores gerem links de cadastro para suas equipes
- **Quando Executar**: 
  - Após testar todas as funcionalidades do Portal do Gestor em ambiente de desenvolvimento
  - Quando estiver pronto para ativar o sistema de gestão de equipes em produção
  - Fazer backup antes de executar

---

## Scripts Executados

### WHITELABEL-19-desabilitar-rls-temporariamente.sql
- **Status**: ✅ EXECUTADO
- **Descrição**: Desabilita RLS em `corretores` e `usuarios_admin` para restaurar funcionamento

### WHITELABEL-20-desabilitar-rls-todas-tabelas-corretor.sql
- **Status**: ✅ EXECUTADO
- **Descrição**: Desabilita RLS em todas as tabelas acessadas pelo dashboard do corretor

### WHITELABEL-24-desabilitar-rls-propostas-temporariamente.sql
- **Status**: ⏳ PENDENTE DE EXECUÇÃO (criado recentemente)
- **Descrição**: Desabilita RLS em tabelas de propostas para permitir envio por corretores

---

## Notas Importantes

- Sempre fazer backup antes de executar scripts em produção
- Testar scripts primeiro em ambiente de desenvolvimento
- Verificar se há dependências entre scripts
- Documentar data de execução após aplicar em produção

