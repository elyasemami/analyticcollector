<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode([
  'message'   => 'Hello World from PHP!',
  'date'      => gmdate('c'),
  'currentIP' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
], JSON_UNESCAPED_SLASHES);

