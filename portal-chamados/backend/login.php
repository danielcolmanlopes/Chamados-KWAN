<?php
session_start();
require __DIR__ . '/config.php';
$conn = $mysqli;
require __DIR__ . '/seed_admin.php';

if (!empty($_SESSION['usuario_id'])) {
    header('Location: admin.php');
    exit;
}

$erro = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $senha = $_POST['senha'] ?? '';

    if (!$email || $senha === '') {
        $erro = 'Informe e-mail e senha.';
    } else {
        $senhaHash = hash('sha256', $senha);
        $stmt = $mysqli->prepare('SELECT id, nome, email FROM usuarios WHERE email = ? AND senha_hash = ? LIMIT 1');
        if ($stmt) {
            $stmt->bind_param('ss', $email, $senhaHash);
            $stmt->execute();
            $resultado = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if ($resultado) {
                $_SESSION['usuario_id'] = $resultado['id'];
                $_SESSION['usuario_nome'] = $resultado['nome'];
                $_SESSION['usuario_email'] = $resultado['email'];
                header('Location: admin.php');
                exit;
            }
        }
        $erro = 'Credenciais inválidas.';
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Administrativo - KWAN</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
    <main class="form-page">
        <div class="container narrow">
            <div class="admin-card">
                <h1>Área Administrativa KWAN</h1>
                <p class="muted">Informe suas credenciais para acessar os chamados.</p>
                <div class="alert info">
                    <strong>Credenciais padrão:</strong> admin@kwansolucoes.com.br / kwan123
                </div>
                <?php if ($erro): ?>
                    <div class="alert error"><?php echo htmlspecialchars($erro, ENT_QUOTES, 'UTF-8'); ?></div>
                <?php endif; ?>
                <form method="post" class="admin-login">
                    <label>E-mail
                        <input type="email" name="email" required autofocus>
                    </label>
                    <label>Senha
                        <input type="password" name="senha" required>
                    </label>
                    <button type="submit" class="btn primary">Entrar</button>
                </form>
                <p class="caption" style="margin-top:1rem;">
                    <a href="../index.html">Voltar ao portal</a>
                </p>
            </div>
        </div>
    </main>
</body>
</html>
