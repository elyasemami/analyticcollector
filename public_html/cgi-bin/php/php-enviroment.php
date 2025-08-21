<?php
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');

function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

$headers = [];
foreach ($_SERVER as $k => $v) {
  if (strpos($k, 'HTTP_') === 0) {
    $name = str_replace('_', '-', substr($k, 5));
    $headers[$name] = $v;
  }
}
foreach (['CONTENT_TYPE','CONTENT_LENGTH'] as $k) {
  if (isset($_SERVER[$k])) {
    $headers[str_replace('_','-',$k)] = $_SERVER[$k];
  }
}
ksort($headers);
$server = $_SERVER;
ksort($server);
?>
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Environment (PHP)</title>
<style>
 body{font-family:system-ui,Arial,sans-serif;margin:2rem}
 table{border-collapse:collapse;width:100%;max-width:1000px}
 th,td{border:1px solid #ccc;padding:.35rem .5rem;vertical-align:top}
 th{background:#f7f7f7;text-align:left}
 h2{margin-top:2rem}
 pre{margin:0;white-space:pre-wrap}
</style>
</head>
<body>
  <h1>Environment (PHP)</h1>

  <h2>Request Headers</h2>
  <table><tr><th>Name</th><th>Value</th></tr>
    <?php foreach ($headers as $k => $v): ?>
      <tr><td><?= h($k) ?></td><td><pre><?= h($v) ?></pre></td></tr>
    <?php endforeach; ?>
  </table>

  <h2>Server / CGI Variables</h2>
  <table><tr><th>Name</th><th>Value</th></tr>
    <?php foreach ($server as $k => $v): ?>
      <tr><td><?= h($k) ?></td><td><pre><?= h(is_array($v)? json_encode($v) : $v) ?></pre></td></tr>
    <?php endforeach; ?>
  </table>
</body>
</html>

