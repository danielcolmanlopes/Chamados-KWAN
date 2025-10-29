<?php
header('Content-Type: application/json');
require __DIR__ . '/config.php';

if($_SERVER['REQUEST_METHOD']==='GET'){
  $codigo = $_GET['c'] ?? '';
  if(!$codigo){ echo json_encode(["success"=>false,"message"=>"Código ausente."]); exit; }

  $stmt = $conn->prepare("SELECT * FROM chamados WHERE codigo_publico=? LIMIT 1");
  $stmt->bind_param("s",$codigo);
  $stmt->execute();
  $res = $stmt->get_result();
  if($res->num_rows===0){ echo json_encode(["success"=>false,"message"=>"Chamado não encontrado."]); exit; }
  $ch = $res->fetch_assoc();

  // mensagens
  $mens = [];
  $stmtm = $conn->prepare("SELECT autor,mensagem FROM mensagens_chamado WHERE chamado_id=? ORDER BY id DESC");
  $stmtm->bind_param("i",$ch['id']); $stmtm->execute();
  $rm = $stmtm->get_result();
  while($m=$rm->fetch_assoc()) $mens[]=$m;

  // eventos
  $evts = [];
  $stmte = $conn->prepare("SELECT para_status, criado_em FROM eventos_chamado WHERE chamado_id=? ORDER BY id DESC");
  $stmte->bind_param("i",$ch['id']); $stmte->execute();
  $re = $stmte->get_result();
  while($e=$re->fetch_assoc()) $evts[]=["data"=>$e['criado_em'],"texto"=>$e['para_status']];

  echo json_encode(["success"=>true,"chamado"=>$ch,"mensagens"=>$mens,"eventos"=>$evts]);
  exit;
}

if($_SERVER['REQUEST_METHOD']==='POST'){
  $codigo = $_POST['codigo'] ?? '';
  $mensagem = trim($_POST['mensagem'] ?? '');
  if(!$codigo || !$mensagem){ echo json_encode(["success"=>false,"message"=>"Dados incompletos."]); exit; }

  $stmt = $conn->prepare("SELECT id FROM chamados WHERE codigo_publico=? LIMIT 1");
  $stmt->bind_param("s",$codigo); $stmt->execute();
  $res = $stmt->get_result();
  if($res->num_rows===0){ echo json_encode(["success"=>false,"message"=>"Chamado não encontrado."]); exit; }
  $cid = $res->fetch_assoc()['id'];

  $stmt2 = $conn->prepare("INSERT INTO mensagens_chamado (chamado_id,autor,mensagem,visibilidade) VALUES (?, 'cliente', ?, 'publica')");
  $stmt2->bind_param("is",$cid,$mensagem); $stmt2->execute();
  echo json_encode(["success"=>true]); exit;
}
