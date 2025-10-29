<?php
require __DIR__ . '/auth.php';
require __DIR__ . '/config.php';

$statuses = [
    'aberto','triado','aguardando_nf_remessa','aguardando_envio','em_transporte_para_kwan','recebido_na_kwan','em_analise_tecnica',
    'aguardando_aprovacao','aprovado','reprovado','aguardando_pagamento','em_reparo','reparo_concluido','em_teste_qualidade',
    'em_devolucao','em_transito_para_cliente','entregue_ao_cliente','testado_no_cliente','encerrado_com_reparo','encerrado_sem_reparo',
    'encerrado_com_descarte','cancelado'
];

$codigo = sanitize_text($_GET['c'] ?? '');
if ($codigo === '') {
    header('Location: admin.php');
    exit;
}

$stmt = $mysqli->prepare('SELECT * FROM chamados WHERE codigo = ? LIMIT 1');
$stmt->bind_param('s', $codigo);
$stmt->execute();
$chamado = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$chamado) {
    header('Location: admin.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'status') {
        $novoStatus = sanitize_text($_POST['status'] ?? '');
        $observacao = sanitize_text($_POST['observacao'] ?? '');
        if (!in_array($novoStatus, $statuses, true)) {
            $novoStatus = $chamado['status'];
        }

        $update = $mysqli->prepare('UPDATE chamados SET status = ? WHERE id = ?');
        $update->bind_param('si', $novoStatus, $chamado['id']);
        $update->execute();
        $update->close();

        $evento = $mysqli->prepare('INSERT INTO eventos_chamado (chamado_id, codigo, status, observacao, criado_por) VALUES (?, ?, ?, ?, ?)');
        if ($evento) {
            $autor = $_SESSION['usuario_nome'] ?? 'Administrador';
            $evento->bind_param('issss', $chamado['id'], $codigo, $novoStatus, $observacao, $autor);
            $evento->execute();
            $evento->close();
        }

        header('Location: admin_ver.php?c=' . urlencode($codigo));
        exit;
    }

    if ($action === 'mensagem') {
        $mensagem = trim($_POST['mensagem'] ?? '');
        if ($mensagem !== '') {
            $mensagemLimpa = filter_var($mensagem, FILTER_SANITIZE_STRING, FILTER_FLAG_NO_ENCODE_QUOTES);
            $insert = $mysqli->prepare("INSERT INTO mensagens_chamado (chamado_id, codigo, origem, mensagem) VALUES (?, ?, 'admin', ?)");
            if ($insert) {
                $insert->bind_param('iss', $chamado['id'], $codigo, $mensagemLimpa);
                $insert->execute();
                $insert->close();
            }

            $evento = $mysqli->prepare('INSERT INTO eventos_chamado (chamado_id, codigo, status, observacao, criado_por) VALUES (?, ?, ?, ?, ?)');
            if ($evento) {
                $statusEvento = 'mensagem_admin';
                $observacao = 'Equipe KWAN enviou uma mensagem ao cliente.';
                $autor = $_SESSION['usuario_nome'] ?? 'Administrador';
                $evento->bind_param('issss', $chamado['id'], $codigo, $statusEvento, $observacao, $autor);
                $evento->execute();
                $evento->close();
            }
        }
        header('Location: admin_ver.php?c=' . urlencode($codigo));
        exit;
    }
}

$msgStmt = $mysqli->prepare('SELECT origem, mensagem, created_at FROM mensagens_chamado WHERE codigo = ? ORDER BY created_at ASC');
$msgStmt->bind_param('s', $codigo);
$msgStmt->execute();
$mensagens = $msgStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$msgStmt->close();

$evtStmt = $mysqli->prepare('SELECT status, observacao, criado_por, created_at FROM eventos_chamado WHERE codigo = ? ORDER BY created_at ASC');
$evtStmt->bind_param('s', $codigo);
$evtStmt->execute();
$eventos = $evtStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$evtStmt->close();

$anexoStmt = $mysqli->prepare('SELECT tipo, arquivo_nome, arquivo_caminho, created_at FROM anexos_chamado WHERE codigo = ? ORDER BY created_at ASC');
$anexoStmt->bind_param('s', $codigo);
$anexoStmt->execute();
$anexos = $anexoStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$anexoStmt->close();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detalhes do Chamado - <?php echo htmlspecialchars($codigo, ENT_QUOTES, 'UTF-8'); ?></title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
<header class="topbar">
    <div class="container flex-between">
        <div class="logo-area">
            <img src="../assets/img/kwan_logotipo_pq.png" alt="KWAN" class="logo-sm" style="display:block;">
        </div>
        <div class="header-actions">
            <a href="admin.php" class="btn outline small">&larr; Voltar</a>
            <span class="muted">Olá, <?php echo htmlspecialchars($_SESSION['usuario_nome'], ENT_QUOTES, 'UTF-8'); ?></span>
            <a href="logout.php" class="btn outline small">Sair</a>
        </div>
    </div>
</header>

