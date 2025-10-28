<?php
// update_status.php - Atualiza o status de um chamado específico

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

session_start();
if (empty($_SESSION['usuario'])) {
    header('Location: login.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: dashboard.php');
    exit;
}

$pasta = trim($_POST['pasta'] ?? '');
$status = trim($_POST['status'] ?? '');
$statusesValidos = ['Aberto', 'Em análise', 'Concluído'];

if ($pasta === '' || !in_array($status, $statusesValidos, true)) {
    header('Location: dashboard.php');
    exit;
}

$arquivoDados = __DIR__ . '/uploads/' . $pasta . '/dados.json';
if (!is_file($arquivoDados)) {
    header('Location: dashboard.php');
    exit;
}

try {
    $dados = json_decode(file_get_contents($arquivoDados), true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $exception) {
    header('Location: dashboard.php?erro=' . urlencode('Não foi possível atualizar o status.'));
    exit;
}

$dados['status'] = $status;
$dados['data_atualizacao'] = date('c');

$salvo = file_put_contents($arquivoDados, json_encode($dados, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

header('Location: dashboard.php' . ($salvo === false ? '?erro=' . urlencode('Erro ao salvar o status.') : ''));
exit;
