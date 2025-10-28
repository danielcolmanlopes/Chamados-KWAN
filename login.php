<?php
// login.php - Autenticação simples para acesso ao dashboard

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

session_start();

if (!empty($_SESSION['usuario'])) {
    header('Location: dashboard.php');
    exit;
}

$erroLogin = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario = $_POST['usuario'] ?? '';
    $senha = $_POST['senha'] ?? '';

    if ($usuario === 'admin' && $senha === 'kwan123') {
        $_SESSION['usuario'] = $usuario;
        header('Location: dashboard.php');
        exit;
    }

    $erroLogin = 'Credenciais inválidas. Tente novamente.';
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Sistema de Chamados KWAN</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
</head>
<body class="bg-light d-flex align-items-center" style="min-height: 100vh;">
<div class="container">
    <div class="row justify-content-center">
        <div class="col-md-4">
            <div class="card shadow-sm">
                <div class="card-body p-4">
                    <h1 class="h4 text-center mb-3">Acesso Restrito</h1>
                    <?php if ($erroLogin !== ''): ?>
                        <div class="alert alert-danger" role="alert">
                            <?= htmlspecialchars($erroLogin, ENT_QUOTES, 'UTF-8'); ?>
                        </div>
                    <?php endif; ?>
                    <form method="post" class="needs-validation" novalidate>
                        <div class="mb-3">
                            <label for="usuario" class="form-label">Usuário</label>
                            <input type="text" id="usuario" name="usuario" class="form-control" required autofocus>
                            <div class="invalid-feedback">Informe o usuário.</div>
                        </div>
                        <div class="mb-3">
                            <label for="senha" class="form-label">Senha</label>
                            <input type="password" id="senha" name="senha" class="form-control" required>
                            <div class="invalid-feedback">Informe a senha.</div>
                        </div>
                        <div class="d-grid">
                            <button type="submit" class="btn btn-primary">Entrar</button>
                        </div>
                    </form>
                    <div class="text-center mt-3">
                        <a href="index.php" class="text-decoration-none">Voltar para o início</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    (() => {
        'use strict';
        const forms = document.querySelectorAll('.needs-validation');
        Array.from(forms).forEach(form => {
            form.addEventListener('submit', event => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    })();
</script>
</body>
</html>
