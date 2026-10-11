<?php
/**
 * Mapa schronów — cotygodniowa aktualizacja danych na serwerze.
 *
 * Serwer PSP (gdziesieukryc.pl) blokuje zapytania spoza Polski/UE, więc GitHub Actions (USA)
 * nie pobierze pliku. Robi to ten skrypt na Hostingerze: pobiera CSV „Punkty schronienia w Polsce”
 * (KG PSP, CC BY 4.0), tnie go na kratki i zapisuje do /schrony/live/. Strona najpierw czyta
 * /schrony/live/, a gdy go nie ma — dane startowe z workflow (/schrony/dane/).
 *
 * Wywołuje go codziennie workflow (curl). Sam pilnuje, żeby pobierać najwyżej raz na 6 dni
 * i próbować najwyżej raz na godzinę — publiczne wywołania nic nie psują.
 * Format musi zgadzać się ze scripts/shelters.mjs.
 */
header('Content-Type: text/plain; charset=utf-8');
header('X-Robots-Tag: noindex');
@set_time_limit(120);
@ini_set('memory_limit', '256M');

const SRC = 'https://gdziesieukryc.pl/PS_XML/punkty_schronienia.csv';
const MAX_AGE = 6 * 86400;
const RETRY = 3600;
$base = __DIR__;
$live = "$base/live";
$state = "$base/.stan.json";

$st = is_file($state) ? (json_decode((string) file_get_contents($state), true) ?: []) : [];
$now = time();
$force = isset($_GET['teraz']) && ($now - ($st['tried'] ?? 0)) > 300;
if (!$force && is_file("$live/index.json") && $now - filemtime("$live/index.json") < MAX_AGE) { echo "OK: dane aktualne.\n"; exit; }
if (!$force && $now - ($st['tried'] ?? 0) < RETRY) { echo "OK: ostatnia próba niedawno.\n"; exit; }

$lock = fopen("$base/.lock", 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) { echo "OK: aktualizacja już trwa.\n"; exit; }
$st['tried'] = $now;
file_put_contents($state, json_encode($st));

function fail($msg) { global $st, $state; $st['error'] = $msg; file_put_contents($state, json_encode($st)); http_response_code(502); echo "BŁĄD: $msg\n"; exit; }

$tmp = tempnam(sys_get_temp_dir(), 'ps');
$fh = fopen($tmp, 'w');
$ch = curl_init(SRC);
curl_setopt_array($ch, [CURLOPT_FILE => $fh, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 90, CURLOPT_USERAGENT => 'PrepReady/1.0 (+https://prepready.pro/pl/mapa-schronow/)']);
curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);
fclose($fh);
if ($code !== 200) { @unlink($tmp); fail("pobieranie CSV: HTTP $code $err"); }

$GRID = ['lat0' => 49, 'lng0' => 14, 'dLat' => 0.25, 'dLng' => 0.4];
$AVAIL = ['Całodobowa' => 0, 'Określone godziny' => 1, 'Na żądanie' => 2];
$in = fopen($tmp, 'r');
$head = fgetcsv($in, 0, ',', '"', '');
if (!$head) fail('pusty plik');
$head[0] = preg_replace('/^\xEF\xBB\xBF/', '', $head[0]);
$head = array_map('trim', $head);
$C = [];
foreach (['id' => 'Identyfikator publiczny', 'gmina' => 'Gmina', 'lat' => 'Szerokosc geograficzna', 'lng' => 'Dlugosc geograficzna', 'addr' => 'Adres', 'avail' => 'Dostepnosc'] as $k => $name) {
  $i = array_search($name, $head, true);
  if ($i === false) fail("brak kolumny $name — format pliku się zmienił");
  $C[$k] = $i;
}
$cells = []; $total = 0;
while (($r = fgetcsv($in, 0, ',', '"', '')) !== false) {
  if (count($r) < count($head)) continue;
  $lat = (float) $r[$C['lat']]; $lng = (float) $r[$C['lng']];
  if (!($lat > 48.9 && $lat < 55 && $lng > 14 && $lng < 24.3)) continue;
  $key = floor(($lat - $GRID['lat0']) / $GRID['dLat']) . '_' . floor(($lng - $GRID['lng0']) / $GRID['dLng']);
  $cells[$key][] = [(int) round($lat * 1e5), (int) round($lng * 1e5), $AVAIL[trim($r[$C['avail']])] ?? 2, trim($r[$C['addr']]), trim($r[$C['gmina']])];
  $total++;
}
fclose($in);
@unlink($tmp);
if ($total < 50000) fail("za mało punktów ($total) — zostawiam poprzednie dane");

$new = "$base/live.new";
$old = "$base/live.old";
foreach ([$new, $old] as $d) if (is_dir($d)) { array_map('unlink', glob("$d/c/*.json") ?: []); @rmdir("$d/c"); @unlink("$d/index.json"); @rmdir($d); }
mkdir("$new/c", 0755, true);
ksort($cells);
$index = ['source' => 'Komenda Główna PSP · dane.gov.pl (CC BY 4.0)', 'sourceDate' => date('Y-m-d'), 'builtAt' => gmdate('c'), 'total' => $total, 'grid' => $GRID, 'cells' => []];
foreach ($cells as $key => $p) {
  $index['cells'][$key] = count($p);
  file_put_contents("$new/c/$key.json", json_encode(['p' => $p], JSON_UNESCAPED_UNICODE));
}
file_put_contents("$new/index.json", json_encode($index, JSON_UNESCAPED_UNICODE));
if (is_dir($live)) rename($live, $old);
rename($new, $live);
if (is_dir($old)) { array_map('unlink', glob("$old/c/*.json") ?: []); @rmdir("$old/c"); @unlink("$old/index.json"); @rmdir($old); }

$st['ok'] = $now; unset($st['error']);
file_put_contents($state, json_encode($st));
echo "OK: zapisano $total punktów w " . count($cells) . " kratkach.\n";
