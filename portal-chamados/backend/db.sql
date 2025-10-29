CREATE DATABASE IF NOT EXISTS dclinfo2_portal_chamados CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dclinfo2_portal_chamados;

CREATE TABLE IF NOT EXISTS chamados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_publico VARCHAR(40) UNIQUE,
  status VARCHAR(40) DEFAULT 'aberto',
  cliente_nome VARCHAR(100),
  cliente_email VARCHAR(100),
  cliente_telefone VARCHAR(50),
  cliente_cnpj VARCHAR(20),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  serial VARCHAR(100),
  data_compra DATE,
  nf_compra VARCHAR(255),
  descricao_problema TEXT,
  data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
  data_ultima_atualizacao DATETIME
);

CREATE TABLE IF NOT EXISTS anexos_chamado (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chamado_id INT,
  tipo VARCHAR(50),
  arquivo_path VARCHAR(255),
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mensagens_chamado (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chamado_id INT,
  autor ENUM('cliente','interno'),
  mensagem TEXT,
  visibilidade ENUM('publica','interna'),
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eventos_chamado (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chamado_id INT,
  de_status VARCHAR(40),
  para_status VARCHAR(40),
  motivo TEXT,
  usuario VARCHAR(100),
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  senha_hash VARCHAR(255)
);

DELETE FROM usuarios;
INSERT INTO usuarios (nome, email, senha_hash)
VALUES ('Administrador', 'daniel@kwansolucoes.com.br', SHA2('kwan123',256));
