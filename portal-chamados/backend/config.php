<?php
$envDbPass = getenv('PORTAL_DB_PASS');
$portalConfig = [
    'db_host' => getenv('PORTAL_DB_HOST') ?: null,
    'db_user' => getenv('PORTAL_DB_USER') ?: null,
    'db_pass' => $envDbPass !== false ? $envDbPass : null,
    'db_name' => getenv('PORTAL_DB_NAME') ?: null,
    'recaptcha_secret' => getenv('PORTAL_RECAPTCHA_SECRET') ?: null,
];

$configOverride = __DIR__ . '/config.local.php';
if (is_readable($configOverride)) {
    $localConfig = require $configOverride;
    if (is_array($localConfig)) {
        foreach ($localConfig as $key => $value) {
            if (array_key_exists($key, $portalConfig) && $value !== null) {
                $portalConfig[$key] = $value;
            }
        }
    }
}

foreach (['db_host', 'db_user', 'db_pass', 'db_name'] as $key) {
    if (!array_key_exists($key, $portalConfig) || $portalConfig[$key] === null) {
        die('Configuração do banco de dados ausente. Defina as variáveis de ambiente ou o arquivo config.local.php.');
    }
}

$conn = new mysqli(
    $portalConfig['db_host'],
    $portalConfig['db_user'],
    $portalConfig['db_pass'],
    $portalConfig['db_name']
);

if ($conn->connect_error) {
    die('Erro de conexão com o banco de dados: ' . $conn->connect_error);
}

date_default_timezone_set('America/Sao_Paulo');
