-- Migration SQL para criar tabelas do Disparador de Mensagens

CREATE TABLE IF NOT EXISTS campanhas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresaId INT NOT NULL DEFAULT 1,
  nome VARCHAR(200) NOT NULL,
  mensagemTemplate TEXT NOT NULL,
  imagemPath VARCHAR(500),
  status ENUM('draft','pronta','rodando','pausada','finalizada') DEFAULT 'draft',
  configuracao JSON NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contatos_campanha (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresaId INT NOT NULL DEFAULT 1,
  campanhaId INT NULL,
  nome VARCHAR(200),
  numero VARCHAR(40) NOT NULL,
  status ENUM('pendente','enviado','erro','pausado') DEFAULT 'pendente',
  meta JSON NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campanha_id (campanhaId),
  INDEX idx_numero (numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS blacklist_disparador (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresaId INT NOT NULL DEFAULT 1,
  numero VARCHAR(40) NOT NULL,
  motivo VARCHAR(200),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
