# 🔒 Guia Completo de Backup - Antes de Iniciar White-Label

## ⚠️ ATENÇÃO CRÍTICA

Antes de executar **QUALQUER** script de migração, você **DEVE** fazer backup completo de:

1. ✅ **Banco de Dados** (CRÍTICO - mais importante!)
   - ✅ **Backup automático do Supabase**: Se você já tem backups diários, isso é ótimo!
   - ⚠️ **Recomendado**: Fazer um backup manual adicional antes da migração (mais seguro)
2. ✅ **Variáveis de Ambiente**
3. ✅ **Storage/Files** (Supabase Storage)
4. ✅ **Configurações do Supabase**

### 📌 Se você já tem backup automático diário:

✅ **Você pode prosseguir**, mas ainda é recomendado:
- Anotar a data/hora do último backup automático
- Fazer um backup manual adicional (opcional, mas mais seguro)
- Ou pelo menos verificar que o backup automático está funcionando

---

## 📊 1. BACKUP DO BANCO DE DADOS (PRIORIDADE MÁXIMA)

### Opção A: Via Supabase Dashboard (Recomendado)

**Se você já tem backup automático diário:**
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** → **Database**
4. Role até **Database Backups**
5. **Verifique** que há backups recentes (últimas 24h)
6. **Anote a data/hora do último backup automático**
7. (Opcional) Clique em **Create Backup** para criar um backup manual adicional

**✅ Se os backups automáticos estão funcionando, você pode prosseguir!**

### Opção B: Via SQL (Backup Manual Completo)

Execute no **Supabase SQL Editor**:

```sql
-- ============================================
-- BACKUP COMPLETO DO BANCO DE DADOS
-- ============================================
-- Este script cria uma cópia de todas as tabelas importantes
-- Execute ANTES de qualquer migração
-- ============================================

BEGIN;

-- Criar schema de backup
CREATE SCHEMA IF NOT EXISTS backup_pre_whitelabel;

-- Função para criar backup de tabela
CREATE OR REPLACE FUNCTION backup_table(table_name TEXT, schema_name TEXT DEFAULT 'public')
RETURNS void AS $$
DECLARE
    backup_table_name TEXT;
BEGIN
    backup_table_name := 'backup_pre_whitelabel.' || table_name || '_' || to_char(now(), 'YYYYMMDD_HH24MISS');
    
    EXECUTE format('CREATE TABLE %I AS SELECT * FROM %I.%I', 
        backup_table_name, schema_name, table_name);
    
    RAISE NOTICE '✅ Backup criado: %', backup_table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BACKUP DAS TABELAS PRINCIPAIS
-- ============================================

-- Propostas (CRÍTICO)
SELECT backup_table('propostas');

-- Corretores (CRÍTICO)
SELECT backup_table('corretores');

-- Produtos (CRÍTICO)
SELECT backup_table('produtos_corretores');

-- Tabelas de Preços (CRÍTICO)
SELECT backup_table('tabelas_precos');
SELECT backup_table('tabelas_precos_faixas');

-- Administradoras (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras') THEN
        PERFORM backup_table('administradoras');
    END IF;
END $$;

-- Clientes Administradoras (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes_administradoras') THEN
        PERFORM backup_table('clientes_administradoras');
    END IF;
END $$;

-- Faturas (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faturas') THEN
        PERFORM backup_table('faturas');
    END IF;
END $$;

-- Comissões (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comissoes') THEN
        PERFORM backup_table('comissoes');
    END IF;
END $$;

-- Usuários Admin (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios_admin') THEN
        PERFORM backup_table('usuarios_admin');
    END IF;
END $$;

-- Leads (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        PERFORM backup_table('leads');
    END IF;
END $$;

-- Dependentes (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dependentes') THEN
        PERFORM backup_table('dependentes');
    END IF;
END $$;

-- Questionário (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questionario_respostas') THEN
        PERFORM backup_table('questionario_respostas');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'respostas_questionario') THEN
        PERFORM backup_table('respostas_questionario');
    END IF;
END $$;

-- Documentos (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos') THEN
        PERFORM backup_table('documentos');
    END IF;
END $$;

-- Relações Produto-Tabela (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'produto_tabela_relacao') THEN
        PERFORM backup_table('produto_tabela_relacao');
    END IF;
END $$;

-- Configurações Financeiras (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'administradoras_config_financeira') THEN
        PERFORM backup_table('administradoras_config_financeira');
    END IF;
END $$;

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO DO BACKUP
-- ============================================
-- Execute para verificar todas as tabelas de backup criadas:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
-- FROM pg_tables
-- WHERE schemaname = 'backup_pre_whitelabel'
-- ORDER BY tablename;
-- ============================================
```

### Opção C: Via pg_dump (Backup Completo)

Se você tem acesso SSH ao servidor:

```bash
# Instalar pg_dump se necessário
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Fazer backup completo
pg_dump -h db.jtzbuxoslaotpnwsphqv.supabase.co \
        -U postgres \
        -d postgres \
        -F c \
        -f backup_pre_whitelabel_$(date +%Y%m%d_%H%M%S).dump

# Ou backup em SQL (mais legível)
pg_dump -h db.jtzbuxoslaotpnwsphqv.supabase.co \
        -U postgres \
        -d postgres \
        -f backup_pre_whitelabel_$(date +%Y%m%d_%H%M%S).sql
```

**⚠️ Você precisará da connection string do Supabase:**
- Acesse: Supabase Dashboard → Settings → Database → Connection string

---

## 🔐 2. BACKUP DAS VARIÁVEIS DE AMBIENTE

### Criar arquivo de backup:

