<?php
header('Content-Type: application/json');
require __DIR__ . '/config.php';

$codigo = $_POST['codigo'] ?? '';
$tipo = $_POST['tipo'] ?? 'outro';
if(!$codigo){ echo json_encode(["success"=>false,"message"=>"Código ausente."]); exit; }

$stmt = $conn->prepare("SELECT id FROM chamados WHERE codigo_publico=? LIMIT 1");
$stmt->bind_param("s",$codigo); $stmt->execute();
$res = $stmt->get_result();
if($res->num_rows===0){ echo json_encode(["success"=>false,"message"=>"Chamado não encontrado."]); exit; }
$cid = $res->fetch_assoc()['id'];

$uploadDir = __DIR__ . "/../uploads/";
if(!file_exists($uploadDir)) @mkdir($uploadDir,0755,true);

if(!isset($_FILES['arquivo']) || !is_uploaded_file($_FILES['arquivo']['tmp_name'])) {
  echo json_encode(["success"=>false,"message"=>"Nenhum arquivo recebido."]); exit;
}
$orig = $_FILES['arquivo']['name'];
$ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
$allow = ['jpg','jpeg','png','pdf','xml','mp4','mp3','wav'];
if(!in_array($ext,$allow)){ echo json_encode(["success"=>false,"message"=>"Tipo de arquivo não permitido."]); exit; }

$nome = $codigo . "_" . time() . "." . $ext;
$destino = $uploadDir . $nome;
if(!move_uploaded_file($_FILES['arquivo']['tmp_name'], $destino)){ echo json_encode(["success"=>false,"message"=>"Falha no upload."]); exit; }

$public = "uploads/" . $nome;
$stmt2 = $conn->prepare("INSERT INTO anexos_chamado (chamado_id,tipo,arquivo_path) VALUES (?,?,?)");
$stmt2->bind_param("iss",$cid,$tipo,$public); $stmt2->execute();

echo json_encode(["success"=>true]);
