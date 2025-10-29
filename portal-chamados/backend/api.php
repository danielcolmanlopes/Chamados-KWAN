<?php
header('Content-Type: application/json');
require __DIR__ . '/config.php';


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$recaptchaResponse = $_POST['g-recaptcha-response'] ?? '';
if (!$recaptchaResponse) {
    echo json_encode(['success' => false, 'message' => 'Confirme o reCAPTCHA para enviar o chamado.']);
    exit;
}

$secret = '6LfplforAAAAAEhRchvQUfQXu1mh45EVzjvwSHHF';
$verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-type: application/x-www-form-urlencoded',
        'content' => http_build_query([
            'secret' => $secret,
            'response' => $recaptchaResponse,
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? null,
        ]),
        'timeout' => 10,
    ]
]);

$verify = @file_get_contents($verifyUrl, false, $context);
$result = $verify ? json_decode($verify, true) : null;
if (!$result || empty($result['success'])) {
    echo json_encode(['success' => false, 'message' => 'Falha na validação do reCAPTCHA.']);
    exit;
}

$requiredFields = ['cliente_nome','cliente_email','cliente_telefone','cliente_cnpj','produto_marca','produto_modelo','produto_serial','produto_data_compra','descricao_problema'];
$data = [];

foreach ($requiredFields as $field) {
    $value = sanitize_text($_POST[$field] ?? '');
    if ($value === '') {
        echo json_encode(['success' => false, 'message' => 'Preencha todos os campos obrigatórios.']);
        exit;
    }
    $data[$field] = $value;
}

if (!filter_var($data['cliente_email'], FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'E-mail inválido.']);
    exit;
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['produto_data_compra'])) {
    echo json_encode(['success' => false, 'message' => 'Data de compra inválida.']);
    exit;
}

$uploadDir = realpath(__DIR__ . '/../uploads');
if ($uploadDir === false) {
    echo json_encode(['success' => false, 'message' => 'Diretório de uploads não encontrado.']);
    exit;
}

$maxFileSize = 20 * 1024 * 1024; // 20MB

if (!isset($_FILES['nf_compra']) || $_FILES['nf_compra']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Envie a nota fiscal de compra (PDF ou XML).']);
    exit;
}

$nfFile = $_FILES['nf_compra'];
if ($nfFile['size'] > $maxFileSize) {
    echo json_encode(['success' => false, 'message' => 'Arquivo da nota fiscal excede o limite de 20 MB.']);
    exit;
}

$nfExt = allowed_extension($nfFile['name']);
if (!in_array($nfExt, ['pdf', 'xml'], true)) {
    echo json_encode(['success' => false, 'message' => 'A nota fiscal deve ser PDF ou XML.']);
    exit;
}

$codigo = generate_codigo();
$timestamp = time();
$nfFilename = $codigo . '_nf_compra_' . $timestamp . '.' . $nfExt;
$nfPath = $uploadDir . DIRECTORY_SEPARATOR . $nfFilename;

if (!move_uploaded_file($nfFile['tmp_name'], $nfPath)) {
    echo json_encode(['success' => false, 'message' => 'Não foi possível salvar a nota fiscal enviada.']);
    exit;
}

$nfRelative = 'uploads/' . $nfFilename;

$stmt = $mysqli->prepare("INSERT INTO chamados (codigo, cliente_nome, cliente_email, cliente_telefone, cliente_cnpj, produto_marca, produto_modelo, produto_serial, produto_data_compra, nf_original, descricao_problema, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aberto')");
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erro ao preparar inserção do chamado.']);
    exit;
}

$stmt->bind_param(
    'sssssssssss',
    $codigo,
    $data['cliente_nome'],
    $data['cliente_email'],
    $data['cliente_telefone'],
    $data['cliente_cnpj'],
    $data['produto_marca'],
    $data['produto_modelo'],
    $data['produto_serial'],
    $data['produto_data_compra'],
    $nfRelative,
    $data['descricao_problema']
);

if (!$stmt->execute()) {
    unlink($nfPath);
    echo json_encode(['success' => false, 'message' => 'Erro ao salvar o chamado: ' . $stmt->error]);
    exit;
}

$chamadoId = $stmt->insert_id;
$stmt->close();

