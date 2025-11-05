<?php
declare(strict_types=1);

/**
 * Obtém informações sobre a versão atual do portal com base no repositório Git.
 */
function get_portal_version_label(): string
{
    $branch = run_git_command('git rev-parse --abbrev-ref HEAD 2>/dev/null');
    $commit = run_git_command('git rev-parse --short HEAD 2>/dev/null');
    $commitDate = run_git_command('git show -s --format=%ci HEAD 2>/dev/null');

    if ($branch === '' && $commit === '' && $commitDate === '') {
        return '';
    }

    if ($branch === '' || $branch === 'HEAD') {
        $branch = 'main';
    }

    if ($commit === '') {
        $commit = 'desconhecido';
    }

    $formattedDate = format_commit_date($commitDate);

    return sprintf('%s #%s - %s', $branch, $commit, $formattedDate);
}

/**
 * Executa um comando git e devolve sua saída sanitizada.
 */
function run_git_command(string $command): string
{
    if (!function_exists('shell_exec')) {
        return '';
    }

    $output = @shell_exec($command);
    if (!is_string($output)) {
        return '';
    }

    return trim($output);
}

/**
 * Normaliza uma data de commit do Git no formato dd/mm/aaaa hh:mm.
 */
function format_commit_date(string $rawDate): string
{
    if ($rawDate !== '') {
        $date = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s O', $rawDate);
        if ($date !== false) {
            return $date->format('d/m/Y H:i');
        }
    }

    return (new \DateTimeImmutable('now'))->format('d/m/Y H:i');
}

/**
 * Insere a etiqueta de versão no rodapé da página, quando encontrado.
 */
function inject_version_into_footer(string $html, string $versionLabel): string
{
    $versionHtml = '<p class="version">' . htmlspecialchars($versionLabel, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>';

    $count = 0;
    $htmlWithContainer = preg_replace(
        '/(<footer\b[^>]*class=["\'][^"\']*\bfooter\b[^"\']*["\'][^>]*>.*?<div\b[^>]*class=["\'][^"\']*\bcontainer\b[^"\']*\bflex-between\b[^"\']*["\'][^>]*>)(.*?)(<\/div>)/is',
        '$1$2' . $versionHtml . '$3',
        $html,
        1,
        $count
    );

    if ($count > 0 && is_string($htmlWithContainer)) {
        return $htmlWithContainer;
    }

    $htmlWithFooterClass = preg_replace(
        '/(<footer\b[^>]*class=["\'][^"\']*\bfooter\b[^"\']*["\'][^>]*>)(.*?)(<\/footer>)/is',
        '$1$2' . $versionHtml . '$3',
        $html,
        1,
        $count
    );

    if ($count > 0 && is_string($htmlWithFooterClass)) {
        return $htmlWithFooterClass;
    }

    $htmlWithFooter = preg_replace(
        '/(<footer\b[^>]*>)(.*?)(<\/footer>)/is',
        '$1$2' . $versionHtml . '$3',
        $html,
        1
    );

    return is_string($htmlWithFooter) ? $htmlWithFooter : $html;
}

/**
 * Renderiza uma página estática do diretório portal-chamados, ajustando os caminhos de ativos
 * para que possam ser servidos a partir da raiz do projeto.
 */
function render_portal_page(string $page): void
{
    $portalDir = __DIR__ . '/portal-chamados/';
    $realPortalDir = realpath($portalDir);
    if ($realPortalDir === false) {
        http_response_code(500);
        echo 'Portal indisponível.';
        return;
    }

    $target = realpath($portalDir . $page);
    if ($target === false || strncmp($target, $realPortalDir, strlen($realPortalDir)) !== 0) {
        http_response_code(404);
        echo 'Página não encontrada.';
        return;
    }

    $html = file_get_contents($target);
    if ($html === false) {
        http_response_code(500);
        echo 'Não foi possível carregar o conteúdo.';
        return;
    }

    $assetPrefix = 'portal-chamados/';
    $replacements = [
        'href="assets/' => 'href="' . $assetPrefix . 'assets/',
        "href='assets/" => "href='" . $assetPrefix . "assets/",
        'src="assets/' => 'src="' . $assetPrefix . 'assets/',
        "src='assets/" => "src='" . $assetPrefix . "assets/",
        'href="backend/' => 'href="' . $assetPrefix . 'backend/',
        "href='backend/" => "href='" . $assetPrefix . "backend/",
        'action="backend/' => 'action="' . $assetPrefix . 'backend/',
        "action='backend/" => "action='" . $assetPrefix . "backend/",
        "fetch('backend/" => "fetch('" . $assetPrefix . "backend/",
        'fetch("backend/' => 'fetch("' . $assetPrefix . 'backend/',
    ];

    $routes = [
        'index.html' => 'index.php',
        'abrir-chamado.html' => 'abrir-chamado.php',
        'acompanhar.html' => 'acompanhar.php',
        'notas-fiscais.html' => 'notas-fiscais.php',
    ];

    foreach ($routes as $from => $to) {
        $replacements['href="' . $from . '"'] = 'href="' . $to . '"';
        $replacements["href='" . $from . "'"] = "href='" . $to . "'";
    }

    $html = strtr($html, $replacements);

    $versionLabel = get_portal_version_label();
    if ($versionLabel !== '') {
        $html = inject_version_into_footer($html, $versionLabel);
    }

    if (!str_contains($html, 'window.PORTAL_BASE_PATH')) {
        $script = "<script>window.PORTAL_BASE_PATH = '" . $assetPrefix . "';</script>";
        if (preg_match('/<head[^>]*>/', $html)) {
            $html = preg_replace('/<head([^>]*)>/', '<head$1>' . $script, $html, 1);
        } else {
            $html = $script . $html;
        }
    }

    header('Content-Type: text/html; charset=UTF-8');
    echo $html;
}
