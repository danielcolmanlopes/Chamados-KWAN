<?php
declare(strict_types=1);

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
