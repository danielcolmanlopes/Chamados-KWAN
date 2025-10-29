<?php
include __DIR__ . '/auth.php'; include __DIR__ . '/config.php';
$codigo = $_GET['c'] ?? '';
if(!$codigo){ echo "Código ausente."; exit; }
$stmt = $conn->prepare("SELECT * FROM chamados WHERE codigo_publico=?");
$stmt->bind_param("s",$codigo); $stmt->execute(); $res = $stmt->get_result();
if($res->num_rows===0){ echo "Chamado não encontrado."; exit; }
$ch = $res->fetch_assoc();

if($_SERVER['REQUEST_METHOD']==='POST'){
  $novo = $_POST['status'] ?? $ch['status'];
  $obs = $_POST['obs'] ?? '';
  $stmtU = $conn->prepare("UPDATE chamados SET status=?, data_ultima_atualizacao=NOW() WHERE id=?");
  $stmtU->bind_param("si",$novo,$ch['id']); $stmtU->execute();

  $stmtE = $conn->prepare("INSERT INTO eventos_chamado (chamado_id,de_status,para_status,motivo,usuario) VALUES (?,?,?,?,?)");
  $stmtE->bind_param("issss",$ch['id'],$ch['status'],$novo,$obs,$_SESSION['usuario_nome']); $stmtE->execute();

  header("Location: admin_ver.php?c=".$codigo); exit;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><title>Chamado <?=$ch['codigo_publico']?></title>
<link rel="icon" href="../assets/img/quadrado.png">
<link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
<header><img src="../assets/img/kwan_logotipo_v1.png" alt="KWAN"></header>
<main class="container">
  <h2>Chamado <?=$ch['codigo_publico']?></h2>
  <p><b>Cliente:</b> <?=$ch['cliente_nome']?> (<?=$ch['cliente_email']?>)</p>
  <p><b>Produto:</b> <?=$ch['marca']?> <?=$ch['modelo']?> — Serial: <?=$ch['serial']?></p>
  <p><b>Problema:</b> <?=$ch['descricao_problema']?></p>
  <p><b>Status atual:</b> <b><?=$ch['status']?></b></p>

  <form method="POST">
    <label>Novo status:</label>
    <select name="status">
      <option value="triado">Triado</option>
      <option value="aguardando_nf_remessa">Aguardando NF Remessa</option>
      <option value="aguardando_envio">Aguardando Envio</option>
      <option value="em_transporte_para_kwan">Em Transporte</option>
      <option value="recebido_na_kwan">Recebido</option>
      <option value="em_analise_tecnica">Em Análise</option>
      <option value="aguardando_aprovacao">Aguardando Aprovação</option>
      <option value="aprovado">Aprovado</option>
      <option value="reprovado">Reprovado</option>
      <option value="aguardando_pagamento">Aguardando Pagamento</option>
      <option value="em_reparo">Em Reparo</option>
      <option value="reparo_concluido">Reparo Concluído</option>
      <option value="em_teste_qualidade">Em Teste</option>
      <option value="em_devolucao">Em Devolução</option>
      <option value="em_transito_para_cliente">Em Trânsito p/ Cliente</option>
      <option value="entregue_ao_cliente">Entregue ao Cliente</option>
      <option value="testado_no_cliente">Testado no Cliente</option>
      <option value="encerrado_com_reparo">Encerrado (Com Reparo)</option>
      <option value="encerrado_sem_reparo">Encerrado (Sem Reparo)</option>
      <option value="encerrado_com_descarte">Encerrado (Descarte)</option>
      <option value="cancelado">Cancelado</option>
    </select>
    <textarea name="obs" placeholder="Observação..."></textarea>
    <button type="submit">Atualizar</button>
  </form>

  <hr>
  <a href="admin.php">← Voltar</a>
</main>
<footer>© 2025 KWAN Soluções em Automação</footer>
</body>
</html>
