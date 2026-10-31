-- Migration: Adicionar coluna numeroOrdem na tabela whatsapp_sessions
-- Objetivo: Cada empresa ter sua própria numeração sequencial de instâncias
-- Executar no MySQL:

-- 1. Adicionar a coluna (se não existir)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_sessions' 
  AND COLUMN_NAME = 'numeroOrdem');
SET @sql := IF(@exist = 0, 
  'ALTER TABLE whatsapp_sessions ADD COLUMN numeroOrdem INT NOT NULL DEFAULT 1 AFTER nome',
  'SELECT "Coluna numeroOrdem já existe"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Para registros existentes, calcular numeroOrdem baseado no createdAt por empresa
-- Isso garante que instâncias antigas recebam números sequenciais corretos
UPDATE whatsapp_sessions t
JOIN (
  SELECT id, empresaId,
    ROW_NUMBER() OVER (PARTITION BY empresaId ORDER BY createdAt ASC) AS num
  FROM whatsapp_sessions
) sub ON t.id = sub.id
SET t.numeroOrdem = sub.num
WHERE t.numeroOrdem = 1 AND t.createdAt IS NOT NULL;