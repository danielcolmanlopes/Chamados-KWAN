<?php
// logout.php - Encerra a sessão do usuário autenticado

declare(strict_types=1);

date_default_timezone_set('America/Sao_Paulo');

session_start();
$_SESSION = [];
session_destroy();

header('Location: login.php');
exit;