<main class="form-page">
    <div class="container">
        <div class="admin-layout">
            <div class="admin-card">
                <h1>Chamado <?php echo htmlspecialchars($codigo, ENT_QUOTES, 'UTF-8'); ?></h1>
                <p><strong>Cliente:</strong> <?php echo htmlspecialchars($chamado['cliente_nome'], ENT_QUOTES, 'UTF-8'); ?> &bull; <?php echo htmlspecialchars($chamado['cliente_email'], ENT_QUOTES, 'UTF-8'); ?> &bull; <?php echo htmlspecialchars($chamado['cliente_telefone'], ENT_QUOTES, 'UTF-8'); ?></p>
                <p><strong>CNPJ/CPF:</strong> <?php echo htmlspecialchars($chamado['cliente_cnpj'], ENT_QUOTES, 'UTF-8'); ?></p>
                <p><strong>Produto:</strong> <?php echo htmlspecialchars($chamado['produto_marca'] . ' / ' . $chamado['produto_modelo'] . ' / Série ' . $chamado['produto_serial'], ENT_QUOTES, 'UTF-8'); ?></p>
                <p><strong>Data da compra:</strong> <?php echo htmlspecialchars(date('d/m/Y', strtotime($chamado['produto_data_compra'])), ENT_QUOTES, 'UTF-8'); ?></p>
                <p><strong>Nota fiscal enviada:</strong> <a href="../<?php echo htmlspecialchars($chamado['nf_original'], ENT_QUOTES, 'UTF-8'); ?>" target="_blank" rel="noopener">Abrir documento</a></p>
                <p><strong>Descrição do problema:</strong><br><?php echo nl2br(htmlspecialchars($chamado['descricao_problema'], ENT_QUOTES, 'UTF-8')); ?></p>
                <p><strong>Status atual:</strong> <span class="badge status-admin"><?php echo htmlspecialchars(str_replace('_',' ', $chamado['status']), ENT_QUOTES, 'UTF-8'); ?></span></p>
                <p><strong>Aberto em:</strong> <?php echo htmlspecialchars(date('d/m/Y H:i', strtotime($chamado['created_at'])), ENT_QUOTES, 'UTF-8'); ?></p>
            </div>

            <div class="admin-card">
                <h2>Atualizar status</h2>
                <form method="post">
                    <input type="hidden" name="action" value="status">
                    <label>Novo status
                        <select name="status" required>
                            <?php foreach ($statuses as $status): ?>
                                <option value="<?php echo htmlspecialchars($status, ENT_QUOTES, 'UTF-8'); ?>" <?php echo $status === $chamado['status'] ? 'selected' : ''; ?>><?php echo htmlspecialchars(str_replace('_',' ', $status), ENT_QUOTES, 'UTF-8'); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                    <label>Observação (opcional)
                        <textarea name="observacao" rows="3" maxlength="2000" placeholder="Resumo da alteração"></textarea>
                    </label>
                    <button type="submit" class="btn primary small">Salvar</button>
                </form>
            </div>

            <div class="admin-card">
                <h2>Mensagens</h2>
                <div class="mensagens-lista">
                    <?php if (empty($mensagens)): ?>
                        <p class="muted">Sem mensagens registradas.</p>
                    <?php else: ?>
                        <?php foreach ($mensagens as $msg): ?>
                            <div class="mensagem <?php echo $msg['origem'] === 'admin' ? 'admin' : 'cliente'; ?>">
                                <?php echo nl2br(htmlspecialchars($msg['mensagem'], ENT_QUOTES, 'UTF-8')); ?>
                                <time><?php echo htmlspecialchars(date('d/m/Y H:i', strtotime($msg['created_at'])), ENT_QUOTES, 'UTF-8'); ?> • <?php echo $msg['origem'] === 'admin' ? 'Equipe KWAN' : 'Cliente'; ?></time>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
                <form method="post">
                    <input type="hidden" name="action" value="mensagem">
                    <label>Enviar resposta ao cliente
                        <textarea name="mensagem" rows="3" maxlength="2000" required></textarea>
                    </label>
                    <button type="submit" class="btn outline small">Enviar mensagem</button>
                </form>
            </div>

            <div class="admin-card">
                <h2>Linha do tempo</h2>
                <ul class="timeline">
                    <?php if (empty($eventos)): ?>
                        <li>Sem eventos registrados.</li>
                    <?php else: ?>
                        <?php foreach ($eventos as $evento): ?>
                            <li>
                                <strong><?php echo htmlspecialchars(str_replace('_',' ', $evento['status']), ENT_QUOTES, 'UTF-8'); ?></strong><br>
                                <?php echo htmlspecialchars($evento['observacao'], ENT_QUOTES, 'UTF-8'); ?><br>
                                <time><?php echo htmlspecialchars(date('d/m/Y H:i', strtotime($evento['created_at'])), ENT_QUOTES, 'UTF-8'); ?> • <?php echo htmlspecialchars($evento['criado_por'], ENT_QUOTES, 'UTF-8'); ?></time>
                            </li>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </ul>
            </div>

            <div class="admin-card">
                <h2>Anexos</h2>
                <?php if (empty($anexos)): ?>
                    <p class="muted">Nenhum anexo enviado.</p>
                <?php else: ?>
                    <ul>
                        <?php foreach ($anexos as $anexo): ?>
                            <li>
                                <strong><?php echo htmlspecialchars($anexo['tipo'], ENT_QUOTES, 'UTF-8'); ?></strong> -
                                <a href="../<?php echo htmlspecialchars($anexo['arquivo_caminho'], ENT_QUOTES, 'UTF-8'); ?>" target="_blank" rel="noopener">Abrir</a>
                                <span class="muted"><?php echo htmlspecialchars(date('d/m/Y H:i', strtotime($anexo['created_at'])), ENT_QUOTES, 'UTF-8'); ?></span>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>
            </div>
        </div>
    </div>
</main>
</body>
</html>
