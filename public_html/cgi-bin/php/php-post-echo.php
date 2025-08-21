<?php
header('Content-Type: text/html; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$note   = $method === 'POST' ? ($_POST['note'] ?? '') : '';
$raw    = file_get_contents('php://input');
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>PHP POST Echo</title>
  <style>
    body{font-family:system-ui,Arial,sans-serif;margin:2rem}
    pre{white-space:pre-wrap}
  </style>
</head>
<body>
<?php if ($method !== 'POST'): ?>
  <h1>Use the form</h1>
  <p>if you want to submit via <a href="/php-post-form.html">/php-post-form.html</a>.</p>
<?php else: ?>
  <h1>Posted</h1>
  <h2>Parsed note</h2>
  <pre><?= htmlspecialchars($note, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></pre>

  <h2>Raw body</h2>
  <pre><?= htmlspecialchars($raw, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></pre>
<?php endif; ?>
</body>
</html>

