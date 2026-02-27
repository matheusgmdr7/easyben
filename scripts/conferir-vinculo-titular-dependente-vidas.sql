-- Conferir vínculo titular ↔ dependente em vidas_importadas
-- Execute no Supabase SQL Editor para ver, por grupo, titulares e seus dependentes.
-- Vínculo: dependente.cpf_titular = titular.cpf (no mesmo grupo_id, tipo 'titular'/'dependente').
--
-- Na aplicação: Grupos de beneficiários → [grupo] → clicar em um TITULAR → aba "Dependentes".
-- Só titulares exibem dependentes; a lista usa cpf_titular = CPF do titular.

-- 1) Por grupo: listar titulares e dependentes vinculados (cpf_titular = cpf do titular)
SELECT
  g.nome AS grupo_nome,
  t.nome AS titular_nome,
  t.cpf AS titular_cpf,
  t.id AS titular_id,
  d.nome AS dependente_nome,
  d.cpf AS dependente_cpf,
  d.cpf_titular AS dependente_cpf_titular,
  CASE WHEN REPLACE(REPLACE(REPLACE(COALESCE(t.cpf,''), '.',''), '-',''), ' ','') = REPLACE(REPLACE(REPLACE(COALESCE(d.cpf_titular,''), '.',''), '-',''), ' ','')
    THEN 'OK' ELSE 'ERRO: CPF titular não confere' END AS conferencia
FROM grupos_beneficiarios g
JOIN vidas_importadas t ON t.grupo_id = g.id AND t.tipo = 'titular'
LEFT JOIN vidas_importadas d ON d.grupo_id = g.id AND d.tipo = 'dependente'
  AND REPLACE(REPLACE(REPLACE(COALESCE(d.cpf_titular,''), '.',''), '-',''), ' ','')
  = REPLACE(REPLACE(REPLACE(COALESCE(t.cpf,''), '.',''), '-',''), ' ','')
ORDER BY g.nome, t.nome, d.nome;

-- 2) Dependentes “órfãos”: tipo = dependente mas cpf_titular não bate com nenhum titular do grupo
SELECT
  g.nome AS grupo_nome,
  d.id,
  d.nome AS dependente_nome,
  d.cpf AS dependente_cpf,
  d.cpf_titular AS cpf_titular_informado,
  'Nenhum titular neste grupo com este CPF' AS observacao
FROM vidas_importadas d
JOIN grupos_beneficiarios g ON g.id = d.grupo_id
WHERE d.tipo = 'dependente'
  AND NOT EXISTS (
    SELECT 1 FROM vidas_importadas t
    WHERE t.grupo_id = d.grupo_id AND t.tipo = 'titular'
      AND REPLACE(REPLACE(REPLACE(COALESCE(t.cpf,''), '.',''), '-',''), ' ','')
      = REPLACE(REPLACE(REPLACE(COALESCE(d.cpf_titular,''), '.',''), '-',''), ' ','')
  )
ORDER BY g.nome, d.nome;

-- 3) Resumo por grupo: quantidade de titulares e de dependentes vinculados
SELECT
  g.nome AS grupo_nome,
  COUNT(DISTINCT t.id) AS qtd_titulares,
  COUNT(DISTINCT d.id) AS qtd_dependentes_vinculados
FROM grupos_beneficiarios g
LEFT JOIN vidas_importadas t ON t.grupo_id = g.id AND t.tipo = 'titular'
LEFT JOIN vidas_importadas d ON d.grupo_id = g.id AND d.tipo = 'dependente'
  AND REPLACE(REPLACE(REPLACE(COALESCE(d.cpf_titular,''), '.',''), '-',''), ' ','')
  = REPLACE(REPLACE(REPLACE(COALESCE(t.cpf,''), '.',''), '-',''), ' ','')
GROUP BY g.id, g.nome
ORDER BY g.nome;
