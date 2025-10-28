<?php
// index.php - Tela inicial para upload da DANFE

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

// Garante que a pasta de uploads temporários exista
$uploadDir = __DIR__ . '/uploads/temp';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Chamados KWAN - Upload DANFE</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
</head>
<body class="bg-light">
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
        <div class="container">
            <span class="navbar-brand">Sistema de Chamados KWAN</span>
            <a class="btn btn-outline-light" href="login.php">Dashboard</a>
        </div>
    </nav>

    <main class="container">
        <div class="row justify-content-center">
            <div class="col-lg-6">
                <div class="card shadow-sm">
                    <div class="card-body p-4">
                        <h1 class="h4 mb-3 text-center">Upload da DANFE</h1>
                        <p class="text-muted text-center">Envie o arquivo PDF da nota fiscal para extrairmos automaticamente as informações.</p>
                        <?php if (!empty($_GET['erro'])): ?>
                            <div class="alert alert-danger" role="alert">
                                <?= htmlspecialchars($_GET['erro'], ENT_QUOTES, 'UTF-8'); ?>
                            </div>
                        <?php endif; ?>
                        <form action="processar.php" method="post" enctype="multipart/form-data" class="needs-validation" novalidate>
                            <div class="mb-3">
                                <label for="danfe" class="form-label">Arquivo da DANFE (PDF)</label>
                                <input class="form-control" type="file" name="danfe" id="danfe" accept="application/pdf" required>
                                <div class="invalid-feedback">Selecione um arquivo PDF válido.</div>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary">Processar PDF</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </main>

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
