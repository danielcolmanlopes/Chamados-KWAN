CREATE TABLE IF NOT EXISTS chamados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    cliente_nome VARCHAR(150) NOT NULL,
    cliente_email VARCHAR(180) NOT NULL,
    cliente_telefone VARCHAR(50) NOT NULL,
    cliente_cnpj VARCHAR(30) NOT NULL,
    produto_marca VARCHAR(120) NOT NULL,
    produto_modelo VARCHAR(120) NOT NULL,
    produto_serial VARCHAR(120) NOT NULL,
    produto_data_compra DATE NOT NULL,
    nf_original VARCHAR(255) NOT NULL,
    descricao_problema TEXT NOT NULL,
    status VARCHAR(80) NOT NULL DEFAULT 'aberto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS anexos_chamado (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chamado_id INT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    tipo VARCHAR(150) DEFAULT NULL,
    arquivo_nome VARCHAR(255) NOT NULL,
    arquivo_caminho VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensagens_chamado (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chamado_id INT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    origem ENUM('cliente','admin') NOT NULL,
    mensagem TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eventos_chamado (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chamado_id INT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    status VARCHAR(80) NOT NULL,
    observacao VARCHAR(500) DEFAULT NULL,
    criado_por VARCHAR(150) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    senha_hash CHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO usuarios (nome, email, senha_hash)
VALUES ('Administrador', 'daniel@kwansolucoes.com.br', SHA2('kwan123', 256))
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

CREATE TABLE IF NOT EXISTS notas_fiscais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(60) NOT NULL,
    serie VARCHAR(30) NOT NULL,
    estado_emissor CHAR(2) NOT NULL,
    data_emissao DATE NOT NULL,
    transportadora VARCHAR(150) NOT NULL,
    percentual_icms DECIMAL(7,4) NOT NULL,
    valor_icms DECIMAL(14,2) NOT NULL,
    percentual_ipi DECIMAL(7,4) NOT NULL,
    valor_ipi DECIMAL(14,2) NOT NULL,
    emitente_nome VARCHAR(160) NOT NULL,
    emitente_cnpj VARCHAR(18) NOT NULL,
    destinatario_nome VARCHAR(160) NOT NULL,
    destinatario_cnpj VARCHAR(18) NOT NULL,
    valor_total DECIMAL(14,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @uniq_nf_registro_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'notas_fiscais'
      AND index_name = 'uniq_nf_registro'
);

SET @create_uniq_nf_registro := IF(
    @uniq_nf_registro_exists = 0,
    'CREATE UNIQUE INDEX uniq_nf_registro ON notas_fiscais (numero, serie, emitente_cnpj, destinatario_cnpj);',
    'SELECT 1'
);

PREPARE stmt FROM @create_uniq_nf_registro;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS notas_fiscais_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nota_fiscal_id INT NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    quantidade DECIMAL(14,3) NOT NULL,
    valor_unitario DECIMAL(14,2) NOT NULL,
    valor_total DECIMAL(14,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nota_fiscal_id) REFERENCES notas_fiscais(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE notas_fiscais
    ADD COLUMN IF NOT EXISTS emitente_nome VARCHAR(160) NOT NULL AFTER valor_ipi,
    ADD COLUMN IF NOT EXISTS emitente_cnpj VARCHAR(18) NOT NULL AFTER emitente_nome,
    ADD COLUMN IF NOT EXISTS destinatario_nome VARCHAR(160) NOT NULL AFTER emitente_cnpj,
    ADD COLUMN IF NOT EXISTS destinatario_cnpj VARCHAR(18) NOT NULL AFTER destinatario_nome,
    ADD COLUMN IF NOT EXISTS valor_total DECIMAL(14,2) NOT NULL AFTER destinatario_cnpj;
