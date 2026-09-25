import { community } from '../data/community';

/** Teksty stron „O nas” i „Jak zarabiamy”. Edytuj swobodnie — to zwykły HTML. */
export const about = {
  pl: {
    title: 'O PrepReady',
    desc: 'Kim jesteśmy, jak pracujemy i skąd bierzemy dane do indeksu gotowości.',
    html: `<p>PrepReady pomaga rodzinom przygotować się na kryzys spokojnie i bez paniki. Łączymy dane z oficjalnych źródeł w jeden czytelny indeks, wybieramy najważniejsze wiadomości i piszemy poradniki, które działają w praktyce.</p>
<h2>Jak pracujemy</h2>
<ul><li>Każdy poradnik opiera się na źródłach urzędowych (MSWiA, RCB, PSP, ECDC) i ma datę ostatniego przeglądu.</li><li>Teksty sprawdzają konsultanci z doświadczeniem w ratownictwie i ochronie ludności.</li><li>Sprzęt testujemy sami i publikujemy metodologię pomiarów.</li></ul>
<h2>Redakcja</h2><p>Sekcja w przygotowaniu — tutaj pojawią się biogramy autorów i konsultantów.</p>`,
  },
  en: {
    title: 'About PrepReady',
    desc: 'Who we are, how we work and where the readiness index data comes from.',
    html: `<p>PrepReady helps households prepare for emergencies calmly, without panic. We combine official data into one readable index, pick the news that matters and write guides that work in practice.</p>
<h2>How we work</h2>
<ul><li>Every guide is based on official sources and shows its last review date.</li><li>Articles are checked by advisors with rescue and civil-protection experience.</li><li>We test gear ourselves and publish our measurement method.</li></ul>
<h2>Editors</h2><p>Coming soon — author and advisor bios will appear here.</p>`,
  },
};

export const earn = {
  pl: {
    title: 'Jak działamy i zarabiamy',
    desc: 'Polecamy tylko sprawdzony sprzęt. Współpracujemy bezpośrednio z producentami, dzięki czemu mamy dla Was kody rabatowe i lepsze ceny.',
    html: `<p>PrepReady jest bezpłatny dla czytelników. Utrzymujemy się ze współpracy z producentami i sklepami, które sprzedają sprzęt na sytuacje kryzysowe.</p>
<h2>Rankingi tylko ze sprawdzonych rzeczy</h2>
<ul><li>Do rankingów i checklist trafia wyłącznie sprzęt, który sprawdziliśmy albo przetestowaliśmy.</li>
<li>Przy każdym teście opisujemy, jak mierzyliśmy i co wyszło — także minusy.</li>
<li>Zawsze podajemy też tanie i darmowe rozwiązania, jeśli istnieją.</li></ul>
<h2>Współpraca z producentami = lepsze ceny dla Was</h2>
<p>Nawiązujemy współpracę bezpośrednio z producentami. Dzięki temu często dostajemy dla czytelników <strong>kody rabatowe, bonusy i tańsze zestawy</strong>, których nie ma w zwykłej sprzedaży. Aktualne kody są na stronie sprzętu, w newsletterze i na Telegramie.</p>
<h2>Za co płacą nam partnerzy</h2>
<ul><li><strong>Sprzedaż z naszego kodu lub linku.</strong> Gdy kupisz z naszym kodem, partner może nam zapłacić prowizję. Nie płacisz więcej, a z kodem zwykle mniej.</li>
<li><strong>Testy i prezentacje sprzętu.</strong> Producent może przekazać sprzęt do testu lub zapłacić za prezentację. Zawsze to oznaczamy, a producent nie zatwierdza tekstu przed publikacją.</li>
<li><strong>Produkty cyfrowe.</strong> Rozszerzone checklisty i poradniki PDF.</li></ul>
<p>Jesteś producentem lub sklepem? Zobacz <a href="/pl/wspolpraca/">Dla producentów</a>.</p>`,
  },
  en: {
    title: 'How we work and make money',
    desc: 'We only recommend gear we have checked. We work directly with manufacturers, which gets our readers discount codes and better prices.',
    html: `<p>PrepReady is free for readers. We are funded by partnerships with manufacturers and retailers of emergency gear.</p>
<h2>Rankings only include checked gear</h2>
<ul><li>Only gear we have checked or tested makes it into our rankings and checklists.</li>
<li>Every test explains how we measured and what we found — including the downsides.</li>
<li>We always list cheap and free options when they exist.</li></ul>
<h2>Manufacturer partnerships = better prices for you</h2>
<p>We work directly with gear makers. That often gets our readers <strong>discount codes, bonuses and cheaper bundles</strong> you won't find elsewhere. Current codes are on the gear page, in the newsletter and on Telegram.</p>
<h2>What partners pay us for</h2>
<ul><li><strong>Sales through our code or link.</strong> The partner may pay us a commission. You never pay more, and with a code usually less.</li>
<li><strong>Gear tests and features.</strong> A maker may provide gear for testing or pay for a feature. We always label it, and makers never approve our text before publication.</li>
<li><strong>Digital products.</strong> Extended checklists and PDF guides.</li></ul>
<p>Are you a manufacturer or retailer? See <a href="/en/partners/">For manufacturers</a>.</p>`,
  },
};

