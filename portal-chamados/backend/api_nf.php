<?php
header('Content-Type: application/json');
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

function respond_with_error(string $message, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

function parse_decimal_value($value, int $scale = 2): ?float
{
    if ($value === null) {
        return null;
    }

    $normalized = trim((string) $value);
    if ($normalized === '') {
        return null;
    }

    $normalized = str_replace(['R$', 'r$', '%'], '', $normalized);
    $normalized = preg_replace('/\s+/', '', $normalized);

    $hasComma = strpos($normalized, ',') !== false;
    $hasDot = strpos($normalized, '.') !== false;

    if ($hasComma && $hasDot) {
        $normalized = str_replace('.', '', $normalized);
        $normalized = str_replace(',', '.', $normalized);
    } elseif ($hasComma) {
        $normalized = str_replace(',', '.', $normalized);
    }

    if (!is_numeric($normalized)) {
        return null;
    }

    $number = (float) $normalized;
    return round($number, $scale);
}

function sanitize_document(?string $value): string
{
    return preg_replace('/\D+/', '', (string) $value);
}

$numero = sanitize_text($_POST['numero_nf'] ?? '');
$serie = sanitize_text($_POST['serie'] ?? '');
$estado = strtoupper(sanitize_text($_POST['estado_emissor'] ?? ''));
$dataEmissao = sanitize_text($_POST['data_emissao'] ?? '');
$transportadora = sanitize_text($_POST['transportadora'] ?? '');
$percentualIcms = parse_decimal_value($_POST['percentual_icms'] ?? null, 4);
$valorIcms = parse_decimal_value($_POST['valor_icms'] ?? null, 2);
$percentualIpi = parse_decimal_value($_POST['percentual_ipi'] ?? null, 4);
$valorIpi = parse_decimal_value($_POST['valor_ipi'] ?? null, 2);
$emitenteNome = sanitize_text($_POST['emitente_nome'] ?? '');
$emitenteDocumento = sanitize_document($_POST['emitente_cnpj'] ?? '');
$destinatarioNome = sanitize_text($_POST['destinatario_nome'] ?? '');
$destinatarioDocumento = sanitize_document($_POST['destinatario_cnpj'] ?? '');
$numeroPedido = sanitize_text($_POST['numero_pedido'] ?? '');
$numeroSerie = strtoupper(sanitize_text($_POST['numero_serie'] ?? ''));
$codigoKwan = strtoupper(sanitize_text($_POST['codigo_kwan'] ?? ''));
$numeroSerie = preg_replace('/\s+/', '', $numeroSerie);
$codigoKwan = preg_replace('/[^A-Z0-9-]/', '', $codigoKwan);
$valorTotal = parse_decimal_value($_POST['valor_total'] ?? null, 2);

if ($numero === '' || $serie === '' || $estado === '' || $dataEmissao === '' || $transportadora === '') {
    respond_with_error('Preencha todos os campos obrigatórios da nota fiscal.');
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataEmissao)) {
    respond_with_error('Data de emissão inválida.');
}

$estadosValidos = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

if (!in_array($estado, $estadosValidos, true)) {
    respond_with_error('Estado emissor inválido.');
}

if ($percentualIcms === null || $valorIcms === null || $percentualIpi === null || $valorIpi === null) {
    respond_with_error('Informe os valores de ICMS e IPI.');
}

if ($percentualIcms < 0 || $valorIcms < 0 || $percentualIpi < 0 || $valorIpi < 0) {
    respond_with_error('Os valores de impostos devem ser positivos.');
}

if ($emitenteNome === '' || $emitenteDocumento === '') {
    respond_with_error('Informe os dados completos do emitente.');
}

if ($destinatarioNome === '' || $destinatarioDocumento === '') {
    respond_with_error('Informe os dados completos do destinatário.');
}

if (!preg_match('/^(\d{11}|\d{14})$/', $emitenteDocumento)) {
    respond_with_error('Documento do emitente inválido.');
}

if (!preg_match('/^(\d{11}|\d{14})$/', $destinatarioDocumento)) {
    respond_with_error('Documento do destinatário inválido.');
}

$numeroPedido = $numeroPedido !== '' ? $numeroPedido : null;
$numeroSerie = $numeroSerie !== '' ? $numeroSerie : null;

if ($codigoKwan !== '') {
    if (strpos($codigoKwan, 'KWAN') !== 0) {
        $codigoKwan = 'KWAN-' . ltrim($codigoKwan, '-');
    } elseif (strpos($codigoKwan, 'KWAN-') !== 0) {
        $codigoKwan = 'KWAN-' . substr($codigoKwan, 4);
    }
    if ($codigoKwan === 'KWAN-') {
        $codigoKwan = null;
    }
} else {
    $codigoKwan = null;
}

