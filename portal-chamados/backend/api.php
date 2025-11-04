<?php
header('Content-Type: application/json');
require __DIR__ . '/config.php';

// CAPTCHA
$captcha = $_POST['g-recaptcha-response'] ?? '';
$secretKey = $portalConfig['recaptcha_secret'] ?? null;
if (!$secretKey) { echo json_encode(["success"=>false,"message"=>"Configuração de CAPTCHA ausente."]); exit; }
if (!$captcha) { echo json_encode(["success"=>false,"message"=>"CAPTCHA ausente."]); exit; }
$verify = file_get_contents("https://www.google.com/recaptcha/api/siteverify?secret=" . urlencode($secretKey) . "&response=" . urlencode($captcha));
$resp = json_decode($verify,true);
if(empty($resp['success'])){ echo json_encode(["success"=>false,"message"=>"CAPTCHA inválido."]); exit; }

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
