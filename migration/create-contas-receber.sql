-- ============================================================
-- Criação da tabela `contas_receber` (Contas a Receber / Financeiro)
--
-- Idempotente: usa CREATE TABLE IF NOT EXISTS, pode rodar quantas vezes quiser.
--
-- Onde rodar:
--   Na VPS (banco `petshop` do back-end):
--       mysql -u USUARIO -p petshop < create-contas-receber.sql
--   Ou cole este script no phpMyAdmin / MySQL Workbench do banco da VPS.
--
-- Estrutura idêntica à gerada pelo modelo backend/models/ContaReceber.js
-- (mesmas colunas, tipos, default e charset).
-- ============================================================

CREATE TABLE IF NOT EXISTS `contas_receber` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clienteId` int(11) DEFAULT NULL,
  `clienteNome` varchar(255) DEFAULT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `categoria` varchar(255) DEFAULT NULL,
  `valor` decimal(12,2) DEFAULT 0.00,
  `dataEmissao` date DEFAULT NULL,
  `dataVencimento` date DEFAULT NULL,
  `formaPagamento` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT 'pendente',
  `observacoes` text DEFAULT NULL,
  `parcelas` int(11) DEFAULT 1,
  `parcelaNumero` int(11) DEFAULT 1,
  `documentoOrigem` varchar(255) DEFAULT NULL,
  `valorPago` decimal(12,2) DEFAULT 0.00,
  `dataPagamento` date DEFAULT NULL,
  `empresa_id` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;