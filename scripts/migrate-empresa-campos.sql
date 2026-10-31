-- Migration: Adicionar campos faltantes à tabela empresas
-- Execute com: mysql -u <user> -p <database> < scripts/migrate-empresa-campos.sql

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS inscricaoEstadual VARCHAR(255) DEFAULT NULL AFTER cnpj,
  ADD COLUMN IF NOT EXISTS inscricaoMunicipal VARCHAR(255) DEFAULT NULL AFTER inscricaoEstadual,
  ADD COLUMN IF NOT EXISTS credenciamento VARCHAR(255) DEFAULT NULL AFTER inscricaoMunicipal,
  ADD COLUMN IF NOT EXISTS regime VARCHAR(50) DEFAULT NULL AFTER credenciamento,
  ADD COLUMN IF NOT EXISTS telefone2 VARCHAR(20) DEFAULT NULL AFTER telefone,
  ADD COLUMN IF NOT EXISTS telefonePlantao VARCHAR(20) DEFAULT NULL AFTER telefone2,
  ADD COLUMN IF NOT EXISTS ativo TINYINT(1) DEFAULT 1 AFTER ativa;