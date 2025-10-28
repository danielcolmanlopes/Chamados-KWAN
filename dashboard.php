<?php
// dashboard.php - Lista e gerencia os chamados abertos

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

session_start();
if (empty($_SESSION['usuario'])) {
    header('Location: login.php');
    exit;
}

$uploadsBase = __DIR__ . '/uploads';
$chamados = [];

if (is_dir($uploadsBase)) {
    $diretorios = array_filter(scandir($uploadsBase), static function (string $item): bool {
        return !in_array($item, ['.', '..', 'temp'], true);
    });

    foreach ($diretorios as $pasta) {
        $arquivoDados = $uploadsBase . '/' . $pasta . '/dados.json';
        if (!is_file($arquivoDados)) {
            continue;
        }

        $conteudo = file_get_contents($arquivoDados);
        if ($conteudo === false) {
            continue;
        }

        try {
            $dados = json_decode($conteudo, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $exception) {
            continue;
        }
        $dados['pasta'] = $pasta;
        $dados['caminho_pdf'] = 'uploads/' . $pasta . '/' . ($dados['arquivo_pdf'] ?? 'danfe.pdf');
        $dataAbertura = $dados['data_abertura'] ?? null;
        if ($dataAbertura) {
            $timestamp = strtotime($dataAbertura);
            $dados['data_formatada'] = $timestamp ? date('d/m/Y H:i', $timestamp) : $dataAbertura;
        } else {
            $dados['data_formatada'] = '';
        }
        $dados['status'] = $dados['status'] ?? 'Aberto';
        $dados['evidencias'] = $dados['evidencias'] ?? [];
        $chamados[] = $dados;
    }

    usort($chamados, static function (array $a, array $b): int {
        return strcmp($b['data_abertura'] ?? '', $a['data_abertura'] ?? '');
    });
}

$statusClasses = [
    'Aberto' => 'warning',
    'Em análise' => 'info',
    'Concluído' => 'success',
];

$erroDashboard = $_GET['erro'] ?? '';
$nfRecente = $_GET['nf'] ?? '';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Sistema de Chamados KWAN</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
</head>
<body class="bg-light">
<nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    <div class="container-fluid">
        <a class="navbar-brand" href="#">Dashboard - Chamados</a>
        <div class="d-flex">
            <a class="btn btn-outline-light me-2" href="index.php">Novo Chamado</a>
            <a class="btn btn-outline-light" href="logout.php">Sair</a>
        </div>
    </div>
</nav>

<main class="container my-4">
    <div class="card shadow-sm">
        <div class="card-body">
            <h1 class="h4 mb-4">Chamados registrados</h1>
            <?php if ($erroDashboard !== ''): ?>
                <div class="alert alert-danger" role="alert">
                    <?= htmlspecialchars($erroDashboard, ENT_QUOTES, 'UTF-8'); ?>
                </div>
            <?php endif; ?>
            <?php if ($nfRecente !== ''): ?>
                <div class="alert alert-success" role="alert">
                    Chamado da NF <?= htmlspecialchars($nfRecente, ENT_QUOTES, 'UTF-8'); ?> salvo com sucesso.
                </div>
            <?php endif; ?>
            <?php if (empty($chamados)): ?>
                <div class="alert alert-info" role="alert">
                    Nenhum chamado cadastrado até o momento.
                </div>
            <?php else: ?>
                <div class="table-responsive">
                    <table class="table table-striped align-middle">
                        <thead>
                        <tr>
                            <th>NF</th>
                            <th>Loja</th>
                            <th>Chave</th>
                            <th>Status</th>
                            <th>Data</th>
                            <th class="text-end">Ações</th>
                        </tr>
                        </thead>
                        <tbody>
                        <?php foreach ($chamados as $indice => $chamado): ?>
                            <?php $classeLinha = ($nfRecente !== '' && $nfRecente === $chamado['pasta']) ? 'table-success' : ''; ?>
                            <tr class="<?= $classeLinha; ?>">
                                <td><?= htmlspecialchars($chamado['nf'] ?? $chamado['pasta'], ENT_QUOTES, 'UTF-8'); ?></td>
                                <td><?= htmlspecialchars($chamado['loja'] ?? '', ENT_QUOTES, 'UTF-8'); ?></td>
                                <td><?= htmlspecialchars($chamado['ch'] ?? '', ENT_QUOTES, 'UTF-8'); ?></td>
                                <td>
                                    <?php
                                    $status = $chamado['status'];
                                    $badgeClass = $statusClasses[$status] ?? 'secondary';
                                    ?>
                                    <span class="badge bg-<?= $badgeClass; ?>"><?= htmlspecialchars($status, ENT_QUOTES, 'UTF-8'); ?></span>
                                </td>
                                <td><?= htmlspecialchars($chamado['data_formatada'] ?? '', ENT_QUOTES, 'UTF-8'); ?></td>
                                <td class="text-end">
                                    <button type="button" class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#detalhesModal<?= $indice; ?>">Detalhes</button>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#statusModal<?= $indice; ?>">Editar Status</button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>
    </div>
</main>

<?php foreach ($chamados as $indice => $chamado): ?>
<div class="modal fade" id="detalhesModal<?= $indice; ?>" tabindex="-1" aria-labelledby="detalhesLabel<?= $indice; ?>" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="detalhesLabel<?= $indice; ?>">Detalhes do chamado - NF <?= htmlspecialchars($chamado['nf'] ?? '', ENT_QUOTES, 'UTF-8'); ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
                <dl class="row">
                    <dt class="col-sm-4">Nota Fiscal</dt>
                    <dd class="col-sm-8"><?= htmlspecialchars($chamado['nf'] ?? '', ENT_QUOTES, 'UTF-8'); ?></dd>

                    <dt class="col-sm-4">Chave</dt>
                    <dd class="col-sm-8"><?= htmlspecialchars($chamado['ch'] ?? '', ENT_QUOTES, 'UTF-8'); ?></dd>

                    <dt class="col-sm-4">Serial</dt>
                    <dd class="col-sm-8"><?= htmlspecialchars($chamado['serial'] ?? '', ENT_QUOTES, 'UTF-8'); ?></dd>

                    <dt class="col-sm-4">Loja</dt>
                    <dd class="col-sm-8"><?= htmlspecialchars($chamado['loja'] ?? '', ENT_QUOTES, 'UTF-8'); ?></dd>

                    <dt class="col-sm-4">Defeito</dt>
                    <dd class="col-sm-8"><?= nl2br(htmlspecialchars($chamado['defeito'] ?? '', ENT_QUOTES, 'UTF-8')); ?></dd>

                    <dt class="col-sm-4">Data de abertura</dt>
                    <dd class="col-sm-8"><?= htmlspecialchars($chamado['data_formatada'] ?? '', ENT_QUOTES, 'UTF-8'); ?></dd>

                    <dt class="col-sm-4">PDF da DANFE</dt>
                    <dd class="col-sm-8">
                        <a href="<?= htmlspecialchars('uploads/' . $chamado['pasta'] . '/' . ($chamado['arquivo_pdf'] ?? 'danfe.pdf'), ENT_QUOTES, 'UTF-8'); ?>" target="_blank" class="link-primary">Abrir arquivo</a>
                    </dd>
                </dl>

                <?php if (!empty($chamado['evidencias'])): ?>
                    <div>
                        <h6>Evidências anexadas</h6>
                        <ul class="list-unstyled">
                            <?php foreach ($chamado['evidencias'] as $evidencia): ?>
                                <?php $caminho = 'uploads/' . $chamado['pasta'] . '/' . $evidencia; ?>
                                <li class="mb-2">
                                    <?php if (preg_match('/\.(mp4)$/i', $evidencia)): ?>
                                        <video src="<?= htmlspecialchars($caminho, ENT_QUOTES, 'UTF-8'); ?>" controls class="w-100" style="max-height: 320px;"></video>
                                    <?php else: ?>
                                        <img src="<?= htmlspecialchars($caminho, ENT_QUOTES, 'UTF-8'); ?>" alt="Evidência" class="img-fluid rounded">
                                    <?php endif; ?>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="statusModal<?= $indice; ?>" tabindex="-1" aria-labelledby="statusLabel<?= $indice; ?>" aria-hidden="true">
    <div class="modal-dialog">
        <form class="modal-content" method="post" action="update_status.php">
            <div class="modal-header">
                <h5 class="modal-title" id="statusLabel<?= $indice; ?>">Atualizar status - NF <?= htmlspecialchars($chamado['nf'] ?? '', ENT_QUOTES, 'UTF-8'); ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" name="pasta" value="<?= htmlspecialchars($chamado['pasta'], ENT_QUOTES, 'UTF-8'); ?>">
                <div class="mb-3">
                    <label for="status<?= $indice; ?>" class="form-label">Status</label>
                    <select id="status<?= $indice; ?>" name="status" class="form-select" required>
                        <?php foreach (['Aberto', 'Em análise', 'Concluído'] as $opcao): ?>
                            <option value="<?= htmlspecialchars($opcao, ENT_QUOTES, 'UTF-8'); ?>" <?= $chamado['status'] === $opcao ? 'selected' : ''; ?>><?= htmlspecialchars($opcao, ENT_QUOTES, 'UTF-8'); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    </div>
</div>
<?php endforeach; ?>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
