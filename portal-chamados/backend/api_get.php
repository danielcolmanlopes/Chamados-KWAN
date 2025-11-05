<?php
header('Content-Type: application/json');
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $codigo = sanitize_text($_GET['c'] ?? '');
    if ($codigo === '') {
        echo json_encode(['success' => false, 'message' => 'Código do chamado não informado.']);
        exit;
    }

    $stmt = $mysqli->prepare("SELECT id, codigo, cliente_nome, cliente_email, cliente_telefone, cliente_cnpj, produto_marca, produto_modelo, produto_serial, produto_data_compra, nf_original, descricao_problema, loja, observacao2, endereco_faturamento, endereco_entrega, status, created_at FROM chamados WHERE codigo = ?");
    $stmt->bind_param('s', $codigo);
    $stmt->execute();
    $result = $stmt->get_result();
    $chamado = $result->fetch_assoc();
    $stmt->close();

    if (!$chamado) {
        echo json_encode(['success' => false, 'message' => 'Chamado não encontrado.']);
        exit;
    }

    $mensagens = [];
    $msgStmt = $mysqli->prepare("SELECT origem, mensagem, created_at FROM mensagens_chamado WHERE codigo = ? ORDER BY created_at ASC");
    if ($msgStmt) {
        $msgStmt->bind_param('s', $codigo);
        $msgStmt->execute();
        $mensagens = $msgStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $msgStmt->close();
    }

    $eventos = [];
    $evtStmt = $mysqli->prepare("SELECT status, observacao, criado_por, created_at FROM eventos_chamado WHERE codigo = ? ORDER BY created_at ASC");
    if ($evtStmt) {
        $evtStmt->bind_param('s', $codigo);
        $evtStmt->execute();
        $eventos = $evtStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $evtStmt->close();
    }

    $anexos = [];
    $anexoStmt = $mysqli->prepare("SELECT tipo, arquivo_nome, arquivo_caminho, created_at FROM anexos_chamado WHERE codigo = ? ORDER BY created_at ASC");
    if ($anexoStmt) {
        $anexoStmt->bind_param('s', $codigo);
        $anexoStmt->execute();
        $anexos = $anexoStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $anexoStmt->close();
    }

    echo json_encode([
        'success' => true,
        'chamado' => $chamado,
        'mensagens' => $mensagens,
        'eventos' => $eventos,
        'anexos' => $anexos,
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $codigo = sanitize_text($_POST['codigo'] ?? '');
    $mensagem = trim($_POST['mensagem'] ?? '');

    if ($codigo === '' || $mensagem === '') {
        echo json_encode(['success' => false, 'message' => 'Informe o código e a mensagem.']);
        exit;
    }

    $stmt = $mysqli->prepare("SELECT id FROM chamados WHERE codigo = ?");
    $stmt->bind_param('s', $codigo);
    $stmt->execute();
    $result = $stmt->get_result();
    $chamado = $result->fetch_assoc();
    $stmt->close();

    if (!$chamado) {
        echo json_encode(['success' => false, 'message' => 'Chamado não encontrado.']);
        exit;
    }

    $mensagemLimpa = filter_var($mensagem, FILTER_SANITIZE_STRING, FILTER_FLAG_NO_ENCODE_QUOTES);

    $insert = $mysqli->prepare("INSERT INTO mensagens_chamado (chamado_id, codigo, origem, mensagem) VALUES (?, ?, 'cliente', ?)");
    if (!$insert) {
        echo json_encode(['success' => false, 'message' => 'Erro ao preparar mensagem.']);
        exit;
    }

    $insert->bind_param('iss', $chamado['id'], $codigo, $mensagemLimpa);
    if (!$insert->execute()) {
        echo json_encode(['success' => false, 'message' => 'Não foi possível registrar a mensagem.']);
        exit;
    }
    $insert->close();

    $evento = $mysqli->prepare("INSERT INTO eventos_chamado (chamado_id, codigo, status, observacao, criado_por) VALUES (?, ?, ?, ?, ?)");
    if ($evento) {
        $status = 'mensagem_cliente';
        $observacao = 'Cliente enviou uma nova mensagem.';
        $autor = 'Cliente';
        $evento->bind_param('issss', $chamado['id'], $codigo, $status, $observacao, $autor);
        $evento->execute();
        $evento->close();
    }

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
