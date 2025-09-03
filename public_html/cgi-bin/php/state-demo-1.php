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

$baseAction = '/cgi-bin/php/state-demo-2.php';
$action = $baseAction;
$query = ['transport' => $transport];
if ($transport === 'url') {
    $query['sid'] = session_id();
}
$action .= '?' . http_build_query($query);

$hiddenSid = ($transport === 'hidden') ? session_id() : '';
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>State Demo — Page 1 (PHP)</title>
<style>
  body{font-family:system-ui,Arial,sans-serif;margin:2rem}
  input[type=text]{padding:.4rem .6rem; width:260px; max-width:100%}
  button{padding:.45rem .8rem}
  nav a{margin-right:.6rem}
  .note{color:#555}
</style>
</head>
<body>
  <h1>State Demo — Page 1</h1>
  <nav>
    <b>Transport:</b>
    <a href="?transport=cookie">cookie</a>
    <a href="?transport=url">url</a>
    <a href="?transport=hidden">hidden</a>
  </nav>
  <p class="note">Current session id: <code><?= htmlspecialchars(session_id(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></code></p>

  <form method="post" action="<?= htmlspecialchars($action, ENT_QUOTES, 'UTF-8') ?>">
    <?php if ($hiddenSid): ?>
      <input type="hidden" name="sid" value="<?= htmlspecialchars($hiddenSid, ENT_QUOTES, 'UTF-8') ?>">
    <?php endif; ?>
    <label for="name">Your name:</label><br>
    <input id="name" name="name" type="text" value="" required>
    <button type="submit">Save &amp; Continue</button>
  </form>
</body>
</html>

