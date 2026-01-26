-- ============================================
-- SCRIPT 20: DESABILITAR RLS EM TODAS AS TABELAS DO CORRETOR
-- ============================================
-- Este script desabilita o RLS em todas as tabelas que o dashboard
-- do corretor precisa acessar para funcionar corretamente
-- ============================================
-- ⚠️ ATENÇÃO: Este script desabilita RLS em múltiplas tabelas
-- ⚠️ Use apenas para restaurar funcionamento em produção
-- ============================================

BEGIN;

-- ============================================
-- PARTE 1: TABELAS JÁ CORRIGIDAS
-- ============================================
-- (Já desabilitadas no script 19)
-- corretores
-- usuarios_admin

-- ============================================
-- PARTE 2: TABELAS DE PROPOSTAS
-- ============================================

-- propostas_corretores
DROP POLICY IF EXISTS "tenant_isolation_propostas_corretores" ON propostas_corretores;
ALTER TABLE propostas_corretores DISABLE ROW LEVEL SECURITY;

-- propostas (se existir e tiver RLS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propostas') THEN
        DROP POLICY IF EXISTS "tenant_isolation_propostas" ON propostas;
        ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- documentos_propostas (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documentos_propostas') THEN
        ALTER TABLE documentos_propostas DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- modelos_propostas (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modelos_propostas') THEN
        ALTER TABLE modelos_propostas DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================
-- PARTE 3: TABELAS DE PRODUTOS E PREÇOS
-- ============================================

-- produtos_corretores
DROP POLICY IF EXISTS "tenant_isolation_produtos_corretores" ON produtos_corretores;
ALTER TABLE produtos_corretores DISABLE ROW LEVEL SECURITY;

-- tabelas_precos
DROP POLICY IF EXISTS "tenant_isolation_tabelas_precos" ON tabelas_precos;
ALTER TABLE tabelas_precos DISABLE ROW LEVEL SECURITY;

-- tabelas_precos_faixas (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tabelas_precos_faixas') THEN
        ALTER TABLE tabelas_precos_faixas DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================
-- PARTE 4: TABELAS DE COMISSÕES
-- ============================================

-- comissoes (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comissoes') THEN
        DROP POLICY IF EXISTS "tenant_isolation_comissoes" ON comissoes;
        ALTER TABLE comissoes DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================
-- PARTE 5: OUTRAS TABELAS RELACIONADAS
-- ============================================

-- leads (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        DROP POLICY IF EXISTS "tenant_isolation_leads" ON leads;
        ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

COMMIT;

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================
-- Execute para verificar que o RLS foi desabilitado:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     rowsecurity as "RLS Habilitado"
-- FROM pg_tables
-- WHERE tablename IN (
--     'corretores',
--     'usuarios_admin',
--     'propostas_corretores',
--     'propostas',
--     'produtos_corretores',
--     'tabelas_precos',
--     'tabelas_precos_faixas',
--     'comissoes',
--     'leads',
--     'documentos_propostas',
--     'modelos_propostas'
-- )
-- AND schemaname = 'public'
-- ORDER BY tablename;
-- ============================================
-- 
-- RESULTADO ESPERADO:
-- Todas as tabelas devem ter rowsecurity = false (RLS DESABILITADO)
-- ============================================
-- 
-- APÓS EXECUTAR ESTE SCRIPT:
-- ✅ Login de corretores deve funcionar
-- ✅ Cadastro de corretores deve funcionar
-- ✅ Dashboard do corretor deve mostrar todos os dados
-- ✅ Admin sidebar deve mostrar todos os itens
-- ============================================