```bash
# No terminal, na raiz do projeto:
cat > .env.backup.$(date +%Y%m%d_%H%M%S) << 'EOF'
# Backup das variáveis de ambiente
# Data: $(date)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Email
RESEND_API_KEY=...
FROM_EMAIL=...

# Outras variáveis importantes
# (copie todas do seu .env.local)
EOF
```

**Ou manualmente:**
1. Copie o conteúdo do arquivo `.env.local`
2. Salve em um arquivo seguro (ex: `env.backup.txt`)
3. **NÃO** commite este arquivo no Git!

---

## 📁 3. BACKUP DO STORAGE (Supabase Storage)

### Opção A: Via Supabase Dashboard

1. Acesse **Storage** no Supabase Dashboard
2. Para cada bucket importante:
   - Clique no bucket
   - Baixe os arquivos importantes manualmente
   - Ou use a opção de exportação (se disponível)

### Opção B: Via Script (Listar arquivos)

Crie um script para listar todos os arquivos:

```typescript
// scripts/backup-storage-list.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listarArquivos() {
  const buckets = ['documentos_propostas', 'documentos_propostas_corretores']
  const arquivos: any[] = []
  
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.from(bucket).list('', {
      limit: 1000,
      offset: 0,
    })
    
    if (error) {
      console.error(`Erro ao listar ${bucket}:`, error)
      continue
    }
    
    arquivos.push({
      bucket,
      arquivos: data,
    })
  }
  
  // Salvar lista em arquivo
  fs.writeFileSync(
    `backup-storage-list-${Date.now()}.json`,
    JSON.stringify(arquivos, null, 2)
  )
  
  console.log('✅ Lista de arquivos salva!')
}

listarArquivos()
```

**⚠️ Nota**: Os arquivos do Storage geralmente não precisam de backup físico (estão no Supabase), mas é bom ter a lista.

---

## ⚙️ 4. BACKUP DAS CONFIGURAÇÕES DO SUPABASE

### Documentar configurações importantes:

1. **RLS Policies**: 
   - Vá em **Authentication** → **Policies**
   - Anote ou tire screenshots das políticas importantes

2. **Edge Functions**:
   - Vá em **Edge Functions**
   - Anote quais funções existem
   - Baixe o código se necessário

3. **API Keys**:
   - Vá em **Settings** → **API**
   - Anote as chaves (já deve estar no .env.backup)

4. **Storage Buckets**:
   - Vá em **Storage**
   - Anote os buckets e suas políticas

---

## ✅ CHECKLIST DE BACKUP COMPLETO

Antes de executar qualquer script de migração, confirme:

- [ ] **Backup do banco de dados criado** (via Dashboard ou SQL)
- [ ] **Backup das variáveis de ambiente** salvo em local seguro
- [ ] **Lista de arquivos do Storage** documentada (opcional)
- [ ] **Configurações do Supabase** documentadas
- [ ] **Data/hora do backup** anotada
- [ ] **Local do backup** conhecido e acessível

---

## 🔄 COMO RESTAURAR (Se necessário)

### Restaurar Banco de Dados:

#### Opção 1: Via Supabase Dashboard
1. Vá em **Settings** → **Database** → **Backups**
2. Selecione o backup desejado
3. Clique em **Restore**

#### Opção 2: Via SQL (Restaurar do schema backup)

```sql
-- Restaurar tabela específica do backup
BEGIN;

-- Exemplo: restaurar propostas
DROP TABLE IF EXISTS propostas CASCADE;
CREATE TABLE propostas AS 
SELECT * FROM backup_pre_whitelabel.propostas_20240101_120000;

-- Restaurar constraints e índices (se necessário)
-- (copiar do schema original)

COMMIT;
```

#### Opção 3: Via pg_restore

```bash
# Restaurar backup completo
pg_restore -h db.jtzbuxoslaotpnwsphqv.supabase.co \
           -U postgres \
           -d postgres \
           backup_pre_whitelabel_20240101_120000.dump
```

---

## 📝 TEMPLATE DE REGISTRO DE BACKUP

Crie um arquivo `BACKUP-REGISTRO.md`:

```markdown
# Registro de Backups - White-Label Migration

## Backup Pré-Migração White-Label

**Data/Hora**: [DATA AQUI]
**Responsável**: [SEU NOME]

### Banco de Dados
- [ ] Backup via Dashboard: [SIM/NÃO]
- [ ] Backup via SQL: [SIM/NÃO]
- [ ] Schema de backup: `backup_pre_whitelabel`
- [ ] Local do backup: [ONDE ESTÁ SALVO]

### Variáveis de Ambiente
- [ ] Arquivo `.env.backup` criado
- [ ] Local: [ONDE ESTÁ SALVO]

### Storage
- [ ] Lista de arquivos documentada
- [ ] Arquivos críticos baixados

### Observações
[ANOTE QUALQUER OBSERVAÇÃO IMPORTANTE]

---

## Status da Migração

- [ ] Fase 1 (Banco de Dados) - Concluída em: [DATA]
- [ ] Validação pós-migração: [OK/ERRO]
- [ ] Problemas encontrados: [LISTAR]
```

---

## ⚠️ AVISOS IMPORTANTES

1. **NUNCA** execute scripts de migração sem backup
2. **SEMPRE** teste em ambiente de desenvolvimento primeiro
3. **VALIDE** os dados após cada migração
4. **MANTENHA** os backups por pelo menos 30 dias
5. **DOCUMENTE** tudo que fizer

---

## 🚀 PRÓXIMO PASSO

Após confirmar que todos os backups foram feitos:

1. ✅ Revisar scripts SQL de migração
2. ✅ Executar em ambiente de desenvolvimento
3. ✅ Validar dados
4. ✅ Executar em produção (se tudo OK)

**Boa sorte! 🍀**

