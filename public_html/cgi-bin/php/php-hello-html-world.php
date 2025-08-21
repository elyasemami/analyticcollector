<?php
header('Content-Type: text/html; charset=utf-8');
$now = date('c');
$ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
?>
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Hello, PHP!</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;margin:2rem}
  code{background:#f4f4f4;padding:.15rem .35rem;border-radius:.25rem}
</style>
</head>
<body>
  <h1>Hello from PHP</h1>
  <p>Current time: <code><?= htmlspecialchars($now) ?></code></p>
  <p>Your IP: <code><?= htmlspecialchars($ip) ?></code></p>
</body>
</html>

