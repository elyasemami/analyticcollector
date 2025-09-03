<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$sessionName = 'SID';
session_name($sessionName);

if (isset($_GET['sid']))  session_id(preg_replace('/[^a-zA-Z0-9,-]/', '', $_GET['sid']));
if (isset($_POST['sid'])) session_id(preg_replace('/[^a-zA-Z0-9,-]/', '', $_POST['sid']));

session_start([
  'cookie_httponly' => true,
  'cookie_secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
]);

$transport = $_GET['transport'] ?? 'cookie';
if (!in_array($transport, ['cookie','url','hidden'], true)) $transport = 'cookie';

if (isset($_POST['name'])) {
    $_SESSION['name'] = trim((string)$_POST['name']);
}

function link_to(string $path, array $params = []): string {
    return htmlspecialchars($path . (empty($params) ? '' : '?' . http_build_query($params)), ENT_QUOTES, 'UTF-8');
}

$paramsBack = ['transport' => $transport];
$paramsSelf = ['transport' => $transport];
if ($transport === 'url') {
    $paramsBack['sid'] = session_id();
    $paramsSelf['sid'] = session_id();
}

$name = $_SESSION['name'] ?? '';
$hello = $name !== '' ? "Hello, $name!" : 'No name stored yet.';
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>State Demo — Page 2 (PHP)</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;margin:2rem}
  code{background:#f6f6f6; padding:.1rem .3rem; border-radius:4px}
  form{margin-top:1rem}
  button{padding:.45rem .8rem}
</style>
</head>
<body>
  <h1>State Demo — Page 2</h1>
  <p><b>Session ID:</b> <code><?= htmlspecialchars(session_id(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></code></p>
  <h2><?= htmlspecialchars($hello, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></h2>

  <p><a href="<?= link_to('/cgi-bin/php/state-demo-1.php', $paramsBack) ?>">Back to Page 1</a></p>

  <form method="post" action="<?= link_to('/cgi-bin/php/state-demo-2.php', $paramsSelf) ?>">
    <?php if ($transport === 'hidden'): ?>
      <input type="hidden" name="sid" value="<?= htmlspecialchars(session_id(), ENT_QUOTES, 'UTF-8') ?>">
    <?php endif; ?>
    <label for="name">Update your name:</label><br>
    <input id="name" name="name" type="text" value="<?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?>">
    <button type="submit">Save</button>
  </form>

  <form method="post" action="<?= link_to('/cgi-bin/php/state-demo-2.php', $paramsSelf) ?>" style="margin-top:.75rem">
    <?php if ($transport === 'hidden'): ?>
      <input type="hidden" name="sid" value="<?= htmlspecialchars(session_id(), ENT_QUOTES, 'UTF-8') ?>">
    <?php endif; ?>
    <input type="hidden" name="reset" value="1">
    <button type="submit">Reset Session</button>
  </form>
<?php
if (isset($_POST['reset'])) {
    $_SESSION = [];
    if (session_id() !== '') {
        @session_destroy();
    }
    session_start([
      'cookie_httponly' => true,
      'cookie_secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    ]);
    echo '<p><i>Session reset. Reload this page.</i></p>';
}
?>
</body>
</html>

