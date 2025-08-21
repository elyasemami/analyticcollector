<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$uri    = $_SERVER['REQUEST_URI']     ?? '';
$qs     = $_SERVER['QUERY_STRING']    ?? '';
$proto  = $_SERVER['SERVER_PROTOCOL'] ?? '';

function request_headers(): array {
    if (function_exists('getallheaders')) {
        $h = getallheaders();
        if (is_array($h)) return $h;
    }
    $out = [];
    foreach ($_SERVER as $k => $v) {
        if (strncmp($k, 'HTTP_', 5) === 0) {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($k, 5)))));
            $out[$name] = $v;
        }
    }
    if (isset($_SERVER['CONTENT_TYPE']))   $out['Content-Type']   = $_SERVER['CONTENT_TYPE'];
    if (isset($_SERVER['CONTENT_LENGTH'])) $out['Content-Length'] = $_SERVER['CONTENT_LENGTH'];
    return $out;
}

$headers = request_headers();
$raw = file_get_contents('php://input') ?: '';
$ctype = $headers['Content-Type'] ?? ($_SERVER['CONTENT_TYPE'] ?? '');
if (is_string($ctype)) $ctype = strtolower(trim(explode(';', $ctype)[0]));

$parsed = [];
if ($method === 'POST' && $ctype === 'application/x-www-form-urlencoded') {
    $parsed = $_POST;
} elseif ($ctype === 'application/x-www-form-urlencoded') {
    parse_str($raw, $parsed);
} elseif ($ctype === 'application/json') {
    $tmp = json_decode($raw, true);
    if (is_array($tmp)) $parsed = $tmp;
}

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function render_kv_table(array $a): string {
    if (!$a) return '<p><i>(empty)</i></p>';
    $rows = '';
    foreach ($a as $k => $v) {
        $val = is_array($v) ? json_encode($v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) : (string)$v;
        $rows .= '<tr><th>'.h($k).'</th><td><pre>'.h($val).'</pre></td></tr>';
    }
    return '<table><tbody>'.$rows.'</tbody></table>';
}

function utf8_truncate(string $s, int $n): string {
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $n, 'UTF-8');
    }
    return substr($s, 0, $n);

}
$rawPreviewLimit = 4000;
$rawPreview = utf8_truncate($raw, $rawPreviewLimit);
$rawTruncNote = (strlen($raw) > $rawPreviewLimit) ? "\n\n[truncated for display]" : "";

$isHead = ($method === 'HEAD');
if ($isHead) {
    header('X-Info', 'general-request-echo would include method, headers, params, and body');
    exit;
}
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>General Request Echo (PHP)</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;margin:2rem}
  table{border-collapse:collapse; margin:.5rem 0; width:100%; max-width:900px}
  th,td{border:1px solid #ddd; padding:.4rem .6rem; vertical-align:top}
  th{background:#f6f6f6; text-align:left; width:220px}
  pre{white-space:pre-wrap; margin:0}
  code{background:#f6f6f6; padding:.1rem .3rem; border-radius:4px}
</style>
</head>
<body>
  <h1>General Request Echo</h1>
  <p><b>Method:</b> <code><?= h($method) ?></code></p>
  <p><b>Request Target:</b> <code><?= h($uri) ?></code></p>
  <p><b>Protocol:</b> <code><?= h($proto) ?></code></p>

  <h2>Query Parameters ($_GET)</h2>
  <?= render_kv_table($_GET) ?>

  <h2>Headers</h2>
  <?= render_kv_table($headers) ?>

  <h2>Parsed Body</h2>
  <?= render_kv_table($parsed) ?>

  <h2>Raw Body</h2>
  <pre><?= h($rawPreview . $rawTruncNote) ?></pre>
</body>
</html>

