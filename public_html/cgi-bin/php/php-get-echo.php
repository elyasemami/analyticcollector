<?php
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$qs     = $_SERVER['QUERY_STRING'] ?? '';

$multi = [];
if ($qs !== '') {
  foreach (explode('&', $qs) as $pair) {
    if ($pair === '') continue;
    [$k, $v] = array_pad(explode('=', $pair, 2), 2, '');
    $k = rawurldecode(str_replace('+', ' ', $k));
    $v = rawurldecode(str_replace('+', ' ', $v));
    $multi[$k][] = $v;
  }
}
ksort($multi);

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host   = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? '');
$uri    = $_SERVER['REQUEST_URI'] ?? ($_SERVER['SCRIPT_NAME'] ?? '');
$full   = $host ? "$scheme://$host$uri" : $uri;
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>GET Echo (PHP)</title>
  <style>
    body{font-family:system-ui,Arial,sans-serif;margin:2rem}
    table{border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:.35rem .6rem;vertical-align:top}
    th{background:#f7f7f7;text-align:left}
    code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
    form label{display:block;margin:.25rem 0}
  </style>
</head>
<body>
  <h1>GET Echo (PHP)</h1>

  <p><b>Method:</b> <?= h($method) ?></p>
  <p><b>Full URL:</b> <code><?= h($full) ?></code></p>
  <p><b>QUERY_STRING:</b> <code><?= h($qs) ?></code></p>

  <h2>Parsed parameters</h2>
  <table><tr><th>Name</th><th>Value(s)</th></tr>
    <?php if (empty($multi)): ?>
      <tr><td colspan="2"><i>No query parameters.</i></td></tr>
    <?php else: foreach ($multi as $k => $vals): ?>
      <tr>
        <td><?= h($k) ?></td>
        <td><?php foreach ($vals as $v): ?><div><code><?= h($v) ?></code></div><?php endforeach; ?></td>
      </tr>
    <?php endforeach; endif; ?>
  </table>
</body>
</html>

