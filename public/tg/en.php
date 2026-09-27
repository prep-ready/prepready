<?php
/**
 * PrepReady Global — Telegram bot webhook (@Prepready_global_bot), group @prepready_global.
 * The token is NOT in the code: GitHub Actions writes it to tg/config.php from the TG_BOT_EN_TOKEN secret on deploy.
 * Features: welcome for new members, commands (/start /alerts /index /gobag /guides /deals /rules /newsletter),
 * simple anti-spam (links from people who joined < 24 h ago are deleted).
 */
declare(strict_types=1);
header('Content-Type: application/json');

$cfgFile = __DIR__ . '/config.php';
$cfg = is_file($cfgFile) ? require $cfgFile : [];
$TOKEN = (string)($cfg['en'] ?? '');
if ($TOKEN === '') { http_response_code(500); exit('{"ok":false}'); }
$SECRET = substr(hash('sha256', 'prepready-en:' . $TOKEN), 0, 48);
if (($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '') !== $SECRET) { http_response_code(403); exit('{"ok":false}'); }

const GROUP = 'prepready_global';
const SITE = 'https://prepready.pro';
const T = ['alerts' => 2, 'tips' => 3, 'deals' => 4, 'gear' => 5, 'discussion' => 6, 'local' => 7, 'ask' => 8];

$DATA = is_writable(dirname(__DIR__, 2)) ? dirname(__DIR__, 2) . '/tg_data' : __DIR__ . '/data';
if (!is_dir($DATA)) @mkdir($DATA, 0750, true);
$STATE_FILE = $DATA . '/en_state.json';
$state = is_file($STATE_FILE) ? (json_decode((string)file_get_contents($STATE_FILE), true) ?: []) : [];
$state += ['joins' => [], 'welcome' => null, 'admins' => [], 'admins_at' => 0];
function save(): void { global $STATE_FILE, $state; @file_put_contents($STATE_FILE, json_encode($state), LOCK_EX); }

