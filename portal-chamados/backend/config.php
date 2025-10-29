<?php
$host = "localhost";
$user = "dclinfo2_portal_chamados";
$pass = '7k#;Z6wE4[n6';
$dbname = "dclinfo2_portal_chamados";

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
  die("Erro de conexão com o banco de dados: " . $conn->connect_error);
}
date_default_timezone_set('America/Sao_Paulo');