$itens = $_POST['itens'] ?? [];
if (!is_array($itens) || empty($itens)) {
    respond_with_error('Adicione pelo menos um item à nota fiscal.');
}

$itensLimpos = [];
foreach ($itens as $item) {
    if (!is_array($item)) {
        continue;
    }
    $descricao = sanitize_text($item['descricao'] ?? '');
    $quantidade = parse_decimal_value($item['quantidade'] ?? null, 3);
    $valorUnitario = parse_decimal_value($item['valor_unitario'] ?? null, 2);
    $pedido = sanitize_text($item['pedido'] ?? '');

    if ($descricao === '' || $quantidade === null || $valorUnitario === null) {
        respond_with_error('Preencha todos os campos de cada item.');
    }

    if ($quantidade <= 0 || $valorUnitario < 0) {
        respond_with_error('Informe quantidade e valor unitário válidos para os itens.');
    }

    $valorTotalCalculado = round($quantidade * $valorUnitario, 2);
    $pedidoNormalizado = $pedido !== '' ? $pedido : null;

    $itensLimpos[] = [
        'descricao' => $descricao,
        'quantidade' => $quantidade,
        'valor_unitario' => $valorUnitario,
        'valor_total' => $valorTotalCalculado,
        'pedido' => $pedidoNormalizado,
    ];
}

if (empty($itensLimpos)) {
    respond_with_error('Adicione pelo menos um item válido à nota fiscal.');
}

if ($valorTotal === null) {
    $valorTotal = array_reduce(
        $itensLimpos,
        static fn (float $carry, array $item): float => $carry + $item['valor_total'],
        0.0
    );
}

$valorTotal = round((float) $valorTotal, 2);

if ($valorTotal <= 0) {
    respond_with_error('Informe um valor total válido para a nota fiscal.');
}

try {
    $mysqli->begin_transaction();

    $stmt = $mysqli->prepare('INSERT INTO notas_fiscais (numero, serie, estado_emissor, data_emissao, transportadora, percentual_icms, valor_icms, percentual_ipi, valor_ipi, emitente_nome, emitente_documento, destinatario_nome, destinatario_documento, numero_pedido, numero_serie, codigo_kwan, valor_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    if (!$stmt) {
        throw new RuntimeException('Falha ao preparar a inserção da nota fiscal.');
    }

    $stmt->bind_param(
        'sssssddddsssssssd',
        $numero,
        $serie,
        $estado,
        $dataEmissao,
        $transportadora,
        $percentualIcms,
        $valorIcms,
        $percentualIpi,
        $valorIpi,
        $emitenteNome,
        $emitenteDocumento,
        $destinatarioNome,
        $destinatarioDocumento,
        $numeroPedido,
        $numeroSerie,
        $codigoKwan,
        $valorTotal
    );

    if (!$stmt->execute()) {
        throw new RuntimeException('Não foi possível salvar a nota fiscal.');
    }

    $notaId = $stmt->insert_id;
    $stmt->close();

    $itemStmt = $mysqli->prepare('INSERT INTO notas_fiscais_itens (nota_fiscal_id, descricao, quantidade, valor_unitario, valor_total, pedido) VALUES (?, ?, ?, ?, ?, ?)');
    if (!$itemStmt) {
        throw new RuntimeException('Falha ao preparar a inserção dos itens.');
    }

    $notaIdParam = $notaId;
    $descricaoItem = '';
    $quantidadeItem = 0.0;
    $valorUnitarioItem = 0.0;
    $valorTotalItem = 0.0;
    $pedidoItem = null;

    $itemStmt->bind_param('isddds', $notaIdParam, $descricaoItem, $quantidadeItem, $valorUnitarioItem, $valorTotalItem, $pedidoItem);

    foreach ($itensLimpos as $itemLimpo) {
        $descricaoItem = $itemLimpo['descricao'];
        $quantidadeItem = $itemLimpo['quantidade'];
        $valorUnitarioItem = $itemLimpo['valor_unitario'];
        $valorTotalItem = $itemLimpo['valor_total'];
        $pedidoItem = $itemLimpo['pedido'];

        if (!$itemStmt->execute()) {
            throw new RuntimeException('Não foi possível salvar os itens da nota fiscal.');
        }
    }

    $itemStmt->close();
    $mysqli->commit();

    echo json_encode(['success' => true]);
} catch (Throwable $exception) {
    $mysqli->rollback();
    respond_with_error('Erro ao salvar a nota fiscal. Tente novamente.', 500);
}