function api(string $method, array $params = []): array {
  global $TOKEN;
  $ch = curl_init("https://api.telegram.org/bot{$TOKEN}/{$method}");
  curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode($params, JSON_UNESCAPED_UNICODE)]);
  $r = curl_exec($ch); curl_close($ch);
  return is_string($r) ? (json_decode($r, true) ?: []) : [];
}
function getJson(string $url): array {
  $ch = curl_init($url);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_FOLLOWLOCATION => true, CURLOPT_USERAGENT => 'PrepReadyBot/1.0 (+https://prepready.pro)']);
  $r = curl_exec($ch); curl_close($ch);
  return is_string($r) ? (json_decode($r, true) ?: []) : [];
}
function e(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8'); }
function topic(string $k): string { return 'https://t.me/' . GROUP . '/' . T[$k]; }
function btn(string $text, string $url): array { return ['text' => $text, 'url' => $url]; }
function utm(string $path, string $c = 'telegram'): string { return SITE . $path . '?utm_source=telegram&utm_medium=bot&utm_campaign=' . $c; }

$u = json_decode((string)file_get_contents('php://input'), true) ?: [];
$m = $u['message'] ?? null;
if (!$m) exit('{"ok":true}');

$chat = $m['chat'];
$isGroup = in_array($chat['type'], ['group', 'supergroup'], true);
$from = $m['from'] ?? [];
$thread = $m['message_thread_id'] ?? null;

function reply(string $text, array $rows = []): void {
  global $chat, $thread, $m;
  $p = ['chat_id' => $chat['id'], 'text' => $text, 'parse_mode' => 'HTML', 'link_preview_options' => ['is_disabled' => true]];
  if ($thread && ($m['is_topic_message'] ?? false)) $p['message_thread_id'] = $thread;
  if ($rows) $p['reply_markup'] = ['inline_keyboard' => $rows];
  api('sendMessage', $p);
}

// --- new members: welcome + delete the service message ---
if ($isGroup && !empty($m['new_chat_members'])) {
  $names = [];
  foreach ($m['new_chat_members'] as $nm) {
    if (!empty($nm['is_bot'])) continue;
    $state['joins'][(string)$nm['id']] = time();
    $names[] = '<a href="tg://user?id=' . $nm['id'] . '">' . e($nm['first_name'] ?? 'there') . '</a>';
  }
  api('deleteMessage', ['chat_id' => $chat['id'], 'message_id' => $m['message_id']]);
  if ($names) {
    if ($state['welcome']) api('deleteMessage', ['chat_id' => $chat['id'], 'message_id' => $state['welcome']]);
    $text = '👋 Welcome ' . implode(', ', $names) . " to PrepReady!\n\n"
      . "Here we get our homes and families ready for emergencies, calmly and without panic.\n"
      . "🚨 Turn on notifications in <b>Alerts</b> so you don't miss anything important.\n"
      . "🎁 Member-only discount codes are in <b>Deals &amp; codes</b>.\n\n"
      . "Rules: be respectful, no spam or ads, no misinformation, never post personal data.";
    $r = api('sendMessage', ['chat_id' => $chat['id'], 'text' => $text, 'parse_mode' => 'HTML',
      'reply_markup' => ['inline_keyboard' => [
        [btn('🚨 Alerts', topic('alerts')), btn('🎁 Deals', topic('deals'))],
        [btn('💡 Tips & guides', topic('tips')), btn('🆘 Ask the team', topic('ask'))],
        [btn('🎒 72-hour go-bag checklist', utm('/en/checklists/72-hour-bag/', 'welcome'))],
      ]]]);
    $state['welcome'] = $r['result']['message_id'] ?? null;
  }
  $state['joins'] = array_filter($state['joins'], fn($t) => $t > time() - 7 * 86400);
  save();
  exit('{"ok":true}');
}
if ($isGroup && !empty($m['left_chat_member'])) {
  api('deleteMessage', ['chat_id' => $chat['id'], 'message_id' => $m['message_id']]);
  exit('{"ok":true}');
}

// --- anti-spam: links from new members (< 24 h) ---
if ($isGroup && empty($from['is_bot'])) {
  if ($state['admins_at'] < time() - 3600) {
    $a = api('getChatAdministrators', ['chat_id' => $chat['id']]);
    $state['admins'] = array_map(fn($x) => $x['user']['id'], $a['result'] ?? []);
    $state['admins_at'] = time(); save();
  }
  $joined = $state['joins'][(string)($from['id'] ?? 0)] ?? null;
  $hasLink = false;
  foreach (array_merge($m['entities'] ?? [], $m['caption_entities'] ?? []) as $en) {
    if (in_array($en['type'], ['url', 'text_link', 'mention'], true)) $hasLink = true;
  }
  if (!in_array($from['id'] ?? 0, $state['admins'], true) && $joined && $joined > time() - 86400 && ($hasLink || !empty($m['forward_origin']))) {
    api('deleteMessage', ['chat_id' => $chat['id'], 'message_id' => $m['message_id']]);
    exit('{"ok":true}');
  }
}

// --- commands ---
$text = trim((string)($m['text'] ?? ''));
if ($text === '' || $text[0] !== '/') exit('{"ok":true}');
$cmd = strtolower(explode('@', explode(' ', $text)[0])[0]);

switch ($cmd) {
  case '/start':
  case '/menu':
    reply("<b>PrepReady</b> — disaster alerts, a daily Readiness Index and practical guides to get your home ready for emergencies.\n\nPick an option or use a command: /alerts /index /gobag /guides /deals", [
      [btn('👥 Join the PrepReady group', 'https://t.me/' . GROUP)],
      [btn('🎒 72-hour go-bag', utm('/en/checklists/72-hour-bag/')), btn('📚 Guides', utm('/en/guides/'))],
      [btn('📊 Readiness Index', utm('/en/readiness-index/')), btn('✉️ Newsletter', utm('/en/'))],
    ]);
    break;

  case '/alerts':
  case '/alerty':
    $since = gmdate('Y-m-d', time() - 10 * 86400);
    $g = getJson("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=Orange;Red&fromDate={$since}");
    $ev = [];
    foreach (($g['features'] ?? []) as $f) {
      $p = $f['properties'] ?? [];
      if (($p['eventtype'] ?? '') === 'DR' || ($p['iscurrent'] ?? '') !== 'true') continue;
      $ev[] = $p;
    }
    usort($ev, fn($a, $b) => strcmp($b['fromdate'] ?? '', $a['fromdate'] ?? ''));
    if (!$ev) { reply("✅ No current orange or red disaster alerts from GDACS.\n\nAll major alerts are also posted in the 🚨 Alerts topic.", [[btn('🚨 Alerts in the group', topic('alerts'))]]); break; }
    $lines = [];
    foreach (array_slice($ev, 0, 6) as $p) {
      $dot = ($p['alertlevel'] ?? '') === 'Red' ? '🔴' : '🟠';
      $lines[] = $dot . ' <a href="' . e($p['url']['report'] ?? 'https://www.gdacs.org/') . '">' . e((string)$p['name']) . '</a>' . (!empty($p['country']) ? ' — ' . e(rtrim((string)$p['country'], ', ')) : '');
    }
    reply('⚠️ <b>Current major disaster alerts (GDACS): ' . count($ev) . "</b>\n" . implode("\n", $lines), [[btn('GDACS map', 'https://www.gdacs.org/'), btn('🚨 Alerts in the group', topic('alerts'))]]);
    break;

  case '/index':
    $r = @json_decode((string)@file_get_contents(__DIR__ . '/readiness.json'), true)['en'] ?? null;
    if (!$r) { reply('The index is temporarily unavailable. Check it on the website.', [[btn('Readiness Index', utm('/en/readiness-index/'))]]); break; }
    $lvl = [[20, '🟢 Calm'], [40, '🟢 Watchful'], [60, '🟡 Elevated'], [80, '🟠 High'], [100, '🔴 Critical']];
    $name = '';
    foreach ($lvl as [$max, $n]) { if ($r['score'] <= $max) { $name = $n; break; } }
    $comp = implode("\n", array_map(fn($c) => '• ' . e($c['name']) . ': ' . $c['value'], $r['components']));
    reply("<b>Global Readiness Index: {$r['score']}/100</b>\n{$name}\n\n{$comp}", [[btn('Details and what to do', utm('/en/readiness-index/'))]]);
    break;

  case '/gobag':
    reply("🎒 <b>72-hour go-bag</b>\nInteractive checklist: tick off what you already have, it saves in your browser.", [[btn('Open the checklist', utm('/en/checklists/72-hour-bag/'))], [btn('Guide: what to pack', utm('/en/guides/go-bag-checklist/'))]]);
    break;

  case '/guides':
    reply('📚 <b>PrepReady guides</b>', [
      [btn('Blackout', utm('/en/guides/blackout-preparedness/')), btn('Water & food', utm('/en/guides/emergency-water-and-food-supply/'))],
      [btn('Family plan', utm('/en/guides/family-emergency-plan/')), btn('First aid kit', utm('/en/guides/first-aid-kit-checklist/'))],
      [btn('Renters', utm('/en/guides/emergency-preparedness-for-renters/')), btn('All guides', utm('/en/guides/'))],
    ]);
    break;

  case '/deals':
    reply("🎁 Current member discount codes are pinned in the <b>Deals &amp; codes</b> topic of the group.", [[btn('🎁 Deals & codes', topic('deals'))], [btn('👥 Join the group', 'https://t.me/' . GROUP)]]);
    break;

  case '/rules':
    reply("<b>PrepReady group rules</b>\n1. Be respectful.\n2. No spam, ads or affiliate links from members.\n3. No misinformation — add a source when posting about threats.\n4. Never post personal data: addresses, phone numbers, photos of documents.\n5. If a life is at risk, call your local emergency number — don't post in the group.");
    break;

  case '/newsletter':
    reply('✉️ PrepReady newsletter: new guides, checklists and the task of the week. Sign up at the bottom of the page.', [[btn('Subscribe', utm('/en/', 'newsletter') . '#nl-email-en')]]);
    break;
}
echo '{"ok":true}';