$eventoStmt = $mysqli->prepare("INSERT INTO eventos_chamado (chamado_id, codigo, status, observacao, criado_por) VALUES (?, ?, ?, ?, ?)");
if ($eventoStmt) {
    $status = 'aberto';
    $observacao = 'Chamado registrado pelo cliente.';
    $autor = 'Cliente';
    $eventoStmt->bind_param('issss', $chamadoId, $codigo, $status, $observacao, $autor);
    $eventoStmt->execute();
    $eventoStmt->close();
}

$anexoStmt = $mysqli->prepare("INSERT INTO anexos_chamado (chamado_id, codigo, tipo, arquivo_nome, arquivo_caminho) VALUES (?, ?, ?, ?, ?)");
if ($anexoStmt) {
    $tipo = 'Nota fiscal de compra';
    $originalName = basename($nfFile['name']);
    $anexoStmt->bind_param('issss', $chamadoId, $codigo, $tipo, $originalName, $nfRelative);
    $anexoStmt->execute();
    $anexoStmt->close();
}

if (!empty($_FILES['midia']['name'][0])) {
    $files = $_FILES['midia'];
    $count = count($files['name']);
    for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK || empty($files['name'][$i])) {
            continue;
        }
        if ($files['size'][$i] > $maxFileSize) {
            continue;
        }
        $ext = allowed_extension($files['name'][$i]);
        if (!$ext) {
            continue;
        }
        $filename = $codigo . '_midia_' . ($timestamp + $i) . '.' . $ext;
        $path = $uploadDir . DIRECTORY_SEPARATOR . $filename;
        if (move_uploaded_file($files['tmp_name'][$i], $path)) {
            $relative = 'uploads/' . $filename;
            $insertAnexo = $mysqli->prepare("INSERT INTO anexos_chamado (chamado_id, codigo, tipo, arquivo_nome, arquivo_caminho) VALUES (?, ?, ?, ?, ?)");
            if ($insertAnexo) {
                $tipo = 'Mídia adicional';
                $original = basename($files['name'][$i]);
                $insertAnexo->bind_param('issss', $chamadoId, $codigo, $tipo, $original, $relative);
                $insertAnexo->execute();
                $insertAnexo->close();
            }
        }
    }
}

echo json_encode(['success' => true, 'codigo' => $codigo]);
=======
// Gera código público
$codigo = "KWAN-" . strtoupper(substr(md5(uniqid('',true)),0,8));

// Upload NF compra
$uploadDir = __DIR__ . "/../uploads/";
if(!file_exists($uploadDir)) @mkdir($uploadDir,0755,true);
$nfPath = "";
if(isset($_FILES['nf_compra']) && is_uploaded_file($_FILES['nf_compra']['tmp_name'])){
  $ext = strtolower(pathinfo($_FILES['nf_compra']['name'], PATHINFO_EXTENSION));
  if(!in_array($ext,['pdf','xml'])){ echo json_encode(["success"=>false,"message"=>"NF: apenas PDF ou XML."]); exit; }
  $nomeArquivo = $codigo . "_nfcompra." . $ext;
  $dest = $uploadDir . $nomeArquivo;
  if(!move_uploaded_file($_FILES['nf_compra']['tmp_name'], $dest)){
    echo json_encode(["success"=>false,"message"=>"Falha no upload da NF."]); exit;
  }
  $nfPath = "uploads/" . $nomeArquivo;
}

// Insert
$sql = "INSERT INTO chamados 
(codigo_publico,status,cliente_nome,cliente_email,cliente_telefone,cliente_cnpj,marca,modelo,serial,data_compra,nf_compra,descricao_problema) 
VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";
$stmt = $conn->prepare($sql);
$status = 'aberto';
$stmt->bind_param("ssssssssssss",
  $codigo, $status,
  $_POST['cliente_nome'], $_POST['cliente_email'], $_POST['cliente_telefone'], $_POST['cliente_cnpj'],
  $_POST['marca'], $_POST['modelo'], $_POST['serial'], $_POST['data_compra'], $nfPath, $_POST['descricao_problema']
);
if($stmt->execute()){
  echo json_encode(["success"=>true,"codigo"=>$codigo]);
} else {
  echo json_encode(["success"=>false,"message"=>"Erro ao salvar"]);
}

