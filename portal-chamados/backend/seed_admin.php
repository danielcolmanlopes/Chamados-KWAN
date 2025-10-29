<?php
declare(strict_types=1);

// Este script garante que exista ao menos um usuário administrador padrão.
// Ele pode ser executado manualmente (php seed_admin.php) ou incluído em outros
// pontos do sistema. Em ambos os casos, ele espera uma conexão $conn válida ou
// cria uma nova com base no config.php.

if (!isset($conn) || !($conn instanceof mysqli)) {
    require __DIR__ . '/config.php';
}

if (!isset($conn) || !($conn instanceof mysqli)) {
    error_log('[seed_admin] Não foi possível obter a conexão com o banco de dados.');
    return;
}

$verificacao = $conn->query('SELECT COUNT(*) AS total FROM usuarios');
if ($verificacao === false) {
    error_log('[seed_admin] Falha ao consultar a tabela de usuários: ' . $conn->error);
    return;
}

$dados = $verificacao->fetch_assoc();
if ($dados !== null && (int) ($dados['total'] ?? 0) > 0) {
    return;
}

$nomeAdministrador = 'Administrador';
$emailAdministrador = 'admin@kwansolucoes.com.br';
$senhaHash = hash('sha256', 'kwan123');

$stmt = $conn->prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)');
if ($stmt === false) {
    error_log('[seed_admin] Falha ao preparar inserção do administrador: ' . $conn->error);
    return;
}

if (!$stmt->bind_param('sss', $nomeAdministrador, $emailAdministrador, $senhaHash)) {
    error_log('[seed_admin] Falha ao vincular parâmetros do administrador padrão: ' . $stmt->error);
    return;
}

if (!$stmt->execute()) {
    error_log('[seed_admin] Falha ao inserir administrador padrão: ' . $stmt->error);
}

$stmt->close();
