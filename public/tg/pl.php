<?php
/**
 * PrepReady PL — webhook bota Telegram (@PrepReady_PL_bot).
 * Token NIE jest w kodzie: GitHub Actions zapisuje go przy publikacji do tg/config.php z sekretu TG_BOT_PL_TOKEN.
 * Funkcje: powitanie nowych osób, komendy (/start /alerty /indeks /plecak /poradniki /syreny /kody /zasady /newsletter),
 * prosta ochrona przed spamem (linki od osób, które dołączyły < 24 h temu, są usuwane).
 */
declare(strict_types=1);
header('Content-Type: application/json');

$cfgFile = __DIR__ . '/config.php';
$cfg = is_file($cfgFile) ? require $cfgFile : [];
$TOKEN = (string)($cfg['pl'] ?? '');
if ($TOKEN === '') { http_response_code(500); exit('{"ok":false}'); }
$SECRET = substr(hash('sha256', 'prepready-pl:' . $TOKEN), 0, 48);
if (($_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '') !== $SECRET) { http_response_code(403); exit('{"ok":false}'); }

const GROUP = 'prepreadyPL';
const SITE = 'https://prepready.pro';
const T = ['alerty' => 3, 'porady' => 4, 'kody' => 5, 'sprzet' => 6, 'dyskusja' => 7, 'samopomoc' => 8, 'pytania' => 9];

// --- stan (czasy dołączenia, ostatnie powitanie, admini) ---
$DATA = is_writable(dirname(__DIR__, 2)) ? dirname(__DIR__, 2) . '/tg_data' : __DIR__ . '/data';
if (!is_dir($DATA)) @mkdir($DATA, 0750, true);
$STATE_FILE = $DATA . '/pl_state.json';
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

// --- nowi członkowie: powitanie + usunięcie komunikatu systemowego ---
if ($isGroup && !empty($m['new_chat_members'])) {
  $names = [];
  foreach ($m['new_chat_members'] as $nm) {
    if (!empty($nm['is_bot'])) continue;
    $state['joins'][(string)$nm['id']] = time();
    $names[] = '<a href="tg://user?id=' . $nm['id'] . '">' . e($nm['first_name'] ?? 'Cześć') . '</a>';
  }
  api('deleteMessage', ['chat_id' => $chat['id'], 'message_id' => $m['message_id']]);
  if ($names) {
    if ($state['welcome']) api('deleteMessage', ['chat_id' => $chat['id'], 'message_id' => $state['welcome']]);
    $text = '👋 Witaj ' . implode(', ', $names) . " w PrepReady!\n\n"
      . "Tu przygotowujemy dom i rodzinę na kryzys spokojnie i bez paniki.\n"
      . "🚨 Włącz powiadomienia w temacie <b>Alerty</b>, żeby nic Cię nie ominęło.\n"
      . "🎁 Kody rabatowe dla członków są w <b>Kody i promocje</b>.\n\n"
      . "Zasady: szacunek, bez spamu i reklam, bez dezinformacji, nie publikuj danych osobowych.";
    $r = api('sendMessage', ['chat_id' => $chat['id'], 'text' => $text, 'parse_mode' => 'HTML',
      'reply_markup' => ['inline_keyboard' => [
        [btn('🚨 Alerty', topic('alerty')), btn('🎁 Kody', topic('kody'))],
        [btn('💡 Porady', topic('porady')), btn('🆘 Pytania', topic('pytania'))],
        [btn('🎒 Plecak 72 h — checklista', utm('/pl/checklisty/plecak-72h/', 'welcome'))],
      ]]]);
    $state['welcome'] = $r['result']['message_id'] ?? null;
  }
  // porządki: zapomnij dołączenia starsze niż 7 dni
  $state['joins'] = array_filter($state['joins'], fn($t) => $t > time() - 7 * 86400);
  save();
  exit('{"ok":true}');
}
if ($isGroup && !empty($m['left_chat_member'])) {
  api('deleteMessage', ['chat_id' => $chat['id'], 'message_id' => $m['message_id']]);
  exit('{"ok":true}');
}

// --- antyspam: linki od nowych osób (< 24 h) ---
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

// --- komendy ---
$text = trim((string)($m['text'] ?? ''));
if ($text === '' || $text[0] !== '/') exit('{"ok":true}');
$cmd = strtolower(explode('@', explode(' ', $text)[0])[0]);

