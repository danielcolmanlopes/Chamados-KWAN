<?php
ini_set('default_charset', 'UTF-8');
date_default_timezone_set('America/Sao_Paulo');

$host = "localhost";
$user = "dclinfo2_portal_chamados";
$pass = '7k#;Z6wE4[n6';
$dbname = "dclinfo2_portal_chamados";

$mysqli = new mysqli($host, $user, $pass, $dbname);
if ($mysqli->connect_errno) {
    http_response_code(500);
    die('Erro ao conectar ao banco de dados: ' . $mysqli->connect_error);
}

$mysqli->set_charset('utf8mb4');

function sanitize_text($value)
{
    return trim(filter_var($value ?? '', FILTER_SANITIZE_STRING, FILTER_FLAG_NO_ENCODE_QUOTES));
}

function generate_codigo()
{
    return 'KWAN-' . strtoupper(bin2hex(random_bytes(4)));
}

function allowed_extension($filename)
{
    $allowed = ['jpg', 'jpeg', 'png', 'pdf', 'xml', 'mp4', 'mp3', 'wav'];
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($ext, $allowed, true) ? $ext : false;
}
