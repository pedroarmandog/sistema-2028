-- scripts/add-empresa-id.sql
-- Adiciona coluna empresa_id à tabela usuarios (MySQL)
-- ATENÇÃO: faça backup antes de executar em produção.

-- 1) Criar coluna (v2 MySQL+):
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id INT NULL;

-- 2) Exemplo de uso para associar usuário 1 à empresa 1:
-- UPDATE usuarios SET empresa_id = 1 WHERE id = 1;

-- Observação: prefira usar o script Node `scripts/add-empresa-id.js` que
-- tenta popular `empresa_id` a partir do campo JSON `empresas`.
