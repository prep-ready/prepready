<?php
/**
 * PrepReady — formularz kontaktowy dla producentów.
 * Adres odbiorcy NIE jest w kodzie: GitHub Actions zapisuje go przy publikacji
 * do pliku contact-config.php z sekretu CONTACT_EMAIL.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

function out(int $code, array $body): void { http_response_code($code); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false, 'error' => 'method']);

$cfgFile = __DIR__ . '/contact-config.php';
$cfg = is_file($cfgFile) ? require $cfgFile : [];
$to = $cfg['to'] ?? '';
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) out(500, ['ok' => false, 'error' => 'config']);

// Ochrona przed botami: ukryte pole + minimalny czas wypełniania
if (!empty($_POST['website_url'])) out(200, ['ok' => true]);
$started = (int)($_POST['t'] ?? 0);
if ($started > 0 && (time() * 1000 - $started) < 3000) out(200, ['ok' => true]);

// Prosty limit: 5 wiadomości na godzinę z jednego IP
$ipKey = sys_get_temp_dir() . '/pr_rl_' . md5($_SERVER['REMOTE_ADDR'] ?? 'x');
$hits = array_filter(is_file($ipKey) ? (array)json_decode((string)file_get_contents($ipKey), true) : [], fn($t) => $t > time() - 3600);
if (count($hits) >= 5) out(429, ['ok' => false, 'error' => 'rate']);
$hits[] = time(); @file_put_contents($ipKey, json_encode(array_values($hits)));

$clean = fn(string $k, int $max = 200) => trim(mb_substr(str_replace(["\r", "\n"], ' ', (string)($_POST[$k] ?? '')), 0, $max));
$company  = $clean('company');
$name     = $clean('name');
$email    = $clean('email');
$site     = $clean('site');
$category = $clean('category', 80);
$lang     = $clean('lang', 2) === 'en' ? 'en' : 'pl';
$message  = trim(mb_substr((string)($_POST['message'] ?? ''), 0, 5000));
$consent  = !empty($_POST['consent']);

if ($company === '' || $name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !$consent) {
  out(422, ['ok' => false, 'error' => 'fields']);
}

$subject = '=?UTF-8?B?' . base64_encode("PrepReady · Współpraca: $company") . '?=';
$body = "Nowe zgłoszenie z formularza „Dla producentów” ($lang)\n\n"
  . "Firma: $company\nOsoba: $name\nE-mail: $email\nStrona: $site\nKategoria: $category\n\nWiadomość:\n$message\n\n"
  . '—' . "\nWysłano: " . date('Y-m-d H:i') . ' · IP: ' . ($_SERVER['REMOTE_ADDR'] ?? '') . "\n";

$host = preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'prepready.pro');
$headers = implode("\r\n", [
  'From: PrepReady <no-reply@' . $host . '>',
  'Reply-To: ' . $name . ' <' . $email . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: 8bit',
]);

$sent = @mail($to, $subject, $body, $headers, '-f no-reply@' . $host);
out($sent ? 200 : 500, ['ok' => $sent, 'error' => $sent ? null : 'mail']);
