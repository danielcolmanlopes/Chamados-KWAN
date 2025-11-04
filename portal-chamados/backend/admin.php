<?php
include __DIR__ . '/auth.php';
include __DIR__ . '/config.php';

if (!function_exists('portal_escape')) {
  function portal_escape($value) {
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
  }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Painel - Portal KWAN</title>
<link rel="icon" href="../assets/img/quadrado.png">
<link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
<header><img src="../assets/img/kwan_logotipo_v1.png" alt="KWAN"></header>
<main class="container">
  <h1>Painel de Chamados</h1>
  <p>Bem-vindo, <b><?=portal_escape($_SESSION['usuario_nome'] ?? '')?></b> | <a href="logout.php">Sair</a></p>
  <form method="GET">
    <input type="text" name="busca" placeholder="Buscar por código, cliente ou modelo">
    <button type="submit">Buscar</button>
  </form>
  <?php
    if(!empty($_GET['busca'])){
      $b = "%".$_GET['busca']."%";
      $stmt = $conn->prepare("SELECT * FROM chamados WHERE cliente_nome LIKE ? OR modelo LIKE ? OR codigo_publico LIKE ? ORDER BY id DESC");
      $stmt->bind_param("sss",$b,$b,$b);
    } else {
      $stmt = $conn->prepare("SELECT * FROM chamados ORDER BY id DESC LIMIT 50");
    }
    $stmt->execute(); $result = $stmt->get_result();
  ?>
  <table>
    <tr><th>Código</th><th>Cliente</th><th>Produto</th><th>Status</th><th>Ações</th></tr>
    <?php while($c = $result->fetch_assoc()): ?>
      <tr>
        <td><?=portal_escape($c['codigo_publico'])?></td>
        <td><?=portal_escape($c['cliente_nome'])?></td>
        <td><?=portal_escape($c['marca'])?> <?=portal_escape($c['modelo'])?></td>
        <td class="status"><?=portal_escape($c['status'])?></td>
        <td><a href="admin_ver.php?c=<?=portal_escape(urlencode($c['codigo_publico']))?>">Abrir</a></td>
      </tr>
    <?php endwhile; ?>
  </table>
</main>
<footer>© 2025 KWAN Soluções em Automação</footer>
</body>
</html>