export const partners = {
  pl: {
    title: 'Dla producentów i sklepów',
    desc: 'Pokaż swój sprzęt osobom, które właśnie przygotowują dom na kryzys. Test, miejsce w rankingu i kod rabatowy dla naszej społeczności.',
    html: `<p>PrepReady czytają rodziny, które kompletują plecak ewakuacyjny, zapasy i sprzęt na blackout. Szukamy producentów i sklepów, z którymi możemy współpracować bezpośrednio.</p>
<h2>Co proponujemy</h2>
<ul><li><strong>Rzetelny test</strong> Twojego produktu z własnymi zdjęciami i pomiarami.</li>
<li><strong>Miejsce w rankingach i checklistach</strong> — jeśli produkt przejdzie test.</li>
<li><strong>Kod rabatowy dla naszej społeczności</strong> ogłaszany na stronie, w newsletterze i na Telegramie.</li>
<li><strong>Rozliczenie od sprzedaży</strong> (prowizja od kodu) albo stała opłata za prezentację — jak Ci wygodniej.</li></ul>
<h2>Od Ciebie</h2>
<ul><li>Egzemplarz do testu (albo wypożyczenie).</li>
<li>Kod rabatowy na wyłączność dla PrepReady.</li>
<li>Zgoda na niezależny test: publikujemy też minusy.</li></ul>
<h2>Kontakt</h2>
<p>Napisz na <strong>${community.email}</strong> — w temacie „Współpraca” i nazwa firmy. Odpowiadamy w ciągu 3 dni roboczych.</p>`,
  },
  en: {
    title: 'For manufacturers and retailers',
    desc: 'Put your gear in front of people preparing their homes for emergencies. A test, a place in our rankings and a discount code for our community.',
    html: `<p>PrepReady readers are households building go-bags, supplies and blackout kits. We want to work directly with manufacturers and retailers.</p>
<h2>What we offer</h2>
<ul><li><strong>An honest test</strong> of your product with our own photos and measurements.</li>
<li><strong>A place in our rankings and checklists</strong> — if the product passes.</li>
<li><strong>A discount code for our community</strong>, announced on the site, in the newsletter and on Telegram.</li>
<li><strong>Revenue share</strong> on code sales or a flat fee for a feature — your choice.</li></ul>
<h2>What we need</h2>
<ul><li>A test unit (or a loan).</li><li>An exclusive discount code for PrepReady.</li><li>Agreement that the test is independent: we publish downsides too.</li></ul>
<h2>Contact</h2>
<p>Email <strong>${community.email}</strong> with “Partnership” and your company name in the subject. We reply within 3 working days.</p>`,
  },
};
