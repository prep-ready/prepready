/**
 * Społeczność.
 * tg.pl / tg.en — link do grupy na Telegramie dla danej wersji językowej. Puste = przycisk się nie pokazuje.
 * Adres e-mail do formularza „Dla producentów” NIE jest tutaj: ustawiasz go w GitHubie jako sekret CONTACT_EMAIL.
 */
export const community = {
  tg: {
    pl: 'https://t.me/prepreadyPL',
    en: '', // uzupełnij, gdy powstanie angielska grupa
  } as Record<'pl' | 'en', string>,
};
