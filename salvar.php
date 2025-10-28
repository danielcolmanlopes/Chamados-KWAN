<?php
// salvar.php - Persiste o chamado em arquivos locais

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

$nf = trim($_POST['nf'] ?? '');
$ch = trim($_POST['ch'] ?? '');
$serial = trim($_POST['serial'] ?? '');
$loja = trim($_POST['loja'] ?? '');
$defeito = trim($_POST['defeito'] ?? '');
$arquivoTemp = $_POST['arquivo_temp'] ?? '';
$nomeOriginal = $_POST['nome_original'] ?? 'danfe.pdf';

if ($nf === '' || $defeito === '' || $arquivoTemp === '') {
    header('Location: index.php?erro=' . urlencode('Dados obrigatórios não informados.'));
    exit;
}

if (!is_file($arquivoTemp)) {
    header('Location: index.php?erro=' . urlencode('O arquivo temporário da DANFE não foi localizado.'));
    exit;
}

$tempDirReal = realpath(__DIR__ . '/uploads/temp');
$arquivoTempReal = realpath($arquivoTemp);
if ($tempDirReal === false || $arquivoTempReal === false || strpos($arquivoTempReal, $tempDirReal) !== 0) {
    header('Location: index.php?erro=' . urlencode('Arquivo temporário inválido.'));
    exit;
}

$uploadsBase = __DIR__ . '/uploads';
if (!is_dir($uploadsBase)) {
    mkdir($uploadsBase, 0775, true);
}

$nfSanitizada = preg_replace('/[^0-9A-Za-z_-]/', '_', $nf) ?: 'NF_' . date('YmdHis');
$destinoChamado = $uploadsBase . '/' . $nfSanitizada;

if (!is_dir($destinoChamado) && !mkdir($destinoChamado, 0775, true)) {
    header('Location: index.php?erro=' . urlencode('Não foi possível criar a pasta do chamado.'));
    exit;
}

$pdfNomeDestino = preg_replace('/[^0-9A-Za-z._-]/', '_', $nomeOriginal);
if ($pdfNomeDestino === '' || !str_ends_with(strtolower($pdfNomeDestino), '.pdf')) {
    $pdfNomeDestino = 'danfe.pdf';
}
$pdfDestino = $destinoChamado . '/' . $pdfNomeDestino;

if (file_exists($pdfDestino)) {
    $baseNome = pathinfo($pdfNomeDestino, PATHINFO_FILENAME);
    $contador = 1;
    do {
        $pdfNomeDestino = $baseNome . '_' . $contador . '.pdf';
        $pdfDestino = $destinoChamado . '/' . $pdfNomeDestino;
        $contador++;
    } while (file_exists($pdfDestino));
}

if (!rename($arquivoTemp, $pdfDestino)) {
    unlink($arquivoTemp);
    header('Location: index.php?erro=' . urlencode('Não foi possível salvar o PDF da DANFE.'));
    exit;
}

$evidencias = [];
if (!empty($_FILES['evidencias']) && is_array($_FILES['evidencias']['name'])) {
    $evidenciasDir = $destinoChamado . '/evidencias';
    if (!is_dir($evidenciasDir)) {
        mkdir($evidenciasDir, 0775, true);
    }

    $quantidade = count($_FILES['evidencias']['name']);
    for ($i = 0; $i < $quantidade; $i++) {
        if (($_FILES['evidencias']['error'][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }

        $tmpName = $_FILES['evidencias']['tmp_name'][$i];
        $original = $_FILES['evidencias']['name'][$i];
        $extensao = strtolower(pathinfo($original, PATHINFO_EXTENSION));

        $tiposPermitidos = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'mp4' => 'video/mp4',
        ];

        if (!array_key_exists($extensao, $tiposPermitidos)) {
            continue;
        }

        $finfoEvidencia = finfo_open(FILEINFO_MIME_TYPE);
        $mimeArquivo = $finfoEvidencia ? finfo_file($finfoEvidencia, $tmpName) : null;
        if ($finfoEvidencia) {
            finfo_close($finfoEvidencia);
        }

        if ($mimeArquivo !== null && strpos($mimeArquivo, explode('/', $tiposPermitidos[$extensao])[0]) !== 0) {
            continue;
        }

        $novoNome = preg_replace('/[^0-9A-Za-z._-]/', '_', pathinfo($original, PATHINFO_FILENAME));
        $novoNomeCompleto = $novoNome . '_' . uniqid() . '.' . $extensao;
        $destinoArquivo = $evidenciasDir . '/' . $novoNomeCompleto;

        if (is_uploaded_file($tmpName) && move_uploaded_file($tmpName, $destinoArquivo)) {
            $evidencias[] = 'evidencias/' . $novoNomeCompleto;
        }
    }
}

$dadosChamado = [
    'nf' => $nf,
    'ch' => $ch,
    'serial' => $serial,
    'loja' => $loja,
    'defeito' => $defeito,
    'arquivo_pdf' => basename($pdfDestino),
    'arquivo_pdf_caminho' => basename($destinoChamado) . '/' . basename($pdfDestino),
    'nome_pdf_original' => $nomeOriginal,
    'data_abertura' => date('c'),
    'status' => 'Aberto',
    'evidencias' => $evidencias,
];

$dadosJson = json_encode($dadosChamado, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if ($dadosJson === false || file_put_contents($destinoChamado . '/dados.json', $dadosJson) === false) {
    header('Location: index.php?erro=' . urlencode('Não foi possível salvar os dados do chamado.'));
    exit;
}

header('Location: dashboard.php?nf=' . urlencode($nfSanitizada));
exit;
