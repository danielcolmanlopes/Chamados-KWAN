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

function sanitize_document($value): string
{
    $digits = preg_replace('/\D+/', '', (string) ($value ?? ''));
    return $digits ?? '';
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
$valorTotalInformado = parse_decimal_value($_POST['valor_total'] ?? null, 2);

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

$emitenteDocumentoValido = strlen($emitenteDocumento) === 14 || strlen($emitenteDocumento) === 11;
$destinatarioDocumentoValido = strlen($destinatarioDocumento) === 14 || strlen($destinatarioDocumento) === 11;

if ($emitenteNome === '' || !$emitenteDocumentoValido) {
    respond_with_error('Informe os dados completos do emitente.');
}

if ($destinatarioNome === '' || !$destinatarioDocumentoValido) {
    respond_with_error('Informe os dados completos do destinatário.');
}

if ($percentualIcms === null || $valorIcms === null || $percentualIpi === null || $valorIpi === null) {
    respond_with_error('Informe os valores de ICMS e IPI.');
}

if ($percentualIcms < 0 || $valorIcms < 0 || $percentualIpi < 0 || $valorIpi < 0) {
    respond_with_error('Os valores de impostos devem ser positivos.');
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

    if ($descricao === '' || $quantidade === null || $valorUnitario === null) {
        respond_with_error('Preencha todos os campos de cada item.');
    }

    if ($quantidade <= 0 || $valorUnitario < 0) {
        respond_with_error('Informe quantidade e valor unitário válidos para os itens.');
    }

    $valorTotal = round($quantidade * $valorUnitario, 2);

    $itensLimpos[] = [
        'descricao' => $descricao,
        'quantidade' => $quantidade,
        'valor_unitario' => $valorUnitario,
        'valor_total' => $valorTotal,
    ];
}

if (empty($itensLimpos)) {
    respond_with_error('Adicione pelo menos um item válido à nota fiscal.');
}

$valorTotal = $valorTotalInformado;
if ($valorTotal === null || $valorTotal <= 0) {
    $valorTotal = array_reduce(
        $itensLimpos,
        static fn ($carry, $item) => $carry + ($item['valor_total'] ?? 0),
        0.0
    );
    $valorTotal = round($valorTotal, 2);
}

if ($valorTotal <= 0) {
    respond_with_error('Valor total da nota fiscal inválido.');
}

$duplicateStmt = $mysqli->prepare(
    'SELECT id FROM notas_fiscais WHERE numero = ? AND serie = ? AND emitente_cnpj = ? AND destinatario_cnpj = ? LIMIT 1'
);
if ($duplicateStmt) {
    $duplicateStmt->bind_param('ssss', $numero, $serie, $emitenteDocumento, $destinatarioDocumento);
    $duplicateStmt->execute();
    $duplicateStmt->store_result();
    if ($duplicateStmt->num_rows > 0) {
        $duplicateStmt->close();
        respond_with_error('Esta nota fiscal já foi registrada anteriormente.');
    }
    $duplicateStmt->close();
} else {
    respond_with_error('Não foi possível validar duplicidade da nota fiscal.', 500);
}

try {
    $mysqli->begin_transaction();

    $stmt = $mysqli->prepare('INSERT INTO notas_fiscais (numero, serie, estado_emissor, data_emissao, transportadora, percentual_icms, valor_icms, percentual_ipi, valor_ipi, emitente_nome, emitente_cnpj, destinatario_nome, destinatario_cnpj, valor_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    if (!$stmt) {
        throw new RuntimeException('Falha ao preparar a inserção da nota fiscal.');
    }

    $stmt->bind_param(
        'sssssddddssssd',
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
        $valorTotal
    );

    if (!$stmt->execute()) {
        throw new RuntimeException('Não foi possível salvar a nota fiscal.');
    }

    $notaId = $stmt->insert_id;
    $stmt->close();

    $itemStmt = $mysqli->prepare('INSERT INTO notas_fiscais_itens (nota_fiscal_id, descricao, quantidade, valor_unitario, valor_total) VALUES (?, ?, ?, ?, ?)');
    if (!$itemStmt) {
        throw new RuntimeException('Falha ao preparar a inserção dos itens.');
    }

    $notaIdParam = $notaId;
    $descricaoItem = '';
    $quantidadeItem = 0.0;
    $valorUnitarioItem = 0.0;
    $valorTotalItem = 0.0;

    $itemStmt->bind_param('isddd', $notaIdParam, $descricaoItem, $quantidadeItem, $valorUnitarioItem, $valorTotalItem);

    foreach ($itensLimpos as $itemLimpo) {
        $descricaoItem = $itemLimpo['descricao'];
        $quantidadeItem = $itemLimpo['quantidade'];
        $valorUnitarioItem = $itemLimpo['valor_unitario'];
        $valorTotalItem = $itemLimpo['valor_total'];

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
