<?php
require __DIR__ . '/auth.php';
require __DIR__ . '/config.php';

$statuses = [
    'aberto','triado','aguardando_nf_remessa','aguardando_envio','em_transporte_para_kwan','recebido_na_kwan','em_analise_tecnica',
    'aguardando_aprovacao','aprovado','reprovado','aguardando_pagamento','em_reparo','reparo_concluido','em_teste_qualidade',
    'em_devolucao','em_transito_para_cliente','entregue_ao_cliente','testado_no_cliente','encerrado_com_reparo','encerrado_sem_reparo',
    'encerrado_com_descarte','cancelado'
];

$busca = sanitize_text($_GET['q'] ?? '');

$sql = "SELECT id, codigo, cliente_nome, cliente_email, produto_marca, produto_modelo, status, created_at FROM chamados";
$params = [];
$types = '';

if ($busca !== '') {
    $sql .= " WHERE codigo LIKE ? OR cliente_email LIKE ? OR cliente_nome LIKE ?";
    $like = '%' . $busca . '%';
    $params = [$like, $like, $like];
    $types = 'sss';
}

$sql .= " ORDER BY created_at DESC LIMIT 100";

$stmt = $mysqli->prepare($sql);
if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$chamados = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Administrativo - KWAN</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
<header class="topbar">
    <div class="container flex-between">
        <div class="logo-area">
            <img src="../assets/img/kwan_logotipo_pq.png" alt="KWAN" class="logo-sm" style="display:block;">
        </div>
        <div class="header-actions">
            <span class="muted">Olá, <?php echo htmlspecialchars($_SESSION['usuario_nome'], ENT_QUOTES, 'UTF-8'); ?></span>
            <a href="logout.php" class="btn outline small">Sair</a>
        </div>
    </div>
</header>

<main class="form-page">
    <div class="container">
        <div class="admin-layout">
            <div class="admin-card">
                <div class="admin-header">
                    <h1>Chamados recentes</h1>
                </div>
                <form method="get" class="inline" style="margin-bottom:1.5rem;">
                    <label>Buscar por código, cliente ou e-mail
                        <input type="search" name="q" value="<?php echo htmlspecialchars($busca, ENT_QUOTES, 'UTF-8'); ?>" placeholder="Ex.: KWAN-1234, cliente@kwan.com">
                    </label>
                    <button type="submit" class="btn primary small">Buscar</button>
                </form>
                <div class="table-wrapper">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Cliente</th>
                                <th>E-mail</th>
                                <th>Produto</th>
                                <th>Status</th>
                                <th>Abertura</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($chamados)): ?>
                                <tr><td colspan="7">Nenhum chamado encontrado.</td></tr>
                            <?php else: ?>
                                <?php foreach ($chamados as $linha): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($linha['codigo'], ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo htmlspecialchars($linha['cliente_nome'], ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo htmlspecialchars($linha['cliente_email'], ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo htmlspecialchars($linha['produto_marca'] . ' / ' . $linha['produto_modelo'], ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><span class="badge status-admin"><?php echo htmlspecialchars(str_replace('_',' ', $linha['status']), ENT_QUOTES, 'UTF-8'); ?></span></td>
                                        <td><?php echo htmlspecialchars(date('d/m/Y H:i', strtotime($linha['created_at'])), ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><a href="admin_ver.php?c=<?php echo urlencode($linha['codigo']); ?>" class="btn outline small">Ver</a></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</main>
</body>
</html>
