import { getCollection, type CollectionEntry } from 'astro:content';
import { guideBase, type Lang } from '../i18n/ui';

export type Article = CollectionEntry<'articles'>;

/** Slug = nazwa pliku bez rozszerzenia (np. plecak-ewakuacyjny). */
export const slugOf = (a: Article) => a.id.split('/').pop()!;
export const hrefOf = (a: Article) => `${guideBase[a.data.lang]}${slugOf(a)}/`;

export async function articles(lang: Lang) {
  const all = await getCollection('articles', (a) => a.data.lang === lang && (import.meta.env.DEV || !a.data.draft));
  return all.sort((a, b) => +b.data.pubDate - +a.data.pubDate);
}

export async function translationOf(a: Article) {
  const other: Lang = a.data.lang === 'pl' ? 'en' : 'pl';
  const all = await getCollection('articles', (x) => x.data.lang === other && x.data.translationKey === a.data.translationKey && !x.data.draft);
  return all[0];
}
