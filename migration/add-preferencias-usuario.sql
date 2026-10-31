-- Adiciona coluna preferencias (JSON) na tabela usuarios
-- Usada para persistir configurações por usuário (cores, etc.)
ALTER TABLE usuarios ADD COLUMN preferencias JSON DEFAULT NULL;