<?php
// processar.php - Recebe o PDF, extrai dados e exibe formulário de confirmação

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

if (!isset($_FILES['danfe']) || $_FILES['danfe']['error'] !== UPLOAD_ERR_OK) {
    header('Location: index.php?erro=' . urlencode('Erro ao enviar o arquivo PDF.'));
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = $finfo ? finfo_file($finfo, $_FILES['danfe']['tmp_name']) : mime_content_type($_FILES['danfe']['tmp_name']);
if ($finfo) {
    finfo_close($finfo);
}

if (!in_array($mimeType, ['application/pdf', 'application/x-pdf'], true)) {
    header('Location: index.php?erro=' . urlencode('O arquivo precisa ser um PDF válido.'));
    exit;
}

$tempDir = __DIR__ . '/uploads/temp';
if (!is_dir($tempDir)) {
    mkdir($tempDir, 0775, true);
}

$originalName = basename($_FILES['danfe']['name']);
$tempFile = $tempDir . '/' . uniqid('danfe_', true) . '.pdf';

if (!move_uploaded_file($_FILES['danfe']['tmp_name'], $tempFile)) {
    header('Location: index.php?erro=' . urlencode('Falha ao mover o arquivo enviado.'));
    exit;
}

$autoloadPath = __DIR__ . '/vendor/autoload.php';
if (!is_file($autoloadPath)) {
    unlink($tempFile);
    header('Location: index.php?erro=' . urlencode('Dependências não instaladas. Execute "composer install".'));
    exit;
}

require_once $autoloadPath;

use Smalot\PdfParser\Parser;

$textContent = '';
try {
    $parser = new Parser();
    $pdf = $parser->parseFile($tempFile);
    $textContent = $pdf->getText();
} catch (Throwable $exception) {
    unlink($tempFile);
    header('Location: index.php?erro=' . urlencode('Não foi possível ler o PDF. Detalhes: ' . $exception->getMessage()));
    exit;
}

$nf = extractField($textContent, [
    '/NF\s*(?:n[oº]\.?|numero)?\s*[:\-]?\s*(\d{4,})/i',
    '/Nota\s+Fiscal\s*(?:n[oº]\.?|numero)?\s*[:\-]?\s*(\d{4,})/i',
]);

$chave = extractField($textContent, [
    '/CH(?:AVE)?\s*(?:de)?\s*(?:Acesso)?\s*[:\-]?\s*([0-9]{6,})/i',
    '/Chave\s*de\s*Acesso\s*[:\-]?\s*([0-9]{6,})/i',
]);

$serial = extractField($textContent, [
    '/Serial\s*(?:n[oº]\.?|number|nº)?\s*[:\-]?\s*([A-Z0-9\-]{4,})/i',
    '/S[ée]rie\s*(?:n[oº]\.?|number|nº)?\s*[:\-]?\s*([A-Z0-9\-]{4,})/i',
]);

$loja = extractLineAfterKeyword($textContent, ['Loja', 'Filial', 'Empresa']);

function extractField(string $text, array $patterns): string
{
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $text, $matches)) {
            return trim($matches[1]);
        }
    }

    return '';
}

function extractLineAfterKeyword(string $text, array $keywords): string
{
    $lines = preg_split('/[\r\n]+/', $text) ?: [];
    foreach ($lines as $line) {
        foreach ($keywords as $keyword) {
            if (stripos($line, $keyword) !== false) {
                return trim(preg_replace('/\s+/', ' ', $line));
            }
        }
    }

    return '';
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmar Dados - Sistema de Chamados KWAN</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
</head>
<body class="bg-light">
<nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
    <div class="container">
        <a class="navbar-brand" href="index.php">Sistema de Chamados KWAN</a>
    </div>
</nav>

<main class="container">
    <div class="row justify-content-center">
        <div class="col-lg-8">
            <div class="card shadow-sm">
                <div class="card-body p-4">
                    <h1 class="h4 mb-3">Confirme os dados extraídos</h1>
                    <p class="text-muted">Revise os campos e preencha a descrição do defeito antes de salvar o chamado.</p>
                    <form action="salvar.php" method="post" enctype="multipart/form-data" class="needs-validation" novalidate>
                        <input type="hidden" name="arquivo_temp" value="<?= htmlspecialchars($tempFile, ENT_QUOTES, 'UTF-8'); ?>">
                        <input type="hidden" name="nome_original" value="<?= htmlspecialchars($originalName, ENT_QUOTES, 'UTF-8'); ?>">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="nf" class="form-label">Número da NF</label>
                                <input type="text" class="form-control" id="nf" name="nf" value="<?= htmlspecialchars($nf, ENT_QUOTES, 'UTF-8'); ?>" required>
                                <div class="invalid-feedback">Informe o número da nota fiscal.</div>
                            </div>
                            <div class="col-md-6">
                                <label for="ch" class="form-label">Chave</label>
                                <input type="text" class="form-control" id="ch" name="ch" value="<?= htmlspecialchars($chave, ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="col-md-6">
                                <label for="serial" class="form-label">Serial</label>
                                <input type="text" class="form-control" id="serial" name="serial" value="<?= htmlspecialchars($serial, ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="col-md-6">
                                <label for="loja" class="form-label">Loja</label>
                                <input type="text" class="form-control" id="loja" name="loja" value="<?= htmlspecialchars($loja, ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="col-12">
                                <label for="defeito" class="form-label">Descrição do defeito</label>
                                <textarea class="form-control" id="defeito" name="defeito" rows="3" required></textarea>
                                <div class="invalid-feedback">Descreva o defeito encontrado.</div>
                            </div>
                            <div class="col-12">
                                <label for="evidencias" class="form-label">Evidências (imagens ou vídeos)</label>
                                <input class="form-control" type="file" id="evidencias" name="evidencias[]" accept="image/jpeg,image/png,video/mp4" multiple>
                                <small class="text-muted">Formatos permitidos: JPG, PNG e MP4.</small>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-4">
                            <a class="btn btn-outline-secondary" href="index.php">Voltar</a>
                            <button type="submit" class="btn btn-success">Salvar Chamado</button>
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