switch ($cmd) {
  case '/start':
  case '/menu':
    reply("<b>PrepReady PL</b> — alerty, indeks gotowości i poradniki, jak przygotować dom na kryzys.\n\nWybierz, co Cię interesuje, albo użyj komend: /alerty /indeks /plecak /syreny /poradniki /kody", [
      [btn('👥 Dołącz do grupy PrepReady', 'https://t.me/' . GROUP)],
      [btn('🎒 Plecak 72 h', utm('/pl/checklisty/plecak-72h/')), btn('🔊 Syreny', utm('/pl/poradniki/syreny-alarmowe/'))],
      [btn('📚 Poradniki', utm('/pl/poradniki/')), btn('✉️ Newsletter', utm('/pl/'))],
    ]);
    break;

  case '/alerty':
    $w = getJson('https://danepubliczne.imgw.pl/api/data/warningsmeteo');
    usort($w, fn($a, $b) => (int)$b['stopien'] <=> (int)$a['stopien']);
    if (!$w) { reply("✅ IMGW nie ma teraz aktywnych ostrzeżeń meteorologicznych.\n\nWszystkie komunikaty trafiają też do tematu 🚨 Alerty.", [[btn('🚨 Alerty w grupie', topic('alerty'))]]); break; }
    $lines = [];
    foreach (array_slice($w, 0, 6) as $x) {
      $lines[] = '• <b>' . e($x['nazwa_zdarzenia']) . '</b> — ' . (int)$x['stopien'] . '° stopień, do ' . e(substr((string)$x['obowiazuje_do'], 0, 16));
    }
    reply('⚠️ <b>Aktywne ostrzeżenia IMGW: ' . count($w) . "</b>\n" . implode("\n", $lines) . "\n\nSzczegóły i mapa: meteo.imgw.pl", [[btn('Mapa ostrzeżeń IMGW', 'https://meteo.imgw.pl/'), btn('🚨 Alerty w grupie', topic('alerty'))]]);
    break;

  case '/indeks':
    $r = @json_decode((string)@file_get_contents(__DIR__ . '/readiness.json'), true)['pl'] ?? null;
    if (!$r) { reply('Indeks jest chwilowo niedostępny. Sprawdź na stronie.', [[btn('Indeks gotowości', utm('/pl/indeks/'))]]); break; }
    $lvl = [[20, '🟢 Spokój'], [40, '🟢 Czujność'], [60, '🟡 Podwyższone'], [80, '🟠 Wysokie'], [100, '🔴 Krytyczne']];
    $name = '';
    foreach ($lvl as [$max, $n]) { if ($r['score'] <= $max) { $name = $n; break; } }
    $comp = implode("\n", array_map(fn($c) => '• ' . e($c['name']) . ': ' . $c['value'], $r['components']));
    reply("<b>Indeks gotowości: {$r['score']}/100</b>\n{$name}\n\n{$comp}", [[btn('Szczegóły i co robić', utm('/pl/indeks/'))]]);
    break;

  case '/plecak':
    reply("🎒 <b>Plecak ewakuacyjny na 72 godziny</b>\nInteraktywna checklista: odhaczasz, co już masz, a lista zapisuje się w przeglądarce.", [[btn('Otwórz checklistę', utm('/pl/checklisty/plecak-72h/'))], [btn('Poradnik: co spakować', utm('/pl/poradniki/plecak-ewakuacyjny/'))]]);
    break;

  case '/syreny':
    reply("🔊 <b>Sygnały alarmowe</b>\n• Faluje przez 3 min — alarm. Włącz radio, działaj według komunikatów.\n• Ciągły przez 3 min — odwołanie alarmu.\n• Ciągły przez 1 min — ćwiczenia.\n• Trzy wycia z przerwami — wezwanie straży.", [[btn('Posłuchaj nagrań RCB', utm('/pl/poradniki/syreny-alarmowe/'))]]);
    break;

  case '/poradniki':
    reply('📚 <b>Poradniki PrepReady</b>', [
      [btn('Blackout', utm('/pl/poradniki/blackout-jak-sie-przygotowac/')), btn('Zapas wody i jedzenia', utm('/pl/poradniki/zapas-wody-i-jedzenia/'))],
      [btn('Schron w bloku', utm('/pl/poradniki/schron-w-bloku/')), btn('Plan ewakuacji', utm('/pl/poradniki/plan-ewakuacji-rodziny/'))],
      [btn('Apteczka domowa', utm('/pl/poradniki/apteczka-domowa/')), btn('Wszystkie', utm('/pl/poradniki/'))],
    ]);
    break;

  case '/kody':
    reply("🎁 Aktualne kody rabatowe dla członków są przypięte w temacie <b>Kody i promocje</b> w grupie.", [[btn('🎁 Kody i promocje', topic('kody'))], [btn('👥 Dołącz do grupy', 'https://t.me/' . GROUP)]]);
    break;

  case '/zasady':
    reply("<b>Zasady grupy PrepReady</b>\n1. Szacunek dla innych.\n2. Bez spamu, reklam i linków afiliacyjnych od uczestników.\n3. Bez dezinformacji — przy zagrożeniach podawaj źródło.\n4. Nie publikuj danych osobowych: adresów, telefonów, zdjęć dokumentów.\n5. W zagrożeniu życia dzwoń na 112, nie pisz na grupie.");
    break;

  case '/newsletter':
    reply('✉️ Newsletter PrepReady: nowe poradniki, checklisty i zadanie tygodnia. Zapis na dole strony.', [[btn('Zapisz się', utm('/pl/', 'newsletter') . '#nl-email-pl')]]);
    break;
}
echo '{"ok":true}';
