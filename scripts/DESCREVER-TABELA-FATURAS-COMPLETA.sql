-- Descrever a estrutura real da tabela faturas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'faturas'
ORDER BY ordinal_position;

