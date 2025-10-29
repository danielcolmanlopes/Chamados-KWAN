<?php
header('Content-Type: application/json');
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$codigo = sanitize_text($_POST['codigo'] ?? '');
$tipo = sanitize_text($_POST['tipo'] ?? 'Documento adicional');

if ($codigo === '') {
    echo json_encode(['success' => false, 'message' => 'Código do chamado é obrigatório.']);
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

if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Envie um arquivo válido.']);
    exit;
}

$file = $_FILES['arquivo'];
$maxFileSize = 20 * 1024 * 1024; // 20MB
if ($file['size'] > $maxFileSize) {
    echo json_encode(['success' => false, 'message' => 'Arquivo excede o limite de 20 MB.']);
    exit;
}

$ext = allowed_extension($file['name']);
if (!$ext) {
    echo json_encode(['success' => false, 'message' => 'Tipo de arquivo não permitido.']);
    exit;
}

$uploadDir = realpath(__DIR__ . '/../uploads');
if ($uploadDir === false) {
    echo json_encode(['success' => false, 'message' => 'Diretório de uploads indisponível.']);
    exit;
}

$filename = $codigo . '_anexo_' . time() . '.' . $ext;
$path = $uploadDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($file['tmp_name'], $path)) {
    echo json_encode(['success' => false, 'message' => 'Falha ao salvar o arquivo enviado.']);
    exit;
}

$relative = 'uploads/' . $filename;

$insert = $mysqli->prepare("INSERT INTO anexos_chamado (chamado_id, codigo, tipo, arquivo_nome, arquivo_caminho) VALUES (?, ?, ?, ?, ?)");
if (!$insert) {
    unlink($path);
    echo json_encode(['success' => false, 'message' => 'Erro ao preparar registro do anexo.']);
    exit;
}

$original = basename($file['name']);
$insert->bind_param('issss', $chamado['id'], $codigo, $tipo, $original, $relative);
if (!$insert->execute()) {
    unlink($path);
    echo json_encode(['success' => false, 'message' => 'Não foi possível registrar o anexo.']);
    exit;
}
$insert->close();

echo json_encode(['success' => true]);
