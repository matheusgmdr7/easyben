-- Script para verificar políticas RLS das tabelas relacionadas a propostas

BEGIN;

-- Verificar políticas da tabela propostas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('propostas', 'documentos_propostas', 'propostas_corretores')
ORDER BY tablename, policyname;

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('propostas', 'documentos_propostas', 'propostas_corretores')
ORDER BY tablename;

COMMIT;
