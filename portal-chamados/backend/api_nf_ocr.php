<?php
declare(strict_types=1);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

require __DIR__ . '/config.php';

$autoloadPath = __DIR__ . '/../../vendor/autoload.php';
if (is_file($autoloadPath)) {
    require_once $autoloadPath;
}

use Smalot\PdfParser\Parser;

function respond_with_error(string $message, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

if (!isset($_FILES['nf_arquivo'])) {
    respond_with_error('Envie um arquivo PDF da nota fiscal para análise.');
}

$file = $_FILES['nf_arquivo'];

if (!empty($file['error']) && $file['error'] !== UPLOAD_ERR_OK) {
    respond_with_error('Falha ao receber o arquivo. Tente novamente.');
}

$extension = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
if ($extension !== 'pdf') {
    respond_with_error('Apenas arquivos PDF devem ser enviados para processamento no servidor.');
}

if (($file['size'] ?? 0) > 10 * 1024 * 1024) {
    respond_with_error('O arquivo informado excede o limite de 10MB.');
}

$temporaryPath = $file['tmp_name'] ?? '';
if ($temporaryPath === '' || !is_file($temporaryPath)) {
    respond_with_error('Arquivo temporário inválido.');
}

try {
    if (!class_exists(Parser::class)) {
        throw new RuntimeException('Componente de leitura de PDF não disponível.');
    }

    $parser = new Parser();
    $pdf = $parser->parseFile($temporaryPath);
    $text = trim($pdf->getText());

    if ($text === '') {
        respond_with_error('Não foi possível extrair texto do PDF enviado.', 422);
    }

    echo json_encode([
        'success' => true,
        'text' => $text,
    ]);
} catch (Throwable $exception) {
    error_log('Falha na leitura de NF PDF: ' . $exception->getMessage());
    respond_with_error('Não foi possível processar o PDF informado. Valide o arquivo e tente novamente.', 500);
}
