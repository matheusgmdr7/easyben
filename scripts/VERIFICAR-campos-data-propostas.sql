-- Verificar todos os campos de data disponíveis na tabela propostas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'propostas' 
AND column_name LIKE '%data%' 
   OR column_name LIKE '%created%'
   OR column_name LIKE '%updated%'
ORDER BY column_name;

-- Verificar alguns exemplos de dados da tabela propostas
SELECT 
  id,
  nome,
  data_cadastro,
  created_at,
  updated_at,
  status
FROM propostas 
WHERE status = 'cadastrado'
ORDER BY created_at DESC
LIMIT 5;