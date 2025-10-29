<?php
error_reporting(E_ALL); ini_set('display_errors',1);
session_start();
require __DIR__ . '/config.php';

if($_SERVER['REQUEST_METHOD']==='POST'){
  $email = $_POST['email'] ?? '';
  $senha = $_POST['senha'] ?? '';
  $stmt = $conn->prepare("SELECT * FROM usuarios WHERE email=?");
  $stmt->bind_param("s",$email); $stmt->execute();
  $res = $stmt->get_result();
  if($res->num_rows===1){
    $u = $res->fetch_assoc();
    if(hash('sha256',$senha)===$u['senha_hash']){
      $_SESSION['usuario_id']=$u['id']; $_SESSION['usuario_nome']=$u['nome'];
      header('Location: admin.php'); exit;
    } else { $erro="Senha incorreta."; }
  } else { $erro="Usuário não encontrado."; }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Login - KWAN</title>
<link rel="icon" href="../assets/img/quadrado.png">
<link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
<header><img src="../assets/img/kwan_logotipo_pq.png" alt="KWAN"></header>
<main class="container">
  <h1>Painel KWAN</h1>
  <?php if(isset($erro)) echo "<div class='alert error'>$erro</div>"; ?>
  <form method="POST">
    <input type="email" name="email" placeholder="E-mail" required>
    <input type="password" name="senha" placeholder="Senha" required>
    <button type="submit">Entrar</button>
  </form>
</main>
<footer>© 2025 KWAN Soluções em Automação</footer>
</body>
</html>
